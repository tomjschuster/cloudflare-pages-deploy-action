import { error, getBooleanInput, getInput, info, setFailed, setOutput } from '@actions/core'
import { context } from '@actions/github'
import createPagesSdk from './cloudflare'
import { dashboardDeploymentUrl } from './dashboard'
import { deploy } from './deploy'
import { DeploymentError } from './errors'
import { createGithubCloudfrontDeploymentCallbacks } from './github'
import { createLogger } from './logger'
import { Deployment, DeploymentCallbacks, Project, Stage } from './types'
import { isStageSuccess } from './utils'

export async function run(): Promise<void> {
  let deployment: Deployment | undefined

  const inputs = getInputs()
  const { accountId, apiKey, email, projectName, githubToken, production, preview, branch } = inputs

  const sdk = createPagesSdk({ accountId, apiKey, email, projectName })
  const githubCallbacks = getDeploymentCallbacks(accountId, githubToken)

  try {
    console.log('projectName', JSON.stringify(projectName))

    const project = await sdk.getProject()
    const derivedBranch = deriveBranch(project, production, preview, branch)

    deployment = await deploy(sdk, derivedBranch, createLogger(), githubCallbacks)
    setOutputFromDeployment(deployment)
  } catch (error) {
    logExtraErrorMessages(accountId, projectName, error, deployment)
    return await fail(error, githubCallbacks?.onFailure)
  }

  if (!isStageSuccess(deployment.latest_stage)) {
    return fail(failedDeployMessage(deployment.latest_stage), githubCallbacks?.onFailure)
  }

  await githubCallbacks?.onSuccess()
  logSuccess(deployment)
}

type Inputs = {
  accountId: string
  apiKey: string
  email: string
  projectName: string
  production: boolean
  preview: boolean
  branch?: string
  githubToken?: string
}

function getInputs(): Inputs {
  return {
    accountId: getInput('account-id', { required: true }),
    apiKey: getInput('api-key', { required: true }),
    email: getInput('email', { required: true }),
    projectName: getInput('project-name', { required: true }),
    production: getBooleanInput('production'),
    preview: getBooleanInput('preview'),
    branch: getInput('branch'),
    githubToken: getInput('github-token'),
  }
}

function deriveBranch(
  project: Project,
  production: boolean | undefined,
  preview: boolean | undefined,
  branch: string | undefined,
): string | undefined {
  const inputCount = [production, preview, branch].filter((x) => x).length
  const githubBranch = currentBranch()

  if (inputCount > 1) {
    throw new Error(
      'Inputs `production,` `preview,` and `branch` cannot be used together. Choose one.',
    )
  }

  if ((inputCount === 0 || preview) && !isProjectRepo(project)) {
    const repoMessage = differentRepoMessage(project)

    throw new Error(
      `Must specify either \`production\` or \`branch\` inputs when current repo is not the same as that of the pages project. ${repoMessage}`,
    )
  }

  if ((inputCount === 0 || preview) && !githubBranch) {
    throw new Error(
      `Must specify either \`production\` or \`branch\` inputs for workflows not triggered by a pull request.`,
    )
  }

  if (production) {
    return undefined
  }
  if (preview) {
    return githubBranch
  }

  if (branch) {
    validateBranchName(branch)
    return branch
  }
}

const invalidBranchNameRegex = /(\.\.|[\000-\037\177 ~^:?*\\[]|^\/|\/$|\/\/|\.$|@{|^@$)+/
function validateBranchName(branch: string): void {
  if (invalidBranchNameRegex.test(branch)) {
    throw new Error(`Invalid branch name: ${branch}`)
  }

  if (branch.length > 255) {
    throw new Error(`Branch name must be 255 characters or less (received ${branch})`)
  }
}

function getDeploymentCallbacks(
  accountId: string,
  githubToken: string | undefined,
): DeploymentCallbacks | undefined {
  if (!githubToken) {
    info('No GitHub token provided, skipping GitHub deployments.')
    return
  }

  info('GitHub token provided. GitHub deployment will be created.')
  return createGithubCloudfrontDeploymentCallbacks(accountId, githubToken)
}

function setOutputFromDeployment(deployment: Deployment): void {
  setOutput('deployment-id', deployment.id)
  setOutput('url', deployment.url)
}

function logSuccess({ project_name, url, latest_stage }: Deployment): void {
  info(`Successfully deployed ${project_name} at ${latest_stage.ended_on}.`)
  info(`URL: ${url}`)
}

// `setFailed` doesn't print stack trace. This allow to exit gracefully with debug info.
async function fail(e_: unknown, beforeExit?: () => Promise<void>): Promise<void> {
  const e: Error = e_ instanceof Error ? e_ : new Error(`${e_}`)
  setFailed(e)
  error(`${e.message}\n${e.stack}`)
  if (beforeExit) await beforeExit()
}

function logExtraErrorMessages(
  accountId: string,
  projectName: string,
  error: unknown,
  deployment: Deployment | undefined,
): void {
  deployment = error instanceof DeploymentError ? error.deployment : deployment

  info(unexpectedErrorMessage(accountId, projectName, deployment))

  info(reportIssueMessage())
}

function failedDeployMessage(stage: Stage): string {
  return `Deployment failed on stage: ${stage.name} with a status of '${stage.status}'. See log output above for more information.`
}

function unexpectedErrorMessage(accountId: string, projectName: string, deployment?: Deployment) {
  const url = dashboardDeploymentUrl(accountId, projectName, deployment?.id)
  return `\nThere was an unexpected error. It's possible that your Cloudflare Pages deploy is still in progress or was successful. Go to ${url} for more details.`
}

function reportIssueMessage(): string {
  return `To report a bug, open an issue at https://github.com/tomjschuster/cloudflare-pages-deploy-action/issues`
}

function currentBranch(): string | undefined {
  return context.payload.pull_request?.head.ref
}

function currentRepo(): string | undefined {
  return `${context.repo.owner}/${context.repo.repo}`
}

function projectRepo(project: Project): string {
  return `${project.source.config.owner}/${project.source.config.repo_name}`
}

function isProjectRepo(project: Project): boolean {
  return projectRepo(project) === currentRepo()
}

function differentRepoMessage(project: Project): string {
  return `The current GitHub repo is ${currentRepo()} but the repo associated with the CloudFlare Pages project is ${projectRepo(
    project,
  )}`
}

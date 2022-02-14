import { getBooleanInput, getInput, setFailed, setOutput } from '@actions/core'
import { context } from '@actions/github'
import createPagesSdk, { PagesSdk } from './cloudflare'
import { dashboardBuildDeploymentsSettingsUrl, dashboardDeploymentUrl } from './dashboard'
import { deploy } from './deploy'
import { DeployHookDeleteError, DeploymentError } from './errors'
import { createGithubCloudfrontDeploymentHandlers } from './github'
import { Deployment, DeploymentHandlers, Project, Stage } from './types'
import { isStageSuccess } from './utils'

export async function run(): Promise<void> {
  let deployment: Deployment | undefined

  const { accountId, apiKey, email, projectName, production, preview, branch, githubToken } =
    getInputs()

  const sdk = createPagesSdk({ accountId, apiKey, email, projectName })
  const githubHandlers = getDeploymentHandlers(accountId, githubToken)

  const branchError = await validateBranch(sdk, production, preview, branch)
  if (branchError) return await fail(branchError)

  const deployBranch = getBranch(production, preview, branch)

  try {
    deployment = await deploy(sdk, deployBranch, githubHandlers)
    setOutputFromDeployment(deployment)
  } catch (error) {
    logExtraErrorMessages(accountId, projectName, error, deployment)
    return await fail(error, githubHandlers?.onFailure)
  }

  if (!isStageSuccess(deployment.latest_stage)) {
    return fail(failedDeployMessage(deployment.latest_stage), githubHandlers?.onFailure)
  }

  await githubHandlers?.onSuccess()
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

async function validateBranch(
  sdk: PagesSdk,
  production: boolean,
  preview: boolean,
  branch?: string,
): Promise<string | undefined> {
  const inputCount = [production, branch].filter((x) => x).length

  if (inputCount > 1) {
    return 'Inputs "production," "preview," and "branch" cannot be used together. Choose one.'
  }

  if (inputCount === 0) {
    return 'Must provide exactly one of the following inputs: "production", "branch"'
  }

  if (branch) return validateBranchName(branch)

  if (production) return

  if (preview) {
    if (!currentBranch()) {
      return '`preview` argument was provided, but current branch could not be found.'
    }

    const project = await sdk.getProject()

    if (currentRepo() !== projectRepo(project)) {
      return '`preview` argument can only be used when the current repo is linked to the CloudFlare Pages project.'
    }

    if (currentBranch() === project.source.config.production_branch) {
      return '`preview` argument can not be used on the production branch.'
    }
  }
}

const invalidBranchNameRegex = /(\.\.|[\000-\037\177 ~^:?*\\[]|^\/|\/$|\/\/|\.$|@{|^@$)+/
function validateBranchName(branch: string): string | undefined {
  if (invalidBranchNameRegex.test(branch)) {
    return `Invalid branch name: ${branch}`
  }

  if (branch.length > 255) {
    return `Branch name must be 255 characters or less (received ${branch})`
  }
}

function getBranch(production: boolean, preview: boolean, branch?: string): string | undefined {
  if (production) return
  if (branch) return branch
  return currentBranch()
}

function getDeploymentHandlers(
  accountId: string,
  githubToken: string | undefined,
): DeploymentHandlers | undefined {
  if (!githubToken) {
    console.log('No GitHub token provided, skipping GitHub deployments.')
    return
  }

  console.log('GitHub token provided. GitHub deployment will be created.')
  return createGithubCloudfrontDeploymentHandlers(accountId, githubToken)
}

function setOutputFromDeployment(deployment: Deployment): void {
  setOutput('deployment-id', deployment.id)
  setOutput('url', deployment.url)
}

function logSuccess({ project_name, url, latest_stage }: Deployment): void {
  console.log(`Successfully deployed ${project_name} at ${latest_stage.ended_on}.`)
  console.log(`URL: ${url}`)
}

// `setFailed` doesn't print stack trace. This allow to exit gracefully with debug info.
async function fail(e: unknown, beforeExit?: () => Promise<void>): Promise<void> {
  const error: Error = e instanceof Error ? e : new Error(`${e}`)
  setFailed(error)
  console.error(`${error.message}\n${error.stack}`)
  if (beforeExit) await beforeExit()
}

function logExtraErrorMessages(
  accountId: string,
  projectName: string,
  error: unknown,
  deployment: Deployment | undefined,
): void {
  deployment = error instanceof DeploymentError ? error.deployment : deployment

  console.log(unexpectedErrorMessage(accountId, projectName, deployment))

  if (error instanceof DeployHookDeleteError) {
    console.log(hookDeleteErrorMessage(accountId, projectName, error.hookName))
  }

  console.log(reportIssueMessage())
}

function failedDeployMessage(stage: Stage): string {
  return `Deployment failed on stage: ${stage.name} with a status of '${stage.status}'. See log output above for more information.`
}

function unexpectedErrorMessage(accountId: string, projectName: string, deployment?: Deployment) {
  const url = dashboardDeploymentUrl(accountId, projectName, deployment?.id)
  return `\nThere was an unexpected error. It's possible that your Cloudflare Pages deploy is still in progress or was successful. Go to ${url} for more details.`
}

function hookDeleteErrorMessage(accountId: string, projectName: string, name: string): string {
  const url = dashboardBuildDeploymentsSettingsUrl(accountId, projectName)

  return `Failed to delete temporary deploy hook "${name}". Go to ${url} to manually delete the deploy hook`
}

function reportIssueMessage(): string {
  return `To report a bug, open an issue at https://github.com/tomjschuster/cloudflare-pages-deploy-action/issues`
}

function currentBranch(): string | undefined {
  return context.payload.pull_request?.head?.ref
}

function currentRepo(): string | undefined {
  return `${context.repo.owner}/${context.repo.repo}`
}

function projectRepo(project: Project): string {
  return `${project.source.config.owner}/${project.source.config.repo_name}`
}

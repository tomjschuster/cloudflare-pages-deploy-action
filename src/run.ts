import { getBooleanInput, getInput, setFailed, setOutput } from '@actions/core'
import createPagesSdk from './cloudflare'
import { dashboardBuildDeploymentsSettingsUrl, dashboardDeploymentUrl } from './dashboard'
import { deploy } from './deploy'
import { DeployHookDeleteError, DeploymentError } from './errors'
import { createGithubCloudfrontDeploymentHandlers } from './github'
import { Deployment, DeploymentHandlers, StageName } from './types'
import { isStageSuccess } from './utils'

export async function run(): Promise<void> {
  let deployment: Deployment | undefined

  const { accountId, apiKey, email, projectName, production, branch, githubToken } = getInputs()

  const branchError = validateBranch(production, branch)

  if (branchError) {
    setFailed(branchError)
    return
  }

  const sdk = createPagesSdk({ accountId, apiKey, email, projectName })
  const githubHandlers = getDeploymentHanlders(accountId, githubToken)

  try {
    deployment = await deploy(sdk, branch, githubHandlers)
    setOutputFromDeployment(deployment)
  } catch (error) {
    handleError(accountId, projectName, error, deployment)
    await githubHandlers?.onFailure()
    setFailed(error instanceof Error ? error.message : `${error}`)
    return
  }

  const failureMessage = checkDeploymentFailure(deployment)
  if (failureMessage) {
    await githubHandlers?.onFailure()
    setFailed(failureMessage)
    return
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
    branch: getInput('branch'),
    githubToken: getInput('github-token'),
  }
}

function validateBranch(production: boolean, branch?: string): string | undefined {
  const inputCount = [production, branch].filter((x) => x).length

  if (inputCount > 1) {
    return 'Inputs "production" and "branch" cannot be used together.'
  }

  if (inputCount === 0) {
    return 'Must provide exactly one of the following inputs: "production", "branch"'
  }

  if (branch) return validateBranchName(branch)
}

function setOutputFromDeployment(deployment: Deployment): void {
  setOutput('deployment-id', deployment.id)
  setOutput('url', deployment.url)
}

function checkDeploymentFailure({ latest_stage }: Deployment): string | undefined {
  if (latest_stage && !isStageSuccess(latest_stage)) {
    return failedDeployMessage(latest_stage.name)
  }
}

function handleError(
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
}

function failedDeployMessage(stageName: StageName): string {
  return `Deployment failed on stage: ${stageName}. See log output above for more information.`
}

function unexpectedErrorMessage(accountId: string, projectName: string, deployment?: Deployment) {
  const url = dashboardDeploymentUrl(accountId, projectName, deployment?.id)
  return `\nThere was an unexpected error. It's possible that your Cloudflare Pages deploy is still in progress or was successful. Go to ${url} for more details.`
}

function hookDeleteErrorMessage(accountId: string, projectName: string, name: string): string {
  const url = dashboardBuildDeploymentsSettingsUrl(accountId, projectName)

  return `Failed to delete temporary deploy hook "${name}".Go to ${url} to manually delete the deploy hook`
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

function logSuccess({ project_name, url, latest_stage }: Deployment): void {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  console.log(`Successfully deployed ${project_name} at ${latest_stage!.ended_on}.`)
  console.log(`URL: ${url}`)
}

function getDeploymentHanlders(
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

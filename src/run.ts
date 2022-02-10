import { getBooleanInput, getInput, setFailed, setOutput } from '@actions/core'
import { dashboardBuildDeploymentsSettingsUrl, dashboardDeploymentUrl } from './dashboard'
import { deploy } from './deploy'
import { DeployHookDeleteError, DeploymentError } from './errors'
import createSdk from './sdk'
import { Deployment, StageName } from './types'
import { isStageSuccess } from './utils'

export async function run(): Promise<void> {
  let deployment: Deployment | undefined

  const { accountId, apiKey, email, projectName, production, branch } = getInputs()

  try {
    const sdk = createSdk({ accountId, apiKey, email, projectName })

    deployment = await deploy(sdk, getBranch(production, branch))

    setOutputFromDeployment(deployment)
    checkDeployment(deployment)
    logSuccess(deployment)
  } catch (e) {
    deployment = e instanceof DeploymentError ? e.deployment : deployment

    console.log(runtimeErrorMessage(accountId, projectName, deployment))

    if (e instanceof DeployHookDeleteError) {
      console.log(hookDeleteErrorMessage(accountId, projectName, e.hookName))
    }

    setFailed(e instanceof Error ? e.message : `${e}`)

    throw e
  }
}

type Inputs = {
  accountId: string
  apiKey: string
  email: string
  projectName: string
  production: boolean
  branch?: string
}

function getInputs(): Inputs {
  return {
    accountId: getInput('account-id', { required: true }),
    apiKey: getInput('api-key', { required: true }),
    email: getInput('email', { required: true }),
    projectName: getInput('project-name', { required: true }),
    production: getBooleanInput('production'),
    branch: getInput('branch'),
  }
}

function getBranch(production: boolean, branch?: string): string | undefined {
  const inputCount = [production, branch].filter((x) => x).length

  if (inputCount > 1) {
    exitWithErrorMessage('Inputs "production" and "branch" cannot be used together.')
  }

  if (inputCount === 0) {
    exitWithErrorMessage('Must provide exactly one of the following inputs: "production", "branch"')
  }

  if (!branch) return undefined

  const branchError = validateBranchName(branch)

  if (branchError) {
    exitWithErrorMessage(branchError)
  }

  return branch
}

function setOutputFromDeployment(deployment: Deployment): void {
  setOutput('deployment-id', deployment.id)
  setOutput('url', deployment.url)
}

function checkDeployment({ latest_stage }: Deployment): void {
  if (latest_stage && !isStageSuccess(latest_stage)) {
    exitWithErrorMessage(failedDeployMessage(latest_stage.name))
  }
}

function failedDeployMessage(stageName: StageName): string {
  return `Deployment failed on stage: ${stageName}. See log output above for more information.`
}

function runtimeErrorMessage(accountId: string, projectName: string, deployment?: Deployment) {
  const url = dashboardDeploymentUrl(accountId, projectName, deployment)
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

function exitWithErrorMessage(message: string): void {
  const error = new Error(message)
  setFailed(error)
  throw error
}

function logSuccess({ project_name, url, latest_stage }: Deployment): void {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  console.log(`Successfully deployed ${project_name} at ${latest_stage!.ended_on}.`)
  console.log(`URL: ${url}`)
}

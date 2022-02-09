import { getBooleanInput, getInput, setFailed, setOutput } from '@actions/core'
import { deploy } from './deploy'
import createSdk, { SdkConfig } from './sdk'
import { Deployment, StageName } from './types'
import { isStageSuccess } from './utils'

export async function run(): Promise<void> {
  let deployment: Deployment

  try {
    const config = getSdkConfigFromInput()

    const sdk = createSdk(config)

    deployment = await deploy(sdk, getBranch())
    setOutputFromDeployment(deployment)
  } catch (e) {
    console.log(RUNTIME_ERROR_MESSAGE)

    setFailed(e instanceof Error ? e.message : `${e}`)

    return Promise.reject(e)
  }
  checkDeployment(deployment)
  logSuccess(deployment)
}

function getSdkConfigFromInput(): SdkConfig {
  return {
    accountId: getInput('account-id', { required: true }),
    apiKey: getInput('api-key', { required: true }),
    email: getInput('email', { required: true }),
    projectName: getInput('project-name', { required: true }),
  }
}

function getBranch(): string | undefined {
  const production = getBooleanInput('production')
  const branch = getInput('branch')

  const inputCount = [production, branch].filter((x) => x).length

  if (inputCount > 1) {
    exitWithErrorMessage('Inputs "production" and "branch" cannot be used together.')
  }

  if (inputCount === 0) {
    exitWithErrorMessage('Must provide exactly one of the following inputs: "production", "branch"')
  }

  if (production) return undefined

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
    setFailed(failedDeployMessage(latest_stage.name))
  }
}

function failedDeployMessage(stageName: StageName): string {
  return `Deployment failed on stage: ${stageName}. See log output above for more information.`
}

const RUNTIME_ERROR_MESSAGE = `\nThere was an unexpected error. It's possible that your Cloudflare Pages deploy is still in progress or was successful. Go to https://dash.cloudflare.com and visit your Pages dashboard for more details.`

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

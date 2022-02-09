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
    setFailed(e instanceof Error ? e.message : `${e}`)

    console.log(RUNTIME_ERROR_MESSAGE)

    return Promise.reject(e)
  }
  checkDeployment(deployment)
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
    const error = new Error('Inputs "production" and "branch" cannot be used together.')
    setFailed(error)
    throw error
  }

  if (inputCount === 0) {
    const error = new Error(
      'Must provide exactly one of the following inputs: "production", "branch"',
    )
    setFailed(error)
    throw error
  }

  if (production) return undefined
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

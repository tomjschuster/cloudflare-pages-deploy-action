import { getInput, setFailed, setOutput } from '@actions/core'
import { deploy } from './deploy'
import createSdk, { SdkConfig } from './sdk'
import { Deployment, StageName } from './types'
import { isStageSuccess } from './utils'

export async function run(): Promise<void> {
  const config = getSdkConfigFromInput()

  const sdk = createSdk(config)

  const deployment = await deploy(sdk)
  setOutputFromDeployment(deployment)

  checkDeployment(deployment)
}

export function projectDashboardUrl(): string {
  const accountId = getInput('account-id', { required: true })
  const projectName = getInput('project-name', { required: true })
  return `https://dash.cloudflare.com/${accountId}/pages/view/${projectName}`
}

function getSdkConfigFromInput(): SdkConfig {
  return {
    accountId: getInput('account-id', { required: true }),
    apiKey: getInput('api-key', { required: true }),
    email: getInput('email', { required: true }),
    projectName: getInput('project-name', { required: true }),
  }
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

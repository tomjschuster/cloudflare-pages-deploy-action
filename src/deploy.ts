import { logDeploymentStages } from './logs'
import { Sdk } from './sdk'
import { Deployment, StagePollIntervalConfig } from './types'

export async function deploy(
  sdk: Sdk,
  pollIntervalConfig: StagePollIntervalConfig = {},
): Promise<Deployment> {
  throw new Error('bar')
  const deployment = await sdk.createDeployment()

  await logDeploymentStages(deployment, sdk, pollIntervalConfig)

  return await sdk.getDeploymentInfo(deployment.id)
}

import { logDeploymentStages } from './logs'
import { Sdk } from './sdk'
import { Deployment, StagePollIntervalConfig } from './types'

export async function deploy(sdk: Sdk, config: StagePollIntervalConfig = {}): Promise<Deployment> {
  const deployment = await sdk.createDeployment()

  await logDeploymentStages(deployment, sdk, config)

  return await sdk.getDeploymentInfo(deployment.id)
}

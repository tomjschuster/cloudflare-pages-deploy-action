import { endGroup, startGroup } from '@actions/core'
import { PagesSdk } from './cloudflare'
import { DeploymentError } from './errors'
import { Deployment, DeploymentCallbacks, Stage, StageName } from './types'
import { isStageComplete, isStageFailure, wait } from './utils'

/**
 * Creates a CloudFlare Pages for the provided branch (or production branch if no branch provided),
 * logging output for each stage and returning the deployment on complete.
 * */

export async function deploy(
  sdk: PagesSdk,
  branch: string | undefined,
  callbacks?: DeploymentCallbacks,
): Promise<Deployment> {
  const deployment = await sdk.createDeployment(branch)
  if (callbacks?.onStart) await callbacks.onStart(deployment)
  const closeLogsConnection = sdk.getLiveLogs(deployment.id, ({ ts, line }) =>
    console.log(`[${ts}]: ${line}`),
  )

  try {
    for (const { name } of deployment.stages) {
      startGroup(displayNewStage(name))

      const stage = await trackStage(sdk, name, deployment)

      endGroup()

      if (stage && isStageFailure(stage)) break
    }

    closeLogsConnection()
    return await sdk.getDeploymentInfo(deployment.id)
  } catch (e) {
    closeLogsConnection()
    throw new DeploymentError(e, deployment)
  }
}

async function trackStage(
  sdk: PagesSdk,
  name: StageName,
  deployment: Deployment,
): Promise<Stage | undefined> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const info = await sdk.getDeploymentInfo(deployment.id)

    const stage = info.stages.find((s) => s.name === name)

    if (!stage) return
    if (isStageComplete(stage)) return stage

    await wait(getPollInterval(name))
  }
}

/**
 * Returns visually friendly label for stage log group. In practice this is title case,
 * but switch implementation gives more flexibility.
 */
function displayNewStage(stageName: StageName): string {
  switch (stageName) {
    case 'queued':
      return 'Queued'
    case 'initialize':
      return 'Initialize'
    case 'clone_repo':
      return 'Clone Repo'
    case 'build':
      return 'Build'
    case 'deploy':
      return 'Deploy'
    default:
      return stageName
  }
}

// The stages that last longer don't give feedback in between start/end, so there's no real need to
// check for frequent updates. Polling every 10 seconds on these stages slows down deploy by at most 5 seconds
// (extend build 10 extra seconds if polling at end, deploy usually about 5 seconds)
function getPollInterval(name: StageName): number {
  switch (name) {
    case 'queued':
    case 'initialize':
    case 'build':
      return (
        parseEnvPollInterval(name) ??
        /* istanbul ignore next */
        10000
      )
    case 'clone_repo':
    case 'deploy':
    default:
      return (
        parseEnvPollInterval(name) ??
        /* istanbul ignore next */
        3000
      )
  }
}

/** Parses stage specific poll times from env (e.g. `$BUILD_POLL_INTERVAL`), mostly for testing */
function parseEnvPollInterval(name: StageName): number | undefined {
  const envName = stagePollIntervalEnvName(name)
  const value = process.env[envName]

  /* istanbul ignore next */
  if (!value) {
    return undefined
  }

  const parsed = Number(value).valueOf()

  /* istanbul ignore next */
  if (isNaN(parsed)) {
    console.warn(`Invalid poll interval value "${value}" set for stage ${name} (${envName})`)
    return undefined
  }

  return parsed
}

export function stagePollIntervalEnvName(name: StageName): string {
  return `${name.toUpperCase()}_POLL_INTERVAL`
}

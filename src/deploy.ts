import { debug, endGroup, error, startGroup, warning } from '@actions/core'
import { PagesSdk } from './cloudflare'
import { DeploymentError } from './errors'
import { Logger } from './logger'
import { Deployment, DeploymentCallbacks, StageName } from './types'
import { isPastStage, isStageComplete, isStageFailure, wait } from './utils'

/**
 * Creates a CloudFlare Pages for the provided branch (or production branch if no branch provided),
 * logging output for each stage and returning the deployment on complete.
 * */

export async function deploy(
  sdk: PagesSdk,
  branch: string | undefined,
  logger: Logger,
  callbacks?: DeploymentCallbacks,
): Promise<Deployment> {
  let deployment = await sdk.createDeployment(branch)
  if (callbacks?.onStart) await callbacks.onStart(deployment)

  const closeLogsConnection = await sdk.getLiveLogs(deployment.id, logger.enqueue)

  try {
    for (const { name } of deployment.stages) {
      if (callbacks?.onStageChange) await callbacks.onStageChange(name)

      deployment = await trackStage(sdk, name, deployment, logger)

      if (isStageFailure(deployment.latest_stage)) break
    }

    logger.flush()
    closeLogsConnection()
    return deployment
  } catch (e) {
    logger.flush()

    // istanbul ignore else
    if (e instanceof Error) error(e)

    closeLogsConnection()
    throw new DeploymentError(e, deployment)
  }
}

async function trackStage(
  sdk: PagesSdk,
  name: StageName,
  deployment: Deployment,
  logger: Logger,
): Promise<Deployment> {
  let stageHasLogs = false
  let groupStarted = false
  let latestDeploymentInfo = deployment
  //
  let polledAt: string = getPollTime()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const stage = latestDeploymentInfo.stages.find((s) => s.name === name)

    /* istanbul ignore next */
    if (!stage) {
      if (groupStarted) endGroup()
      return latestDeploymentInfo
    }

    const logsUntil = stage.ended_on || polledAt

    if (!stageHasLogs && logger.peek(logsUntil) > 0) stageHasLogs = true

    if (!groupStarted && stage.started_on && stageHasLogs) {
      startGroup(displayNewStage(name))
      debug(stage.started_on)
      groupStarted = true
    }

    if (groupStarted) logger.flush(logsUntil)

    if (isStageComplete(stage) || isPastStage(latestDeploymentInfo, name)) {
      if (groupStarted) {
        if (stage.ended_on) debug(stage.ended_on)
        endGroup()
      }
      return latestDeploymentInfo
    }

    await wait(getPollInterval(name))
    polledAt = getPollTime()
    latestDeploymentInfo = await sdk.getDeploymentInfo(deployment.id)
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
    case 'clone_repo':
    case 'deploy':
    default:
      return (
        parseEnvPollInterval(name) ??
        /* istanbul ignore next */
        2500
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
    warning(`Invalid poll interval value "${value}" set for stage ${name} (${envName})`)
    return undefined
  }

  return parsed
}

export function stagePollIntervalEnvName(name: StageName): string {
  return `${name.toUpperCase()}_POLL_INTERVAL`
}

function getPollTime(): string {
  // There can be a slight lag in stages appearing as completed from API.
  // At the cost of having logs being a few seconds behind, this prevents
  // prevents logs from showing up in the incorrect group.
  return new Date(new Date().valueOf() - 2500).toISOString()
}

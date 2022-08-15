import { debug, endGroup, error, info, startGroup } from '@actions/core'
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
  debug(`Deployment:\n${JSON.stringify(deployment, null, 2)}`)
  if (callbacks?.onStart) await callbacks.onStart(deployment)

  let closeLogsConnection: (() => Promise<void>) | undefined

  try {
    for (const { name } of deployment.stages) {
      // Live logs endpoint fails if deployment is queued
      if (!closeLogsConnection && name !== 'queued') {
        closeLogsConnection = await sdk.getLiveLogs(deployment.id, logger.enqueue)
      }

      if (callbacks?.onStageChange) await callbacks.onStageChange(name)

      deployment = await trackStage(sdk, name, deployment, logger)

      if (isStageFailure(deployment.latest_stage)) break
    }

    logger.flush()
    if (closeLogsConnection) await closeLogsConnection()
    return deployment
  } catch (e) {
    logger.flush()

    // istanbul ignore else
    if (e instanceof Error) error(e)

    // istanbul ignore next
    if (closeLogsConnection) await closeLogsConnection()

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
  let polledAt: string = getPollTime()
  let pollCount = 0

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

    // Queued stage does not have logs
    if (!groupStarted && stage.started_on && !stageHasLogs && name === 'queued' && pollCount > 1) {
      startGroup(displayNewStage(name))
      info('Build is queued')
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
    pollCount++
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

function getPollInterval(name: StageName): number {
  if (process.env.NODE_ENV === 'test') return 0

  // istanbul ignore next
  switch (name) {
    case 'queued':
      return 5000
    case 'initialize':
    case 'build':
    case 'clone_repo':
    case 'deploy':
    default:
      return 2500
  }
}

function getPollTime(): string {
  // There can be a slight lag in stages appearing as completed from API.
  // At the cost of having logs being a few seconds behind, this prevents
  // prevents logs from showing up in the incorrect group.
  return new Date(new Date().valueOf() - 2500).toISOString()
}

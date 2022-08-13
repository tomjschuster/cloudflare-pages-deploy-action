import { endGroup, startGroup } from '@actions/core'
import { PagesSdk } from './cloudflare'
import { DeploymentError } from './errors'
import { Deployment, DeploymentCallbacks, DeploymentLog, Stage, StageName } from './types'
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

  const logger = makeLogger()
  const closeLogsConnection = await sdk.getLiveLogs(deployment.id, logger.enqueue)

  try {
    for (const { name } of deployment.stages) {
      const stage = await trackStage(sdk, name, deployment, logger)

      if (stage && isStageFailure(stage)) break
    }

    logger.flush()
    closeLogsConnection()
    return await sdk.getDeploymentInfo(deployment.id)
  } catch (e) {
    logger.flush()
    console.error(e)
    if (e instanceof Error) console.log(e.stack)
    closeLogsConnection()
    throw new DeploymentError(e, deployment)
  }
}

async function trackStage(
  sdk: PagesSdk,
  name: StageName,
  deployment: Deployment,
  logger: Logger,
): Promise<Stage | undefined> {
  let stageHasLogs = false
  let groupStarted = false
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const polledAt = new Date().toISOString()
    const info = await sdk.getDeploymentInfo(deployment.id)
    const stage = info.stages.find((s) => s.name === name)

    if (!stage) {
      if (groupStarted) endGroup()
      return
    }

    const logsUntil = stage.ended_on || polledAt

    if (!stageHasLogs && logger.peek(logsUntil) > 0) stageHasLogs = true

    if (!groupStarted && stage.started_on && stageHasLogs) {
      startGroup(stage.started_on + '\t' + displayNewStage(name))
      groupStarted = true
    }

    if (groupStarted) logger.flush(logsUntil)

    if (isStageComplete(stage)) {
      if (groupStarted) endGroup()
      return stage
    }

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
    console.warn(`Invalid poll interval value "${value}" set for stage ${name} (${envName})`)
    return undefined
  }

  return parsed
}

export function stagePollIntervalEnvName(name: StageName): string {
  return `${name.toUpperCase()}_POLL_INTERVAL`
}

type EnqueueFun = (log: DeploymentLog) => void
type PeekFn = (timestamp?: string) => number
type FlushFn = (timestamp?: string) => number

type Logger = {
  enqueue: EnqueueFun
  peek: PeekFn
  flush: FlushFn
}

function makeLogger(): Logger {
  const logs: DeploymentLog[] = []

  function enqueue(log: DeploymentLog): void {
    logs.push(log)
  }

  function peek(until?: string): number {
    const currentLength = logs.length
    const untilDate = until ? new Date(until) : undefined

    const outsideWindowIndex = untilDate ? logs.findIndex(({ ts }) => new Date(ts) > untilDate) : -1

    return outsideWindowIndex === -1 ? currentLength : outsideWindowIndex
  }

  function flush(until?: string): number {
    const count = peek(until)

    logs.splice(0, count).forEach(({ ts, line }) => console.log(ts, line))

    return count
  }

  return { enqueue, peek, flush }
}

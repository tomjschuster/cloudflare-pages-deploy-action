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

  const [enqueueLog, flushLogs] = makeLogger()
  const closeLogsConnection = await sdk.getLiveLogs(deployment.id, enqueueLog)

  try {
    for (const { name } of deployment.stages) {
      const stage = await trackStage(sdk, name, deployment, flushLogs)

      if (stage && isStageFailure(stage)) break
    }

    flushLogs()
    closeLogsConnection()
    return await sdk.getDeploymentInfo(deployment.id)
  } catch (e) {
    flushLogs()
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
  flushLogs: FlushFn,
): Promise<Stage | undefined> {
  let logCount = 0
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

    if (!groupStarted && stage.started_on && logCount > 0) {
      startGroup(stage.started_on + '\t' + displayNewStage(name))
      groupStarted = true
    }

    logCount += flushLogs(name === 'deploy' ? undefined : stage.ended_on || polledAt)

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
type FlushFn = (timestamp?: string) => number

function makeLogger(): [EnqueueFun, FlushFn] {
  const logs: DeploymentLog[] = []

  function enqueue(log: DeploymentLog): void {
    logs.push(log)
  }

  function flush(until?: string): number {
    const currentLength = logs.length
    const untilDate = until ? new Date(until) : undefined

    const outsideWindowIndex = untilDate
      ? // assume timestamps in chronological order
        logs.findIndex(({ ts }) => new Date(ts) > untilDate)
      : -1

    // flush all if no timestamp provided or if all timestamps less than until
    const logUntilIndex = outsideWindowIndex === -1 ? currentLength : outsideWindowIndex + 1

    logs.splice(0, logUntilIndex).forEach(({ ts, line }) => console.log(ts, line))

    console.log('FLUSHED:', currentLength, logUntilIndex)

    console.log('PENDING', JSON.stringify(logs))

    return Math.max(logUntilIndex, 0)
  }

  return [enqueue, flush]
}

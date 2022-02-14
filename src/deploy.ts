import { endGroup, startGroup } from '@actions/core'
import { PagesSdk } from './cloudflare'
import { DeploymentError } from './errors'
import {
  Deployment,
  DeploymentHandlers,
  Stage,
  StageLog,
  StageLogsResult,
  StageName,
} from './types'
import { isQueuedStage, isStageComplete, isStageFailure, isStageSuccess, wait } from './utils'

/**
 * Creates a CloudFlare Pages for the provided branch (or production branch if no branch provided),
 * logging output for each stage and returning the deployment on complete.
 * */
export async function deploy(
  sdk: PagesSdk,
  branch: string | undefined,
  handlers?: DeploymentHandlers,
): Promise<Deployment> {
  const deployment = await sdk.createDeployment(branch)
  await handlers?.onStart(deployment)

  try {
    await logDeploymentStages(sdk, deployment, handlers?.onStageChange)
    return await sdk.getDeploymentInfo(deployment.id)
  } catch (e) {
    throw new DeploymentError(e, deployment)
  }
}

/** Iterates through a deployments stages, polling and printing logs until each stage completes */
async function logDeploymentStages(
  sdk: PagesSdk,
  { id, stages }: Deployment,
  onChange?: (stage: StageName) => Promise<void>,
): Promise<void> {
  for (const { name } of stages) {
    const poll = makePoller(sdk, id, name)

    // Get initial logs for stage
    let { stage, newLogs, unexpectedlyPastStage } = await poll()

    // We don't log certain stages (such as queued) if they were already complete. Move onto next stage.
    if (shouldSkip(stage)) continue

    // Mark new stage through callback
    onChange && (await onChange(name))

    // New GitHub Actions log group for stage
    startGroup(displayNewStage(name))

    // For certain stages we add some extra initial logs (e.g. to announce build start sooner)
    for (const log of extraStageLogs(name)) console.log(log)

    // eslint-disable-next-line no-constant-condition
    while (true) {
      for (const log of newLogs) console.log(log.message)

      if (isStageComplete(stage) || unexpectedlyPastStage) {
        // Close stage's GitHub Actions log group
        endGroup()

        // If stage fails, other stages will never complete
        if (isStageFailure(stage)) return
        // Move onto next stage
        break
      }

      await wait(getPollInterval(stage))
      ;({ stage, newLogs, unexpectedlyPastStage } = await poll())
    }
  }
}

/** Avoids logging unnecessary stages, namely to avoid logging `queued` if the build was never queued. */
function shouldSkip(stage: Stage): boolean {
  return isQueuedStage(stage) && isStageSuccess(stage)
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

/**
 * Enhances CloudFlare Pages logs at start of stage, namely by marking start build step,
 * since there build feedback until end of build)
 * */
function extraStageLogs(stageName: StageName): string[] {
  switch (stageName) {
    case 'build':
      return ['Building application...']
    default:
      return []
  }
}

type GetStageLogsResult = {
  stage: Stage
  newLogs: StageLog[]
  unexpectedlyPastStage: boolean
}

/** Higher Order Function for keeping track of last logged id's and intermitently polling latest deployment stage  */
function makePoller(
  sdk: PagesSdk,
  id: string,
  stageName: StageName,
  checkDeploymentEvery = 5,
): () => Promise<GetStageLogsResult> {
  let pollCount = 0
  let lastLogId: number | undefined

  return async function poll(): Promise<GetStageLogsResult> {
    pollCount++
    const stageLogs = await sdk.getStageLogs(id, stageName)

    // Avoids infinite loop if stage logs does not return expected statuses on completion
    const unexpectedlyPastStage =
      !isStageComplete(stageLogs) && pollCount % checkDeploymentEvery === 0
        ? await checkIfPastStage(sdk, id, stageName)
        : false

    const newLogs = getNewStageLogs(stageLogs, lastLogId)
    lastLogId = stageLogs.end

    return { stage: stageLogs, newLogs, unexpectedlyPastStage }
  }
}

// The logs endpoint doesn't seem to offer pagination so we have to fetch all logs every poll
// https://api.cloudflare.com/#pages-deployment-get-deployment-stage-logs
function getNewStageLogs(logs: StageLogsResult, lastLogId?: number): StageLog[] {
  if (lastLogId === undefined) return logs.data
  if (logs.end === lastLogId) return []
  return logs.data.filter((log) => log.id > lastLogId)
}

// Expected pages deploy behavior is that every stage will end with a status of `success` or `failure`.
// Since this is not explicitly documented, and to account for
async function checkIfPastStage(sdk: PagesSdk, id: string, stageName: StageName): Promise<boolean> {
  const { latest_stage } = await sdk.getDeploymentInfo(id)
  return !!latest_stage && latest_stage.name !== stageName
}

// The stages that last longer don't give feedback in between start/end, so there's no real need to
// check for frequent updates. Polling every 10 seconds on these stages slows down deploy by at most 5 seconds
// (extend build 10 extra seconds if polling at end, deploy usually about 5 seconds)
function getPollInterval(stage: Stage): number {
  switch (stage.name) {
    case 'queued':
    case 'initialize':
    case 'build':
      return (
        parseEnvPollInterval(stage.name) ??
        /* istanbul ignore next */
        10000
      )
    case 'clone_repo':
    case 'deploy':
    default:
      return (
        parseEnvPollInterval(stage.name) ??
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

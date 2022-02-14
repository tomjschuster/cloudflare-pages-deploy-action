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

function shouldSkip(stage: Stage): boolean {
  return isQueuedStage(stage) && isStageSuccess(stage)
}

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
      return `Deploy`
    default:
      return stageName
  }
}

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

async function checkIfPastStage(sdk: PagesSdk, id: string, stageName: StageName): Promise<boolean> {
  const { latest_stage } = await sdk.getDeploymentInfo(id)
  return !!latest_stage && latest_stage.name !== stageName
}

function getPollInterval(stage: Stage): number {
  switch (stage.name) {
    case 'queued':
    case 'initialize':
    case 'build':
      return (
        pollIntervalFromEnv(stage.name) ??
        /* istanbul ignore next */
        10000
      )
    case 'clone_repo':
    case 'deploy':
    default:
      return (
        pollIntervalFromEnv(stage.name) ??
        /* istanbul ignore next */
        5000
      )
  }
}

function pollIntervalFromEnv(name: StageName): number | undefined {
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

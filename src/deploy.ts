import { endGroup, startGroup } from '@actions/core'
import { DeploymentError } from './errors'
import { Sdk } from './sdk'
import { Deployment, Stage, StageLog, StageLogsResult, StageName } from './types'
import { isQueuedStage, isStageComplete, isStageIdle, isStageSuccess, wait } from './utils'

export async function deploy(sdk: Sdk, branch?: string): Promise<Deployment> {
  const deployment = await sdk.createDeployment(branch)

  try {
    await logDeploymentStages(deployment, sdk)

    return await sdk.getDeploymentInfo(deployment.id)
  } catch (e) {
    throw new DeploymentError(e, deployment)
  }
}

async function logDeploymentStages({ id, stages }: Deployment, sdk: Sdk): Promise<void> {
  for (let i = 0; i < stages.length; i++) {
    const { name } = stages[i]
    const nextStage: Stage | undefined = stages[i + 1]

    let stageLogs: StageLogsResult = await sdk.getStageLogs(id, name)
    let nextStageLogs: StageLogsResult | undefined
    let lastLogId: number | undefined

    if (shouldSkip(stageLogs)) continue

    startGroup(displayNewStage(name))

    for (const log of extraStageLogs(name)) console.log(log)

    let pollAttempts = 1

    // eslint-disable-next-line no-constant-condition
    while (true) {
      for (const log of getNewStageLogs(stageLogs, lastLogId)) console.log(log.message)

      if (isStageComplete(stageLogs)) break

      await wait(getPollInterval(stageLogs))

      // Loop logic assumes that every deploy stage will end with a status of failure or success.
      // Since this is not explicitly stated in the API docs, we defensively peek at the next stage
      // every 5 polls to see if the next stage has started to reduce the probability of an infinite
      // loop until the the job times out.
      nextStageLogs =
        nextStage && pollAttempts++ % 5 === 0
          ? await sdk.getStageLogs(id, nextStage.name)
          : undefined

      lastLogId = getLastLogId(stageLogs)
      stageLogs = await sdk.getStageLogs(id, name)

      if (nextStageLogs && !isStageComplete(stageLogs) && !isStageIdle(nextStageLogs)) {
        break
      }
    }

    endGroup()

    // If stage fails, following stages will never complete
    if (!isStageSuccess(stageLogs) && (!nextStageLogs || isStageIdle(nextStageLogs))) return
  }
}

function shouldSkip(stage: StageLogsResult): boolean {
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

export function stagePollIntervalEnvName(name: StageName): string {
  return `${name.toUpperCase()}_POLL_INTERVAL`
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

function getPollInterval(stage: StageLogsResult): number {
  switch (stage.name) {
    case 'queued':
    case 'initialize':
    case 'build':
      return (
        pollIntervalFromEnv(stage.name) ??
        /* istanbul ignore next */
        15000
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

// The logs endpoint doesn't offer pagination or tail logging so we have to fetch all logs every poll
// https://api.cloudflare.com/#pages-deployment-get-deployment-stage-logs
function getNewStageLogs(logs: StageLogsResult, lastLogId?: number): StageLog[] {
  if (lastLogId === undefined) return logs.data
  if (logs.end === lastLogId) return []
  return logs.data.filter((log) => log.id > lastLogId)
}

function getLastLogId(logs?: StageLogsResult): number | undefined {
  return !logs || logs.data.length === 0 ? undefined : Math.max(...logs.data.map((log) => log.id))
}

import { endGroup, startGroup } from '@actions/core'
import { PagesSdk } from './cloudflare'
import { DeploymentError } from './errors'
import { Deployment, DeploymentHandlers, StageLog, StageLogsResult, StageName } from './types'
import { isQueuedStage, isStageComplete, isStageSuccess, wait } from './utils'

export async function deploy(
  sdk: PagesSdk,
  branch: string | undefined,
  handlers?: DeploymentHandlers,
): Promise<Deployment> {
  // // @ts-expect-error foo
  // await handlers?.onStart()
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
    let stageLogs: StageLogsResult = await sdk.getStageLogs(id, name)
    let lastLogId: number | undefined

    if (shouldSkip(stageLogs)) continue

    onChange && (await onChange(name))

    startGroup(displayNewStage(name))

    for (const log of extraStageLogs(name)) console.log(log)

    let pollAttempts = 1
    let skippedStage = false

    // eslint-disable-next-line no-constant-condition
    while (true) {
      for (const log of getNewStageLogs(stageLogs, lastLogId)) console.log(log.message)

      if (isStageComplete(stageLogs)) break

      await wait(getPollInterval(stageLogs))

      // Loop logic assumes that every deploy stage will end with a status of failure or success.
      // Since this is not explicitly stated in the API docs, we defensively peek at the next stage
      // every 5 polls to see if the next stage has started to reduce the probability of an infinite
      // loop until the the job times out.
      const deploymentInfo = pollAttempts++ % 5 === 0 ? await sdk.getDeploymentInfo(id) : undefined

      lastLogId = getLastLogId(stageLogs)
      stageLogs = await sdk.getStageLogs(id, name)

      // Deployment is no longer on stage, but we don't recognize stage as complete; avoid infinite loop
      if (
        !isStageComplete(stageLogs) &&
        deploymentInfo?.latest_stage &&
        deploymentInfo.latest_stage.name !== name
      ) {
        skippedStage = true
        break
      }
    }

    endGroup()

    // If stage fails, following stages will never complete
    if (!isStageSuccess(stageLogs) && !skippedStage) return
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

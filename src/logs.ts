import { endGroup, startGroup } from '@actions/core'
import { Sdk } from './sdk'
import { Deployment, StageLog, StageLogsResult, StageName, StagePollIntervalConfig } from './types'
import { isStageComplete, isStageSuccess, wait } from './utils'

export type Log = { type: 'stage-log'; log: StageLog } | { type: 'new-stage'; name: StageName }

export async function logDeploymentStages(
  { id, stages }: Deployment,
  sdk: Sdk,
  pollIntervalConfig: StagePollIntervalConfig = {},
): Promise<void> {
  for (const { name } of stages) {
    let stageLogs: StageLogsResult = await sdk.getStageLogs(id, name)
    let lastLogId: number | undefined

    if (shouldSkip(stageLogs)) continue

    startGroup(displayNewStage(name))

    for (const log of extraStageLogs(name)) console.log(log)

    // eslint-disable-next-line no-constant-condition
    while (true) {
      for (const log of getNewStageLogs(stageLogs, lastLogId)) console.log(log.message)

      if (isStageComplete(stageLogs)) break

      await wait(pollIntervalConfig[name] ?? getPollInterval(stageLogs))

      lastLogId = getLastLogId(stageLogs)
      stageLogs = await sdk.getStageLogs(id, name)
    }

    endGroup()

    // If stage fails, following stages will never complete
    if (!isStageSuccess(stageLogs)) return
  }
}

function shouldSkip(stage: StageLogsResult): boolean {
  return stage.name === 'queued' && stage.status === 'success'
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

export function getPollInterval(stage: StageLogsResult): number {
  switch (stage.name) {
    case 'queued':
    case 'initialize':
    case 'build':
      return 15000
    case 'clone_repo':
    case 'deploy':
    default:
      return 5000
  }
}

//
function getNewStageLogs(logs: StageLogsResult, lastLogId?: number): StageLog[] {
  if (lastLogId === undefined) return logs.data
  if (logs.end === lastLogId) return []
  return logs.data.filter((log) => log.id > lastLogId)
}

function getLastLogId(logs?: StageLogsResult): number | undefined {
  return !logs || logs.data.length === 0 ? undefined : Math.max(...logs.data.map((log) => log.id))
}

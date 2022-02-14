import { Stage, StageLogsResult } from './types.d'

export function isQueuedStage(stage: Stage | StageLogsResult): boolean {
  return stage.name === 'queued'
}

export function isStageSuccess(stage: Stage | StageLogsResult): boolean {
  return stage.status === 'success'
}

export function isStageFailure(stage: Stage | StageLogsResult): boolean {
  return stage.status === 'failure'
}

export function isStageComplete(stage: Stage | StageLogsResult): boolean {
  return stage.status === 'success' || stage.status === 'failure'
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

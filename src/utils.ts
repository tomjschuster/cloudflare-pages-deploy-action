import { Stage, StageLogsResult } from './types.d'

export function isStageQueued(stage: Stage | StageLogsResult): boolean {
  return stage.status === 'queued'
}

export function isStageSuccess(stage: Stage | StageLogsResult): boolean {
  return stage.status === 'success'
}

export function isStageComplete(stage: Stage | StageLogsResult): boolean {
  return stage.status === 'success' || stage.status === 'failure'
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

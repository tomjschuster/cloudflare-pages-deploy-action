import { Stage } from './types.d'

export function isQueuedStage(stage: Stage): boolean {
  return stage.name === 'queued'
}

export function isStageSuccess(stage: Stage): boolean {
  return stage.status === 'success'
}

export function isStageFailure(stage: Stage): boolean {
  return stage.status === 'failure'
}

export function isStageComplete(stage: Stage): boolean {
  return stage.status === 'success' || stage.status === 'failure'
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

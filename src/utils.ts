import { Deployment, Stage, StageName } from './types.d'

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

export function isPastStage({ stages, latest_stage }: Deployment, name: StageName): boolean {
  const stageIndex = stages.findIndex((s) => s.name === name)
  const latestStageIndex = stages.findIndex((s) => s.name === latest_stage.name)

  return latestStageIndex > stageIndex
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

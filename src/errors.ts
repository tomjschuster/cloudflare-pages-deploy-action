import { ApiErrorEntry, ApiResult, Stage } from './types'

export class CloudFlareApiError extends Error {
  result: ApiResult<unknown>

  constructor(result: ApiResult<unknown>) {
    super(formatApiErrors(result.errors || []))

    Object.setPrototypeOf(this, CloudFlareApiError.prototype)

    this.result = result
  }
}

export class PagesDeploymentStageError extends Error {
  stage: Stage
  constructor(stage: Stage) {
    super(formatStageError(stage))

    Object.setPrototypeOf(this, CloudFlareApiError.prototype)

    this.stage = stage
  }
}

export function formatApiErrors(errors: ApiErrorEntry[]): string {
  const apiErrors = errors.map((error) => `${error.message} [${error.code}]`).join('\n')
  return `[Cloudflare API Error]:\n${apiErrors}`
}

function formatStageError(stage: Stage): string {
  return `[Cloudflare Pages Deployment Stage Failure] Stage ${stage.name} failed`
}

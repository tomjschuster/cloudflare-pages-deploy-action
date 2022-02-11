import { ApiErrorEntry, ApiResult, Deployment } from './types'

export class CloudFlareApiError extends Error {
  result: ApiResult<unknown>

  constructor(result: ApiResult<unknown>) {
    super(formatApiErrors(result.errors || []))

    Object.setPrototypeOf(this, CloudFlareApiError.prototype)

    this.result = result
  }
}

function formatApiErrors(errors: ApiErrorEntry[]): string {
  const apiErrors = errors.map((error) => `${error.message} [${error.code}]`).join('\n')
  return apiErrors ? `[Cloudflare API Error]\n${apiErrors}` : '[Cloudflare API Error]'
}

export class DeploymentError extends Error {
  deployment: Deployment

  constructor(errorOrMessage: unknown, deployment: Deployment) {
    /* istanbul ignore else */
    if (errorOrMessage instanceof Error) {
      super(errorOrMessage.message)
      this.stack = errorOrMessage.stack
    } else if (typeof errorOrMessage === 'string' || errorOrMessage === undefined) {
      super(errorOrMessage)
    } else {
      super(`${errorOrMessage}`)
    }

    Object.setPrototypeOf(this, DeploymentError.prototype)

    this.deployment = deployment
  }
}

export class DeployHookDeleteError extends Error {
  hookName: string

  constructor(errorOrMessage: unknown, hookName: string) {
    /* istanbul ignore else */
    if (errorOrMessage instanceof Error) {
      super(errorOrMessage.message)
      this.stack = errorOrMessage.stack
    } else if (typeof errorOrMessage === 'string' || errorOrMessage === undefined) {
      super(errorOrMessage)
    } else {
      super(`${errorOrMessage}`)
    }

    Object.setPrototypeOf(this, DeployHookDeleteError.prototype)

    this.hookName = hookName
  }
}

export class GithubApiError extends Error {
  constructor(status: number, message?: string) {
    super(`[GitHub API Error] Status: ${status}${message && `, Message: ${message}`}`)

    Object.setPrototypeOf(this, DeployHookDeleteError.prototype)
  }
}

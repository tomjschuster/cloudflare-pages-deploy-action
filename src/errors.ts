import { Response } from 'node-fetch'
import { ApiErrorEntry, Deployment } from './types'

export async function formatApiErrors(
  method: string,
  path: string,
  res: Response,
): Promise<string> {
  const text = `${method} ${path} [${res.status}: ${res.statusText}]`

  try {
    const json = await res.json()

    if (json && typeof json === 'object' && Array.isArray(json.errors) && json.errors.length > 0) {
      const errors: ApiErrorEntry[] = json.errors
      const messages = errors.map((error) => `${error.message} [${error.code}]`).join('\n')
      return `${text}\n${messages}`
    } else {
      return `${text}\n${JSON.stringify(json, undefined, 2)}`
    }
  } catch (_e) {
    return text
  }
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

export class GithubApiError extends Error {
  constructor(status: number, message?: string) {
    super(`[GitHub API Error] Status: ${status}${message && `, Message: ${message}`}`)

    Object.setPrototypeOf(this, GithubApiError.prototype)
  }
}

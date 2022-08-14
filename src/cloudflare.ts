import { debug, error, info, warning } from '@actions/core'
import { nanoid } from 'nanoid'
import fetch, { BodyInit } from 'node-fetch'
import WebSocket from 'ws'
import { DeployHookDeleteError, formatApiErrors } from './errors'
import {
  ApiResult,
  DeployHook,
  DeployHookResult,
  Deployment,
  DeploymentLog,
  Project,
} from './types'

const CF_BASE_URL = 'https://api.cloudflare.com/client/v4'

export type PagesSdkConfig = {
  accountId: string
  apiKey: string
  email: string
  projectName: string
}

export type PagesSdk = {
  getProject(): Promise<Project>
  createDeployment(branch?: string): Promise<Deployment>
  getDeploymentInfo(id: string): Promise<Deployment>
  getLiveLogs(deploymentId: string, onLog: (log: DeploymentLog) => void): Promise<() => void>
}

/**
 * Captures account/project info in closures and interprets success/failure results as
 * a resolved/rejected Promise.
 */
export default function createPagesSdk({
  accountId,
  apiKey,
  email,
  projectName,
}: PagesSdkConfig): PagesSdk {
  async function fetchCf<T>(path: string, method = 'GET', body?: BodyInit): Promise<T> {
    debug(`[PagesSdk] Request: ${method} ${path}`)

    const response = await fetch(`${CF_BASE_URL}${path}`, {
      method,
      headers: {
        'X-Auth-Key': apiKey,
        'X-Auth-Email': email,
      },
      body,
    })

    debug(`[PagesSdk] Result: ${method} ${path} [${response.status}: ${response.statusText}]`)

    if (!response.ok) {
      const message = await formatApiErrors(method, path, response)
      return Promise.reject(new Error(message))
    }

    const result: ApiResult<T> = await response.json()

    if (result.success === false) {
      const message = await formatApiErrors(method, path, response)
      return Promise.reject(new Error(message))
    }

    return result.result
  }

  function getProject(): Promise<Project> {
    return fetchCf(projectPath(accountId, projectName, ''))
  }

  function createDeployment(branch?: string): Promise<Deployment> {
    if (!branch) {
      info(`Creating a deployment for the production branch of ${projectName}.\n`)
      return fetchCf(projectPath(accountId, projectName, '/deployments'), 'POST')
    }

    return createBranchDeploymentUsingDeployHook(branch)
  }

  function getDeploymentInfo(id: string): Promise<Deployment> {
    return fetchCf(projectPath(accountId, projectName, `/deployments/${id}`))
  }

  /**
   * Creates a Pages deployment for any branch by creating, triggering, then deleting a deploy hook.
   * This is because the `Create deployment` endpoint only supports triggering production deployments.
   * If production branch is passed, we call `createDeployment` without a branch to avoid this hack.
   *
   * Create/Delete Deploy Hook endpoints are not documented, but are observable from the Pages dashboard
   * when creating/deleting hooks.
   **/
  async function createBranchDeploymentUsingDeployHook(branch: string): Promise<Deployment> {
    const project = await getProject()

    // Cloudflare API supports triggering production deployement without a webhook
    if (branch === project.source.config.production_branch) return await createDeployment()

    info(`Creating a deployment for branch "${branch}" of ${projectName}.\n`)

    // UNDOCUMENTED ENDPOINT
    function createDeployHook(name: string, branch: string): Promise<DeployHook> {
      return fetchCf(
        projectPath(accountId, projectName, '/deploy_hooks'),
        'POST',
        JSON.stringify({ name, branch }),
      )
    }

    // UNDOCUMENTED ENDPOINT
    function deleteDeployHook(id: string): Promise<void> {
      return fetchCf(projectPath(accountId, projectName, `/deploy_hooks/${id}`), 'DELETE')
    }

    function executeDeployHook(id: string): Promise<DeployHookResult> {
      return fetchCf(`/pages/webhooks/deploy_hooks/${id}`, 'POST')
    }

    const name = `github-actions-temp-${normalizedIsoString()}-${nanoid()}`

    const { hook_id } = await createDeployHook(name, branch)

    let deletedHook = false

    try {
      const { id: deploymentId } = await executeDeployHook(hook_id)

      // We only need the webhook to trigger a onetime deployment for the given branch
      await deleteDeployHook(hook_id)
      deletedHook = true

      return await getDeploymentInfo(deploymentId)
    } catch (e) {
      // If we faild to delete the hook, attempt to delete it, and let user know if delete fails
      // so they can delete it manually through the dashboard
      if (!deletedHook) {
        const deployHookDeleteError = new DeployHookDeleteError(e, name)
        await deleteDeployHook(hook_id).catch(() => Promise.reject(deployHookDeleteError))
      }

      throw e
    }
  }

  async function getLiveLogs(id: string, onLog: (log: DeploymentLog) => void): Promise<() => void> {
    const { jwt } = await fetchCf<{ jwt: string }>(
      projectPath(accountId, projectName, `/deployments/${id}/live`),
    )

    return new Promise((resolve, reject) => {
      let resolved = false
      let closed = false
      const wsUrl = `wss://api.pages.cloudflare.com/logs/ws/get?startIndex=0&jwt=${jwt}`

      const connection = new WebSocket(wsUrl)
      connection.onopen = () => {
        debug('[ws] WebSocket connection opened')
        resolve(() => {
          if (!closed) {
            connection.terminate()
            closed = true
          } else {
            debug('[ws] `close()` called more than once.')
          }
        })
        resolved = true
      }

      connection.onerror = (e) => {
        debug(`[ws] WebSocket error: ${e}`)
      }

      connection.onclose = (event) => {
        if (!resolved) {
          warning('[ws] WebSocket connection closed before resolution')
          reject(event)
        }

        debug(`[ws] WebSocket closed: ${event.reason} (CODE: ${event.code})`)
      }

      connection.onmessage = (evt) => {
        try {
          const data = typeof evt.data === 'string' ? JSON.parse(evt.data) : undefined
          if (data && typeof data === 'object' && 'ts' in data && 'line' in data) {
            onLog(data)
          } else {
            warning(`[ws] Unexpected data format:\n${JSON.stringify(data, undefined, 2)}`)
          }
        } catch (e) {
          error(`[ws] Error parsing message data: DATA: ${evt.data}, ERROR: ${e}`)
        }
      }
    })
  }

  return {
    getProject,
    createDeployment,
    getDeploymentInfo,
    getLiveLogs,
  }
}

function projectPath(accountId: string, projectName: string, path: string): string {
  return `/accounts/${accountId}/pages/projects/${projectName}${path}`
}

function normalizedIsoString(): string {
  return new Date().toISOString().split('.')[0].replace(/[-:]/g, '')
}

import { debug, error, info } from '@actions/core'
import FormData from 'form-data'
import fetch, { BodyInit } from 'node-fetch'
import WebSocket, { CloseEvent } from 'ws'
import { formatApiErrors } from './errors'
import { ApiResult, Deployment, DeploymentLog, LiveLogsResult, Project } from './types'

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
  getLiveLogs(
    deploymentId: string,
    onLog: (log: DeploymentLog) => void,
  ): Promise<() => Promise<void>>
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

    const authHeaders = {
      'X-Auth-Key': apiKey,
      'X-Auth-Email': email,
    }

    const contentType = body instanceof FormData ? 'application/x-www-form-urlencoded' : undefined

    const response = await fetch(`${CF_BASE_URL}${path}`, {
      method,
      headers: {
        ...authHeaders,
        ...(contentType ? { 'Content-Type': contentType } : {}),
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

  async function createDeployment(branch?: string): Promise<Deployment> {
    const productionBranch = branch && (await getProject()).source.config.production_branch

    if (!branch || branch === productionBranch) {
      info(`Creating a deployment for the production branch of ${projectName}.\n`)
      return fetchCf(projectPath(accountId, projectName, '/deployments'), 'POST')
    }

    info(`Creating a preview for branch ${branch}.`)
    const formData = new FormData()
    formData.append('branch', branch)

    return fetchCf(projectPath(accountId, projectName, '/deployments'), 'POST', formData)
  }

  function getDeploymentInfo(id: string): Promise<Deployment> {
    return fetchCf(projectPath(accountId, projectName, `/deployments/${id}`))
  }

  function getLiveLogsJwt(id: string): Promise<LiveLogsResult> {
    return fetchCf<LiveLogsResult>(projectPath(accountId, projectName, `/deployments/${id}/live`))
  }

  async function getLiveLogs(
    id: string,
    onLog: (log: DeploymentLog) => void,
  ): Promise<() => Promise<void>> {
    const { jwt } = await getLiveLogsJwt(id)
    const connection = new WebSocket(liveLogsUrl(jwt))

    let resolveOpen: (close: () => Promise<void>) => void
    let rejectOpen: (evt: CloseEvent) => void
    let resolveClosed: () => void
    let closePromise: Promise<void>

    const result = new Promise<() => Promise<void>>((resolve, reject) => {
      resolveOpen = resolve
      rejectOpen = reject
    })

    function close(): Promise<void> {
      closePromise =
        closePromise ??
        new Promise<void>((resolve) => {
          resolveClosed = resolve
          connection.close()
        })

      return closePromise
    }

    connection.onopen = () => {
      debug('[ws] WebSocket connection opened')
      resolveOpen(close)
    }

    connection.onerror = (e) => {
      debug(`[ws] WebSocket error: ${e}`)
    }

    connection.onclose = (event) => {
      debug(`[ws] WebSocket closed: ${event.reason} (CODE: ${event.code})`)

      if (resolveClosed) {
        resolveClosed()
      } else {
        // socket connection never established
        rejectOpen(event)
      }
    }

    connection.onmessage = (evt) => {
      try {
        const log = parseDeploymentLog(evt.data)
        onLog(log)
      } catch (e) {
        error(`[ws] Error parsing message data: DATA: ${evt.data}, ERROR: ${e}`)
      }
    }

    return result
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

function parseDeploymentLog(value: unknown): DeploymentLog {
  const data = typeof value === 'string' ? JSON.parse(value) : undefined
  if (data && typeof data === 'object' && 'ts' in data && 'line' in data) {
    return data
  }

  throw new Error('Unexpected message format')
}

function liveLogsUrl(jwt: string): string {
  return (
    process.env.WS_HOST ??
    /* istanbul ignore next */
    `wss://api.pages.cloudflare.com/logs/ws/get?startIndex=0&jwt=${jwt}`
  )
}

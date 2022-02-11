import { nanoid } from 'nanoid'
import fetch, { BodyInit } from 'node-fetch'
import { CloudFlareApiError, DeployHookDeleteError } from './errors'
import {
  ApiResult,
  DeployHook,
  DeployHookResult,
  Deployment,
  KnownStageName,
  Project,
  StageLogsResult,
  StageName,
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
  getStageLogs(deploymentId: string, stageName: StageName): Promise<StageLogsResult>
}

export default function createPagesSdk({
  accountId,
  apiKey,
  email,
  projectName,
}: PagesSdkConfig): PagesSdk {
  async function fetchCf<T>(path: string, method = 'GET', body?: BodyInit): Promise<T> {
    const result = (await fetch(`${CF_BASE_URL}${path}`, {
      method,
      headers: {
        'X-Auth-Key': apiKey,
        'X-Auth-Email': email,
      },
      body,
    }).then((res) =>
      res.ok ? res.json() : Promise.reject(new Error(res.statusText)),
    )) as ApiResult<T>

    if (!result.success) return Promise.reject(new CloudFlareApiError(result))

    return result.result
  }

  function getProject(): Promise<Project> {
    return fetchCf(projectPath(accountId, projectName, ''))
  }

  function createDeployment(branch?: string): Promise<Deployment> {
    if (!branch) {
      console.log('')
      console.log(`Creating a deployment for the production branch of ${projectName}.\n`)
      return fetchCf(projectPath(accountId, projectName, '/deployments'), 'POST')
    }

    // Cloudflare API only supports triggering deployments for the production branch, however, it
    // is possible to create deployments for any branch using ad-hoc web-hooks
    // (CREATE/DELETE Deploy hook are undocumented so could break)
    return createBranchDeploymentUsingDeployHook(branch)
  }

  function getDeploymentInfo(id: string): Promise<Deployment> {
    return fetchCf(projectPath(accountId, projectName, `/deployments/${id}`))
  }

  function getStageLogs(id: string, name: KnownStageName): Promise<StageLogsResult> {
    return fetchCf(projectPath(accountId, projectName, `/deployments/${id}/history/${name}/logs`))
  }

  async function createBranchDeploymentUsingDeployHook(branch: string): Promise<Deployment> {
    const project = await getProject()

    // Cloudflare API supports triggering production deployement without a webhook
    if (branch === project.source.config.production_branch) return await createDeployment()

    console.log('')
    console.log(`Creating a deployment for branch "${branch}" of ${projectName}\n.`)

    function createDeployHook(name: string, branch: string): Promise<DeployHook> {
      return fetchCf(
        projectPath(accountId, projectName, '/deploy_hooks'),
        'POST',
        JSON.stringify({ name, branch }),
      )
    }

    function executeDeployHook(id: string): Promise<DeployHookResult> {
      return fetchCf(`/pages/webhooks/deploy_hooks/${id}`, 'POST')
    }

    function deleteDeployHook(id: string): Promise<void> {
      return fetchCf(projectPath(accountId, projectName, `/deploy_hooks/${id}`), 'DELETE')
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
      // so they know to delete it manually through the dashboard
      if (!deletedHook) {
        const deployHookDeleteError = new DeployHookDeleteError(e, name)
        await deleteDeployHook(hook_id).catch(() => Promise.reject(deployHookDeleteError))
      }

      throw e
    }
  }

  return {
    getProject,
    createDeployment,
    getDeploymentInfo,
    getStageLogs,
  }
}

function projectPath(accountId: string, projectName: string, path: string): string {
  return `/accounts/${accountId}/pages/projects/${projectName}${path}`
}

function normalizedIsoString(): string {
  return new Date().toISOString().split('.')[0].replace(/[-:]/g, '')
}

import { getOctokit } from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'
import { dashboardDeploymentUrl } from './dashboard'
import { GithubApiError } from './errors'
import { Deployment, DeploymentHandlers, StageName } from './types'

export type Octokit = InstanceType<typeof GitHub>

export function createGithubCloudfrontDeploymentHandlers(
  accountId: string,
  token: string,
): DeploymentHandlers {
  const octokit = getOctokit(token)
  let id: number | undefined
  let deployment: Deployment | undefined

  async function deploy(newDeployment: Deployment): Promise<void> {
    console.log('CREATING GITHUB DEPLOYMENT')
    id = await createGitHubDeployment(octokit, accountId, newDeployment)
    deployment = newDeployment
    console.log('GITHUB DEPLOYMENT CREATED', id)
  }

  async function updateState(stageName: StageName): Promise<void> {
    const state = githubDeployStateFromStage(stageName)
    console.log('STAGE', stageName, state, id, !!deployment)
    if (!state || !id || !deployment) return

    console.log('UPDATING GITHUB DEPLOYMENT', state)
    await createGitHubDeploymentStatus(octokit, accountId, id, state, deployment)
    console.log('UPDATED GITHUB DEPLOYMENT', state)
  }

  async function setFailure(): Promise<void> {
    if (!id || !deployment) return

    console.log('SETTING GITHUB FAILURE')
    await createGitHubDeploymentStatus(octokit, accountId, id, 'failure', deployment)
    console.log('SET GITHUB FAILURE')
  }

  async function setSuccess(): Promise<void> {
    if (!id || !deployment) return

    console.log('SETTING GITHUB SUCCESS')
    await createGitHubDeploymentStatus(octokit, accountId, id, 'success', deployment)
    console.log('SET GITHUB SUCCESS')
  }

  return {
    onStart: deploy,
    onStageChange: updateState,
    onSuccess: setSuccess,
    onFailure: setFailure,
  }
}

function createGitHubDeployment(
  octokit: Octokit,
  accountId: string,
  cfDeployment: Deployment,
): Promise<number> {
  return octokit.rest.repos
    .createDeployment({
      ...cfDeploymentParams(accountId, cfDeployment),
      required_contexts: [],
    })
    .then(resolveDeploymentId)
}

type GithubDeploymentState =
  | 'error'
  | 'failure'
  | 'inactive'
  | 'in_progress'
  | 'queued'
  | 'pending'
  | 'success'

function createGitHubDeploymentStatus(
  octokit: InstanceType<typeof GitHub>,
  accountId: string,
  id: number,
  state: GithubDeploymentState,
  cfDeployment: Deployment,
): Promise<number> {
  return octokit.rest.repos
    .createDeploymentStatus({
      ...cfDeploymentParams(accountId, cfDeployment),
      deployment_id: id,
      state,
      environment_url: state === 'success' ? cfDeployment.url : undefined,
    })
    .then(resolveDeploymentId)
}

type DeploymentResult = Awaited<
  ReturnType<Octokit['rest']['repos']['createDeployment' | 'createDeploymentStatus']>
>

function resolveDeploymentId(result: DeploymentResult): number {
  if (result.status === 201) return result.data.id
  throw new GithubApiError(result.status, result.data.message)
}

type GithubDeploymentEnvironment = 'production' | 'staging' | 'qa'

type CommonGithubDeploymentParams = {
  owner: string
  repo: string
  ref: string
  task: string
  environment: GithubDeploymentEnvironment
  production_environment: boolean
  log_url: string
}

function cfDeploymentParams(
  accountId: string,
  { id, project_name, source, deployment_trigger, environment }: Deployment,
): CommonGithubDeploymentParams {
  const params = {
    owner: source.config.owner,
    repo: source.config.repo_name,
    ref: deployment_trigger.metadata.commit_hash,
    task: 'deploy',
    environment: githubEnvironmentFromDeployment(environment, deployment_trigger.metadata.branch),
    production_environment: environment === 'production',
    log_url: dashboardDeploymentUrl(accountId, project_name, id),
  }

  console.log({ params })

  return params
}

function githubEnvironmentFromDeployment(
  environment: string,
  branch: string,
): GithubDeploymentEnvironment {
  if (environment === 'production') return 'production'
  // @ts-expect-error GH API types are overly prescriptive
  return `preview (${branch})`
}

function githubDeployStateFromStage(name: StageName): GithubDeploymentState | undefined {
  switch (name) {
    case 'queued':
      return 'queued'
    case 'initialize':
      return 'in_progress'
  }
}

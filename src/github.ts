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

  async function deploy(deployment: Deployment): Promise<void> {
    id = await createGitHubDeployment(octokit, accountId, deployment)
  }

  async function updateState(stageName: StageName): Promise<void> {
    const state = githubDeployStateFromStage(stageName)
    if (!state || !id || !deployment) return

    await createGitHubDeploymentStatus(octokit, accountId, id, state, deployment)
  }

  return { onStart: deploy, onStageChange: updateState }
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
  return {
    owner: source.config.owner,
    repo: source.config.repo_name,
    ref: deployment_trigger.metadata.commit_hash,
    task: 'deploy',
    environment: githubEnvironmentFromDeployment(environment, deployment_trigger.metadata.branch),
    production_environment: environment === 'production',
    log_url: dashboardDeploymentUrl(accountId, project_name, id),
  }
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

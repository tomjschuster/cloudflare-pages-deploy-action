export type ApiResult<T> = {
  result: T
  success: boolean
  errors: ApiErrorEntry[] | null
  messages: string[]
}

export type ApiErrorEntry = {
  code: number
  message: string
}

export type Project = {
  name: string
  id: string
  created_on: string
  subdomain: string
  domains: string[]
  source: Source
  build_config: BuildConfig
  deployment_configs: Record<string, DeploymentConfig>
  latest_deployment: Deployment
  canonical_deployment: Deployment
}

type DeploymentConfig = {
  env_vars: Record<string, string> | null
}

export type Deployment = {
  id: string
  short_id: string
  project_id: string
  project_name: string
  environment: string
  url: string
  created_on: string
  modified_on: string
  latest_stage: Stage
  deployment_trigger: DeploymentTrigger
  stages: Stage[]
  build_config: BuildConfig
  source: Source
  env_vars: Record<string, string>
  aliases: string[] | null
}

export type Stage = {
  name: StageName
  started_on: string | null
  ended_on: string | null
  status: StageStatus
}

type KnownStageName = 'queued' | 'initialize' | 'clone_repo' | 'build' | 'deploy'

export type StageName = KnownStageName | string

type KnownStageStatus = 'idle' | 'active' | 'success' | 'failure'

export type StageStatus = KnownStageStatus | string

export type DeploymentTrigger = {
  type: string
  metadata: DeploymentTriggerMetadata
}

export type DeploymentTriggerMetadata = {
  branch: string
  commit_hash: string
  commit_message: string
}

export type BuildConfig = {
  build_command: string
  destination_dir: string
  root_dir: string
  web_analytics_tag: string | null
  web_analytics_token: string | null
}

export type Source = {
  type: string
  config: SourceConfig
}

export type SourceConfig = {
  owner: string
  repo_name: string
  production_branch: string
  pr_comments_enabled: boolean
  deployments_enabled?: boolean
}

export type StageLogsResult = {
  name: StageName
  started_on: string | null
  ended_on: string | null
  status: StageStatus
  start: number
  end: number
  total: number
  data: StageLog[]
}

export type StageLog = {
  id: number
  timestamp: string
  message: string
}

export type DeployHook = {
  hook_id: string
  name: string
  branch: string
  created_on: string
}

export type DeployHookResult = {
  id: string
}

export type DeploymentHandlers = {
  onStart: (deployment: Deployment) => Promise<void>
  onStageChange: (stageName: StageName) => Promise<void>
  onSuccess: () => Promise<void>
  onFailure: () => Promise<void>
}

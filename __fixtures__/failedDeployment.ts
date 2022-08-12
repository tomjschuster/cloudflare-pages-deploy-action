import { Deployment, DeploymentLogsResult } from '../src/types'

export const initialFailedDeployment: Deployment = {
  id: 'a50b60b9-ac32-4279-9e53-2ad913a94a03',
  short_id: 'a50b60b9',
  project_id: 'efbefa69-f960-4cb5-a435-38c3a6340ab1',
  project_name: 'example-project',
  environment: 'production',
  url: 'https://a50b60b9.example-project.pages.dev',
  created_on: '2022-02-02T01:26:03.212713Z',
  modified_on: '2022-02-02T01:31:35.429941Z',
  latest_stage: {
    name: 'queued',
    started_on: null,
    ended_on: null,
    status: 'idle',
  },
  deployment_trigger: {
    type: 'ad_hoc',
    metadata: {
      branch: 'main',
      commit_hash: 'd3b07384d113edec49eaa6238ad5ff00',
      commit_message: 'hello world',
    },
  },
  stages: [
    {
      name: 'queued',
      started_on: null,
      ended_on: null,
      status: 'idle',
    },
    {
      name: 'initialize',
      started_on: null,
      ended_on: null,
      status: 'idle',
    },
    {
      name: 'clone_repo',
      started_on: null,
      ended_on: null,
      status: 'idle',
    },
    {
      name: 'build',
      started_on: null,
      ended_on: null,
      status: 'idle',
    },
    {
      name: 'deploy',
      started_on: null,
      ended_on: null,
      status: 'idle',
    },
  ],
  build_config: {
    build_command: 'npm run build',
    destination_dir: 'out',
    root_dir: '',
    web_analytics_tag: null,
    web_analytics_token: null,
  },
  source: {
    type: 'github',
    config: {
      owner: 'example-owner',
      repo_name: 'example-repo',
      production_branch: 'main',
      pr_comments_enabled: false,
    },
  },
  env_vars: {},
  aliases: null,
}

export const failedLiveDeployment: Deployment = {
  id: 'a50b60b9-ac32-4279-9e53-2ad913a94a03',
  short_id: 'a50b60b9',
  project_id: 'efbefa69-f960-4cb5-a435-38c3a6340ab1',
  project_name: 'example-project',
  environment: 'production',
  url: 'https://a50b60b9.example-project.pages.dev',
  created_on: '2022-02-02T01:26:03.212713Z',
  modified_on: '2022-02-02T01:31:35.429941Z',
  latest_stage: {
    name: 'build',
    started_on: '2022-02-01T15:06:32.563318Z',
    ended_on: '2022-02-01T15:08:44.121893Z',
    status: 'failure',
  },
  deployment_trigger: {
    type: 'ad_hoc',
    metadata: {
      branch: 'main',
      commit_hash: 'd3b07384d113edec49eaa6238ad5ff00',
      commit_message: 'hello world',
    },
  },
  stages: [
    {
      name: 'queued',
      started_on: '2022-02-01T15:04:23.016698Z',
      ended_on: '2022-02-01T15:04:22.987058Z',
      status: 'success',
    },
    {
      name: 'initialize',
      started_on: '2022-02-01T15:04:22.987058Z',
      ended_on: '2022-02-01T15:06:30.987713Z',
      status: 'success',
    },
    {
      name: 'clone_repo',
      started_on: '2022-02-01T15:06:30.987713Z',
      ended_on: '2022-02-01T15:06:32.563318Z',
      status: 'success',
    },
    {
      name: 'build',
      started_on: '2022-02-01T15:06:32.563318Z',
      ended_on: '2022-02-01T15:08:44.121893Z',
      status: 'failure',
    },
    {
      name: 'deploy',
      started_on: null,
      ended_on: null,
      status: 'idle',
    },
  ],
  build_config: {
    build_command: 'npm run build',
    destination_dir: 'out',
    root_dir: '',
    web_analytics_tag: null,
    web_analytics_token: null,
  },
  source: {
    type: 'github',
    config: {
      owner: 'example-owner',
      repo_name: 'example-repo',
      production_branch: 'main',
      pr_comments_enabled: false,
    },
  },
  env_vars: {},
  aliases: null,
}

export const completeFailureQueuedLogs: DeploymentLogsResult = {
  total: 2,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:04:23.016698Z',
      line: 'Build is queued',
    },
    {
      ts: '2022-02-01T15:04:22.987058Z',
      line: 'Finished',
    },
  ],
}

export const activeFailureInitializeLogs: DeploymentLogsResult = {
  total: 1,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:04:22.987058Z',
      line: 'Initializing build environment. This may take up to a few minutes to complete',
    },
  ],
}

export const completeFailureInitializeLogs: DeploymentLogsResult = {
  total: 2,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:04:22.987058Z',
      line: 'Initializing build environment. This may take up to a few minutes to complete',
    },
    {
      ts: '2022-02-01T15:06:30.987713Z',
      line: 'Success: Finished initializing build environment',
    },
  ],
}

export const activeFailureCloneRepoLogs: DeploymentLogsResult = {
  total: 1,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:06:30.987713Z',
      line: 'Cloning repository...',
    },
  ],
}

export const completeFailureCloneRepoLogs: DeploymentLogsResult = {
  total: 2,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:06:30.987713Z',
      line: 'Cloning repository...',
    },
    {
      ts: '2022-02-01T15:06:32.563318Z',
      line: 'Success: Finished cloning repository files',
    },
  ],
}

export const activeFailureBuildLogs: DeploymentLogsResult = {
  total: 1,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:06:32.745219Z',
      line: 'Installing dependencies',
    },
  ],
}

export const failedFailureBuildLogs: DeploymentLogsResult = {
  total: 2,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:06:32.745219Z',
      line: 'Installing dependencies',
    },
    {
      ts: '2022-02-01T03:29:25.541636Z',
      line: 'Failed: build command exited with code: 1',
    },
  ],
}

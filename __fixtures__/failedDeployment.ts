import { Deployment, StageLogsResult } from '../src/types'

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

export const completeFailureQueuedLogs: StageLogsResult = {
  name: 'queued',
  started_on: '2022-02-01T15:04:23.016698Z',
  ended_on: '2022-02-01T15:04:22.987058Z',
  status: 'success',
  start: 0,
  end: 1,
  total: 2,
  data: [
    {
      id: 0,
      timestamp: '2022-02-01T15:04:23.016698Z',
      message: 'Build is queued',
    },
    {
      id: 1,
      timestamp: '2022-02-01T15:04:22.987058Z',
      message: 'Finished',
    },
  ],
}

export const activeFailureInitializeLogs: StageLogsResult = {
  name: 'initialize',
  started_on: '2022-02-01T15:04:22.987058Z',
  ended_on: null,
  status: 'active',
  start: 0,
  end: 0,
  total: 1,
  data: [
    {
      id: 0,
      timestamp: '2022-02-01T15:04:22.987058Z',
      message: 'Initializing build environment. This may take up to a few minutes to complete',
    },
  ],
}

export const completeFailureInitializeLogs: StageLogsResult = {
  name: 'initialize',
  started_on: '2022-02-01T15:04:22.987058Z',
  ended_on: '2022-02-01T15:06:30.987713Z',
  status: 'success',
  start: 0,
  end: 1,
  total: 2,
  data: [
    {
      id: 0,
      timestamp: '2022-02-01T15:04:22.987058Z',
      message: 'Initializing build environment. This may take up to a few minutes to complete',
    },
    {
      id: 1,
      timestamp: '2022-02-01T15:06:30.987713Z',
      message: 'Success: Finished initializing build environment',
    },
  ],
}

export const activeFailureCloneRepoLogs: StageLogsResult = {
  name: 'clone_repo',
  started_on: '2022-02-01T15:06:30.987713Z',
  ended_on: null,
  status: 'active',
  start: 0,
  end: 0,
  total: 1,
  data: [
    {
      id: 0,
      timestamp: '2022-02-01T15:06:30.987713Z',
      message: 'Cloning repository...',
    },
  ],
}

export const completeFailureCloneRepoLogs: StageLogsResult = {
  name: 'clone_repo',
  started_on: '2022-02-01T15:06:30.987713Z',
  ended_on: '2022-02-01T15:06:32.563318Z',
  status: 'success',
  start: 0,
  end: 1,
  total: 2,
  data: [
    {
      id: 0,
      timestamp: '2022-02-01T15:06:30.987713Z',
      message: 'Cloning repository...',
    },
    {
      id: 1,
      timestamp: '2022-02-01T15:06:32.563318Z',
      message: 'Success: Finished cloning repository files',
    },
  ],
}

export const activeFailureBuildLogs: StageLogsResult = {
  name: 'build',
  started_on: '2022-02-01T15:06:32.563318Z',
  ended_on: null,
  status: 'active',
  start: 0,
  end: 0,
  total: 1,
  data: [
    {
      id: 0,
      timestamp: '2022-02-01T15:06:32.745219Z',
      message: 'Installing dependencies',
    },
  ],
}

export const failedFailureBuildLogs: StageLogsResult = {
  name: 'build',
  started_on: '2022-02-01T15:06:32.563318Z',
  ended_on: '2022-02-01T15:08:44.121893Z',
  status: 'failure',
  start: 0,
  end: 1,
  total: 2,
  data: [
    {
      id: 0,
      timestamp: '2022-02-01T15:06:32.745219Z',
      message: 'Installing dependencies',
    },
    {
      id: 1,
      timestamp: '2022-02-01T03:29:25.541636Z',
      message: 'Failed: build command exited with code: 1',
    },
  ],
}

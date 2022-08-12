import { Deployment, DeploymentLogsResult } from '../src/types'

export const initialLiveDeploymentUnexpectedStage: Deployment = {
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
      name: 'test',
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

export const completeLiveDeploymentUnexpectedStage: Deployment = {
  id: 'a50b60b9-ac32-4279-9e53-2ad913a94a03',
  short_id: 'a50b60b9',
  project_id: 'efbefa69-f960-4cb5-a435-38c3a6340ab1',
  project_name: 'example-project',
  environment: 'production',
  url: 'https://a50b60b9.example-project.pages.dev',
  created_on: '2022-02-02T01:26:03.212713Z',
  modified_on: '2022-02-02T01:31:35.429941Z',
  latest_stage: {
    name: 'deploy',
    started_on: '2022-02-01T15:08:44.349227Z',
    ended_on: '2022-02-01T15:08:50.567074Z',
    status: 'success',
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
      name: 'test',
      started_on: '2022-02-01T15:06:32.563318Z',
      ended_on: '2022-02-01T15:07:15.121893Z',
      status: 'success',
    },
    {
      name: 'build',
      started_on: '2022-02-01T15:07:15.121893Z',
      ended_on: '2022-02-01T15:08:44.349227Z',
      status: 'success',
    },
    {
      name: 'deploy',
      started_on: '2022-02-01T15:08:44.349227Z',
      ended_on: '2022-02-01T15:08:50.567074Z',
      status: 'success',
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

export const activeQueuedLogsUnexpectedStage: DeploymentLogsResult = {
  total: 1,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:04:23.016698Z',
      line: 'Build is queued',
    },
  ],
}

export const completeQueuedLogsUnexpectedStage: DeploymentLogsResult = {
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

export const activeInitializeLogsUnexpectedStage: DeploymentLogsResult = {
  total: 1,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:04:22.987058Z',
      line: 'Initializing build environment. This may take up to a few minutes to complete',
    },
  ],
}

export const completeInitializeLogsUnexpectedStage: DeploymentLogsResult = {
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

export const activeCloneRepoLogsUnexpectedStage: DeploymentLogsResult = {
  total: 1,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:06:30.987713Z',
      line: 'Cloning repository...',
    },
  ],
}

export const completeCloneRepoLogsUnexpectedStage: DeploymentLogsResult = {
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

export const activeTestLogsUnexpectedStage: DeploymentLogsResult = {
  total: 1,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:06:32.745219Z',
      line: 'Running tests',
    },
  ],
}

export const completeTestLogsUnexpectedStage: DeploymentLogsResult = {
  total: 2,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:06:32.563318Z',
      line: 'Running tests',
    },
    {
      ts: '2022-02-01T15:07:15.121893Z',
      line: 'Ran all test suites.',
    },
  ],
}

export const activeBuildLogsUnexpectedStage: DeploymentLogsResult = {
  total: 1,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:07:15.121893Z',
      line: 'Installing dependencies',
    },
  ],
}

export const completeBuildLogsUnexpectedStage: DeploymentLogsResult = {
  total: 2,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:07:15.121893Z',
      line: 'Installing dependencies',
    },
    {
      ts: '2022-02-01T15:08:43.503367Z',
      line: 'Validating asset output directory',
    },
  ],
}

export const activeDeployLogsUnexpectedStage: DeploymentLogsResult = {
  total: 1,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:08:44.349227Z',
      line: "Deploying your site to Cloudflare's global network...",
    },
  ],
}

export const completeDeployLogsUnexpectedStage: DeploymentLogsResult = {
  total: 2,
  includes_container_logs: true,
  data: [
    {
      ts: '2022-02-01T15:08:44.349227Z',
      line: "Deploying your site to Cloudflare's global network...",
    },
    {
      ts: '2022-02-01T15:08:50.567074Z',
      line: 'Success: Your site was deployed!',
    },
  ],
}

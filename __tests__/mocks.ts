import { Deployment, KnownStageName, KnownStageStatus, Project, Stage } from '../src/types'
import { isStageComplete } from '../src/utils'

const baseDeployemnt: Deployment = {
  id: 'a50b60b9-ac32-4279-9e53-2ad913a94a03',
  short_id: 'a50b60b9',
  project_id: 'efbefa69-f960-4cb5-a435-38c3a6340ab1',
  project_name: 'example-project',
  environment: 'production',
  url: 'https://a50b60b9.example-project.pages.dev',
  created_on: '2022-02-01T15:04:15.573958Z',
  modified_on: '2022-02-01T15:04:19.978622Z',
  latest_stage: {
    name: 'deploy',
    started_on: '2022-02-01T15:08:44.121893Z',
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
      name: 'build',
      started_on: '2022-02-01T15:06:32.563318Z',
      ended_on: '2022-02-01T15:08:44.121893Z',
      status: 'success',
    },
    {
      name: 'deploy',
      started_on: '2022-02-01T15:08:44.121893Z',
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

export const initialDeployment = mockDeployment('queued', 'idle')
export const completedDeployment = mockDeployment('deploy', 'success')
export const failedDeployment = mockDeployment('build', 'failure')

export function mockDeployment(
  name?: KnownStageName,
  status?: KnownStageStatus,
  overrides?: Partial<Deployment>,
): Deployment {
  if (!name || !status) return baseDeployemnt

  const [stages, latest_stage] = baseDeployemnt.stages.reduce<[Stage[], Stage | null]>(
    ([stages, latest_stage], s) => {
      if (latest_stage) {
        stages.push({ ...s, started_on: null, ended_on: null, status: 'idle' })
        return [stages, latest_stage]
      }

      if (s.name === name) {
        const stage = setEndedOn(setStartedOn({ ...s, status }))

        stages.push(stage)
        return [stages, stage]
      }

      stages.push(s)
      return [stages, null]
    },
    [[], null],
  )

  if (!latest_stage) throw new Error('Invalid mock stage name')

  return { ...baseDeployemnt, latest_stage, stages, ...overrides }
}

function setStartedOn(stage: Stage): Stage {
  return { ...stage, started_on: stage.name === 'idle' ? null : stage.started_on }
}

function setEndedOn(stage: Stage): Stage {
  return { ...stage, ended_on: isStageComplete(stage) ? stage.ended_on : null }
}

export const queuedLogs = [
  {
    ts: '2022-02-01T15:04:23.016698Z',
    line: 'Build is queued',
  },
  {
    ts: '2022-02-01T15:04:23.016698Z',
    line: 'Build is queued',
  },
  {
    ts: '2022-02-01T15:04:22.334870Z',
    line: 'Finished',
  },
]

export const initializeLogs = [
  {
    ts: '2022-02-01T15:04:22.987058Z',
    line: 'Initializing build environment. This may take up to a few minutes to complete',
  },
  {
    ts: '2022-02-01T15:04:22.987058Z',
    line: 'Initializing build environment. This may take up to a few minutes to complete',
  },
  {
    ts: '2022-02-01T15:06:30.987713Z',
    line: 'Success: Finished initializing build environment',
  },
]

export const cloneRepoLogs = [
  {
    ts: '2022-02-01T15:06:30.987713Z',
    line: 'Cloning repository...',
  },
  {
    ts: '2022-02-01T15:06:30.987713Z',
    line: 'Cloning repository...',
  },
  {
    ts: '2022-02-01T15:06:32.563318Z',
    line: 'Success: Finished cloning repository files',
  },
]

export const buildLogs = [
  {
    ts: '2022-02-01T15:06:32.745219Z',
    line: 'Installing dependencies',
  },
  {
    ts: '2022-02-01T15:06:32.745219Z',
    line: 'Installing dependencies',
  },
  {
    ts: '2022-02-01T15:06:32.745219Z',
    line: 'Installing dependencies',
  },
  {
    ts: '2022-02-01T15:08:43.503367Z',
    line: 'Validating asset output directory',
  },
  {
    ts: '2022-02-01T15:08:44.121893Z',
    line: "Deploying your site to Cloudflare's global network...",
  },
]

export const deployLogs = [
  {
    ts: '2022-02-01T15:08:44.121893Z',
    line: "Deploying your site to Cloudflare's global network...",
  },
  {
    ts: '2022-02-01T15:08:50.567074Z',
    line: 'Success: Your site was deployed!',
  },
]

export const project: Project = {
  id: '67f2710f-895f-4eab-b5ad-e65f8b2edb31',
  name: 'example-project',
  subdomain: 'example-project.pages.dev',
  domains: ['example-project.pages.dev'],
  source: {
    type: 'github',
    config: {
      owner: 'example-owner',
      repo_name: 'example-project',
      production_branch: 'main',
      pr_comments_enabled: true,
      deployments_enabled: false,
    },
  },
  build_config: {
    build_command: 'npm run build',
    destination_dir: 'out',
    root_dir: '',
  },
  deployment_configs: {
    preview: {
      env_vars: null,
    },
    production: {
      env_vars: null,
    },
  },
  latest_deployment: {
    id: 'e0041734-7f4f-431c-ae20-89ccca4d78bc',
    short_id: 'e0041734',
    project_id: '67f2710f-895f-4eab-b5ad-e65f8b2edb31',
    project_name: 'example-project',
    environment: 'production',
    url: 'https://e0041734.example-project.pages.dev',
    created_on: '2022-01-30T04:51:09.741793Z',
    modified_on: '2022-01-30T04:55:28.520166Z',
    latest_stage: {
      name: 'deploy',
      started_on: '2022-01-30T04:55:15.662927Z',
      ended_on: '2022-01-30T04:55:28.520166Z',
      status: 'success',
    },
    deployment_trigger: {
      type: 'ad_hoc',
      metadata: {
        branch: 'main',
        commit_hash: '07860801d2f2e9034234f72fd83e3ee8a1f158cb',
        commit_message: 'some commit',
      },
    },
    stages: [
      {
        name: 'queued',
        started_on: '2022-01-30T04:51:10.058301Z',
        ended_on: '2022-01-30T04:51:10.044601Z',
        status: 'success',
      },
      {
        name: 'initialize',
        started_on: '2022-01-30T04:51:10.044601Z',
        ended_on: '2022-01-30T04:53:04.720815Z',
        status: 'success',
      },
      {
        name: 'clone_repo',
        started_on: '2022-01-30T04:53:04.720815Z',
        ended_on: '2022-01-30T04:53:07.653065Z',
        status: 'success',
      },
      {
        name: 'build',
        started_on: '2022-01-30T04:53:07.653065Z',
        ended_on: '2022-01-30T04:55:15.662927Z',
        status: 'success',
      },
      {
        name: 'deploy',
        started_on: '2022-01-30T04:55:15.662927Z',
        ended_on: '2022-01-30T04:55:28.520166Z',
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
        repo_name: 'example-project',
        production_branch: 'main',
        pr_comments_enabled: false,
      },
    },
    env_vars: {},
    aliases: null,
  },
  canonical_deployment: {
    id: 'b05a2537-4ddc-4c61-b1f8-ec9bb699b958',
    short_id: 'b05a2537',
    project_id: '67f2710f-895f-4eab-b5ad-e65f8b2edb31',
    project_name: 'example-project',
    environment: 'production',
    url: 'https://b05a2537.example-project.pages.dev',
    created_on: '2022-01-30T04:51:09.741793Z',
    modified_on: '2022-01-30T04:55:28.520166Z',
    latest_stage: {
      name: 'deploy',
      started_on: '2022-01-30T04:55:15.662927Z',
      ended_on: '2022-01-30T04:55:28.520166Z',
      status: 'success',
    },
    deployment_trigger: {
      type: 'ad_hoc',
      metadata: {
        branch: 'main',
        commit_hash: '52c1ea321562461027ee6c66bfd98b9e017e0ffd',
        commit_message: 'some commit',
      },
    },
    stages: [
      {
        name: 'queued',
        started_on: '2022-01-30T04:51:10.058301Z',
        ended_on: '2022-01-30T04:51:10.044601Z',
        status: 'success',
      },
      {
        name: 'initialize',
        started_on: '2022-01-30T04:51:10.044601Z',
        ended_on: '2022-01-30T04:53:04.720815Z',
        status: 'success',
      },
      {
        name: 'clone_repo',
        started_on: '2022-01-30T04:53:04.720815Z',
        ended_on: '2022-01-30T04:53:07.653065Z',
        status: 'success',
      },
      {
        name: 'build',
        started_on: '2022-01-30T04:53:07.653065Z',
        ended_on: '2022-01-30T04:55:15.662927Z',
        status: 'success',
      },
      {
        name: 'deploy',
        started_on: '2022-01-30T04:55:15.662927Z',
        ended_on: '2022-01-30T04:55:28.520166Z',
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
        repo_name: 'example-project',
        production_branch: 'main',
        pr_comments_enabled: false,
      },
    },
    env_vars: {},
    aliases: null,
  },
  created_on: '2022-01-26T06:28:38.58113Z',
}

import { Project } from '../src/types'

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

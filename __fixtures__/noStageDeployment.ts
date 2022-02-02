import { Deployment } from '../src/types'

export const noStageDeployment: Deployment = {
  id: 'a50b60b9-ac32-4279-9e53-2ad913a94a03',
  short_id: 'a50b60b9',
  project_id: 'efbefa69-f960-4cb5-a435-38c3a6340ab1',
  project_name: 'example-project',
  environment: 'production',
  url: 'https://a50b60b9.example-project.pages.dev',
  created_on: '2022-02-02T01:26:03.212713Z',
  modified_on: '2022-02-02T01:31:35.429941Z',
  latest_stage: null,
  deployment_trigger: {
    type: 'ad_hoc',
    metadata: {
      branch: 'main',
      commit_hash: 'd3b07384d113edec49eaa6238ad5ff00',
      commit_message: 'hello world',
    },
  },
  stages: [],
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

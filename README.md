<p align="center">
  <a href="https://github.com/tomjschuster/cloudflare-pages-deploy-action/actions/workflows/test.yml?query=branch%3Amain"><img alt="typescript-action status" src="https://github.com/tomjschuster/cloudflare-pages-deploy-action/workflows/build-test/badge.svg?branch=main"></a>
  <a href="https://coveralls.io/github/tomjschuster/cloudflare-pages-deploy-action?branch=main"><img alt="Coverage Status" src="https://coveralls.io/repos/github/tomjschuster/cloudflare-pages-deploy-action/badge.svg?branch=main"/></a>
</p>

# Cloudflare Pages Deploy Action

Deploys your [Cloudflare Pages](https://pages.cloudflare.com/) project, enabling you to integrate Pages into your existing CI pipeline using the following features:

- Deploy your production branch or any other branch
- Deploy preview environments for every pull request
- Defer deployment until other stages/steps have passed (e.g. tests)
- Perform actions after successful deployment (e.g. purge cache)
- Track deployment status from within GitHub Actions
- Create GitHub deployments for your Pages deployments

![Cloudflare Page deploying from GitHub Actions](./assets/action-example.png)

## Important Limitations

The Cloudflare v4 API [`Create deployment`](https://api.cloudflare.com/#pages-deployment-create-deployment) endpoint only supports creating production deployments. This action achieves triggering preview deployments by creating, triggering and then deleting a [Deploy Hook](https://developers.cloudflare.com/pages/platform/deploy-hooks) using **undocumented endpoints**. This means:

- If hook deletion fails, you will need to delete it manually. The action logs should indicate when this has happened.
- Preview environments deployments through this action could break (production deployments are built on the official API).

If non-production deployments are ever supported by `Create deployment` in the future, this action can be updated to stop relying on creating/deleting deploy hooks to remove these limitations. If you are not comfortable with this action creating/deleting deploy hooks on every preview deployment using unsupported endpoints, please look at some official alternatives below.

## Other Pages deployment options

Cloudflare's official [Pages integrated GitHub application](https://github.com/apps/cloudflare-pages) supports [preview deployments](https://developers.cloudflare.com/pages/platform/preview-deployments) for pull requests in addition to production deploys. The status of these deploys will be associated with the proper GitHub branch. However, deployments will always be triggered immediately on any push to your production branch, so there is no way to defer deployment until other steps (such as tests) have passed.

Cloudflare pages can also be deployed using [Deploy Hooks](https://developers.cloudflare.com/pages/platform/deploy-hooks). Hooks can be created for deploying to specific branches from your Pages project's Settings. If you pause repository deployments, you can use hooks to defer deploying branches until previous steps have passed; however this also disables preview deployments, and the deployments won't be tracked by your pipeline.

If you are looking to perform actions after a Pages deploy completes (such as purging caches), [Cloudflare Pages Await](https://github.com/marketplace/actions/cloudflare-pages-await) tracks deployments in a GitHub action and also creates a GitHub Deployment associated with your production environment or pull request. This action can be used to track deployments from the official application and deploy hooks.

## Inputs

Be sure to use a secure method such as [Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) for storing/accessing Cloudflare API Key:

| Name         |          | Description                                                                                                                                                                                                                                                                                                                            |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| account-id   | Required | Your Cloudflare account id. This is the id in the URL of Cloudflare's dashboard. You can also run the command `wrangler whoami` .                                                                                                                                                                                                      |
| api-key      | yes      | Your [ Cloudflare Global API Key ] ( https://developers.cloudflare.com/api/keys#view-your-api-key ) (Pages does not accept API tokens).                                                                                                                                                                                                |
| email        | yes      | The email associated with your Cloudflare account.                                                                                                                                                                                                                                                                                     |
| project-name | yes      | The name of your Pages project.                                                                                                                                                                                                                                                                                                        |
| production   | no\*     | If true, triggers a production Pages deployment. Either `production`, `preview` or `branch` must be provided (but only one).                                                                                                                                                                                                           |
| preview      | no\*     | If true, triggers a Pages deployment for the branch of the current pull request. Either `production`, `preview` or `branch` must be provided (but only one)                                                                                                                                                                            |
| branch       | no\*     | Triggers a Pages preview deployment for the provided branch. Either `production`, `preview` or `branch` must be provided (but only one)                                                                                                                                                                                                |
| github-token | no       | GitHub access token. If provided, triggers a GitHub deployment with the status of the Pages deployment. If using the Actions provided [`GITHUB_TOKEN`](https://docs.github.com/en/actions/security-guides/automatic-token-authentication), deployments will only work if the current repo is associated with the target Pages project. |

## Outputs

| Name           | Description                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| deployment-id  | Unique identifier of the deployment created by the action.                                                                                             |
| deployment-url | Even though this action deploys the production branch, this will be the the build-specific pages URL (e.g. `https://a6975138.example-site.pages.dev`). |

## Example

Deploy your production environment:

```yaml
name: Deploy to production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: tomjschuster/cloudflare-pages-deploy-action@v0
        with:
          account-id: '${{ env.CF_ACCOUNT_ID }}'
          project-name: '${{ env.PAGES_PROJECT_NAME }}'
          api-key: '${{ secrets.CF_GLOBAL_APIKEY }}'
          email: '${{ secrets.CF_EMAIL }}'
          production: true
        env:
          CF_ACCOUNT_ID: 752b6dba29604163bde5b5b90f042f62
          PAGES_PROJECT_NAME: my-pages-project
```

Deploy preview environments for all pull requests:

```yaml
name: Deploy preview

on:
  pull_request:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: tomjschuster/cloudflare-pages-deploy-action@v0
        with:
          account-id: '${{ env.CF_ACCOUNT_ID }}'
          project-name: '${{ env.PAGES_PROJECT_NAME }}'
          api-key: '${{ secrets.CF_GLOBAL_APIKEY }}'
          email: '${{ secrets.CF_EMAIL }}'
          preview: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
        env:
          CF_ACCOUNT_ID: 752b6dba29604163bde5b5b90f042f62
          PAGES_PROJECT_NAME: my-pages-project
```

Deploy any branch

```yaml
name: Deploy to environments

on:
  push:
    branches:
      - qa
      - staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: tomjschuster/cloudflare-pages-deploy-action@v0
        with:
          account-id: '${{ env.CF_ACCOUNT_ID }}'
          project-name: '${{ env.PAGES_PROJECT_NAME }}'
          api-key: '${{ secrets.CF_GLOBAL_APIKEY }}'
          email: '${{ secrets.CF_EMAIL }}'
          branch: ${{ github.ref_name }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
        env:
          CF_ACCOUNT_ID: 752b6dba29604163bde5b5b90f042f62
          PAGES_PROJECT_NAME: my-pages-project
```

Or combine all deploys in a single job:

```yaml
name: CI

on:
  push:
    branches:
      - main
      - staging
      - qa
  pull_request:

  env:
    CF_ACCOUNT_ID: 752b6dba29604163bde5b5b90f042f62
    PAGES_PROJECT_NAME: my-pages-project

  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy preview
        if: ${{ github.event_name == 'pull_request' }}
        uses: tomjschuster/cloudflare-pages-deploy-action@v0
        with:
          account-id: '${{ env.CF_ACCOUNT_ID }}'
          project-name: '${{ env.PAGES_PROJECT_NAME }}'
          api-key: '${{ secrets.CF_GLOBAL_APIKEY }}'
          email: '${{ secrets.CF_EMAIL }}'
          preview: true
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Deploy qa/staging
        if: ${{ contains(fromJson('["refs/heads/qa", "refs/heads/staging"]'), github.ref) && github.event_name == 'push' }}
        uses: tomjschuster/cloudflare-pages-deploy-action@v0
        with:
          account-id: '${{ env.CF_ACCOUNT_ID }}'
          project-name: '${{ env.PAGES_PROJECT_NAME }}'
          api-key: '${{ secrets.CF_GLOBAL_APIKEY }}'
          email: '${{ secrets.CF_EMAIL }}'
          branch: ${{ github.ref_name }}
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Deploy production
        if: ${{ github.ref == 'refs/heads/main' && github.event_name == 'push' }}
        uses: tomjschuster/cloudflare-pages-deploy-action@v0
        with:
          account-id: '${{ env.CF_ACCOUNT_ID }}'
          project-name: '${{ env.PAGES_PROJECT_NAME }}'
          api-key: '${{ secrets.CF_GLOBAL_APIKEY }}'
          email: '${{ secrets.CF_EMAIL }}'
          production: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE).

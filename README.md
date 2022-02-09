<p align="center">
  <a href="https://github.com/tomjschuster/cloudflare-pages-deploy-action/actions/workflows/test.yml?query=branch%3Amain"><img alt="typescript-action status" src="https://github.com/tomjschuster/cloudflare-pages-deploy-action/workflows/build-test/badge.svg?branch=main"></a>
  <a href="https://coveralls.io/github/tomjschuster/cloudflare-pages-deploy-action?branch=main"><img alt="Coverage Status" src="https://coveralls.io/repos/github/tomjschuster/cloudflare-pages-deploy-action/badge.svg?branch=main"/></a>
</p>

# Cloudflare Pages Deploy Action

Triggers a [Cloudflare Pages](https://pages.cloudflare.com/) deployment for a project's production branch through the [Cloudflare v4 API](https://api.cloudflare.com/) and tracks the progress of the deployment across all stages.

![Cloudflare Page deploying from GitHub Actions](./assets/action-example.png)

## Current Limitations

- Because the Cloudflare v4 API [`Create deployment`](https://api.cloudflare.com/#pages-deployment-create-deployment) endpoint only supports creating production deployments, **this action always deploys your production branch**. Therefore, this action should only be used on pushes to the branch configured as your Pages project's **production branch** (`main`, by default).
- This action does not create any preview deployments.
- This action does not create any comments on any pull requests.
- This action does not upload any builds to Cloudflare, it simply triggers a Pages deployment, which builds and deploys your site from Cloudflare's servers. Cloudflare does not currently provide anyway to upload assets directly to a Pages site. (This also means it is not technically necessary to have a separate build step for this action to succeed.)

### Alternatives

Cloudflare's official [Pages integrated GitHub application](https://github.com/apps/cloudflare-pages) supports [preview deployments](https://developers.cloudflare.com/pages/platform/preview-deployments) for pull requests in addition to production deploys. Following the [Getting Started guide](https://developers.cloudflare.com/pages/get-started) for GitHub will enable this by default. The status of these deploys will be associated with the proper GitHub branch, however, the deployments will always be triggered immediately on any push to your production branch or pull request and cannot be integrated into any existing CI flows (e.g. there's no way to defer a production deploy until other actions have passed).

Cloudflare pages can also be deployed using [Deploy Hooks](https://developers.cloudflare.com/pages/platform/deploy-hooks). Hooks can be created for deploying to specific branches from your Pages project's Settings. Hooks can be integrated an existing CI flows for specific branches (e.g. production, staging), however they will not create any checks associated with your production branch or any pull request so there will be no feedback about the status of the build the on your production branch or pull requests. Similar to this action's limitations, hooks cannot be used for preview environments for all pull requests.

If you are okay with the above limitations and prefer to use this action over the official Cloudflare alternatives, follow the instructions below to configure your action.

## Inputs

All inputs are required. It is strongly recommended that you use [Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) for storing/accessing these values:

| Name         | Description                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| account-id   | Your Cloudflare account id. This is the id in the URL of Cloudflare's dashboard. You can also run the command `wrangler whoami`.   |
| api-key      | Your [Cloudflare Global API Key](https://developers.cloudflare.com/api/keys#view-your-api-key) (Pages does not accept API tokens). |
| email        | The email associated with your Cloudflare account.                                                                                 |
| project-name | The name of your Pages project.                                                                                                    |

## Outputs

| Name           | Description                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| deployment-id  | Unique identifier of the deployment created by the action.                                                                                             |
| deployment-url | Even though this action deploys the production branch, this will be the the build-specific pages URL (e.g. `https://a6975138.example-site.pages.dev`). |

## Example

Add a workflow (`.github/workflows/deploy-production.yml`):

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
      - uses: tomjschuster/cloudflare-pages-deploy-action/v0
        with:
          account-id: '${{ secrets.CF_ACCOUNT_ID }}'
          api-key: '${{ secrets.CF_GLOBAL_APIKEY }}'
          email: '${{ secrets.CF_EMAIL }}'
          project-name: '${{ env.PAGES_PROJECT_NAME }}'
        env:
          PAGES_PROJECT_NAME: my-pages-project
```

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE).

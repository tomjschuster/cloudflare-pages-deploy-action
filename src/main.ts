import { setFailed } from '@actions/core'
import { projectDashboardUrl, run } from './run'

try {
  run()
} catch (e) {
  setFailed(e instanceof Error ? e.message : `${e}`)
  console.log(
    `There was an unexpected error. It's possible that your Cloudflare Pages deploy is still in progress or was successfull. See ${projectDashboardUrl()} for more details.`,
  )
}

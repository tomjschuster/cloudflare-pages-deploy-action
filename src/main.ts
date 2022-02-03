import { endGroup, setFailed } from '@actions/core'
import { run } from './run'

run().catch((e) => {
  endGroup()

  setFailed(e instanceof Error ? e.message : `${e}`)

  console.log(
    `\nThere was an unexpected error. It's possible that your Cloudflare Pages deploy is still in progress or was successful. Go to https://dash.cloudflare.com and visit your Pages dashboard for more details.`,
  )

  return Promise.reject(e)
})

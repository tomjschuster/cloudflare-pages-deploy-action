import { endGroup, setFailed } from '@actions/core'
import { run } from './run'

run().catch((e) => {
  endGroup()

  setFailed(e instanceof Error ? e.message : `${e}`)

  console.log(
    `\nThere was an unexpected error. It's possible that your Cloudflare Pages deploy is still in progress or was successful. Go to your Pages dashboard through https://dash.cloudflare.com for more details.`,
  )

  return Promise.reject(e)
})

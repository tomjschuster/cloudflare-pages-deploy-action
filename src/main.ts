import { setFailed } from '@actions/core'
import { run } from './run'

try {
  run()
} catch (e) {
  setFailed(e instanceof Error ? e.message : `${e}`)
}

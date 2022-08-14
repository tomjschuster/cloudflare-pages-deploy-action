import { debug, info } from '@actions/core'
import { DeploymentLog } from './types'

type EnqueueFun = (log: DeploymentLog) => void
type PeekFn = (timestamp?: string) => number
type FlushFn = (timestamp?: string) => number

export type Logger = {
  enqueue: EnqueueFun
  peek: PeekFn
  flush: FlushFn
}

export function createLogger(): Logger {
  const logs: DeploymentLog[] = []

  function enqueue(log: DeploymentLog): void {
    logs.push(log)
  }

  function peek(until?: string): number {
    const currentLength = logs.length
    const untilDate = until ? new Date(until) : undefined

    const outsideWindowIndex = untilDate
      ? logs.findIndex(({ ts }) => new Date(ts) >= untilDate)
      : -1

    return outsideWindowIndex === -1 ? currentLength : outsideWindowIndex
  }

  function flush(until?: string): number {
    const count = peek(until)

    debug(`[deploy.ts] flushing ${count} of ${logs.length} logs`)
    logs.splice(0, count).forEach(({ line }) => info(line))
    debug(`[deploy.ts] remaining logs:\n${JSON.stringify(logs)}`)

    return count
  }

  return { enqueue, peek, flush }
}

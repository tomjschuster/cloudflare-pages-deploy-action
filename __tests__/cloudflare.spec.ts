import * as ActionsCore from '@actions/core'
import FormData from 'form-data'
import { AddressInfo } from 'net'
import fetch from 'node-fetch'
import WebSocket from 'ws'
import createPagesSdk, { PagesSdk } from '../src/cloudflare'
import { ApiResult } from '../src/types'
import { wait } from '../src/utils'
import { buildLogs } from './mocks'

const success: ApiResult<null> = {
  result: null,
  success: true,
  errors: [],
  messages: [],
}

const failure: ApiResult<null> = {
  result: null,
  success: false,
  errors: [{ code: 8000000, message: 'An unknown error occurred' }],
  messages: [],
}

function mockCfFetchSuccess<T>(result: T): void {
  ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: jest.fn(() => Promise.resolve({ success: true, result: result })),
  })
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(() =>
    Promise.resolve({ ok: true, json: jest.fn(() => Promise.resolve(success)) }),
  ),
}))

describe('createSdk', () => {
  let sdk: PagesSdk
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()

    sdk = createPagesSdk({
      accountId: '5790cddd-6172-4135-b275-2a64c49167d7',
      apiKey: '076758732de5497881a1cece814ff4faee9ab',
      email: 'name@example.com',
      projectName: 'example-project',
    })

    jest.spyOn(ActionsCore, 'info').mockImplementation(() => undefined)
    jest.spyOn(ActionsCore, 'debug').mockImplementation(() => undefined)
    errorSpy = jest.spyOn(ActionsCore, 'error').mockImplementation(() => undefined)
  })

  const expectedBaseUrl =
    'https://api.cloudflare.com/client/v4/accounts/5790cddd-6172-4135-b275-2a64c49167d7/pages/projects/example-project'

  const expectedHeaders = {
    'X-Auth-Email': 'name@example.com',
    'X-Auth-Key': '076758732de5497881a1cece814ff4faee9ab',
  }

  it('calls Get Project', async () => {
    await sdk.getProject()
    expect(fetch).toHaveBeenCalledWith(expectedBaseUrl, {
      headers: expectedHeaders,
      method: 'GET',
    })
  })

  it('calls Create Deployment', async () => {
    await sdk.createDeployment()
    expect(fetch).toHaveBeenCalledWith(`${expectedBaseUrl}/deployments`, {
      headers: expectedHeaders,
      method: 'POST',
    })
  })

  it('calls Create Deployment when production branch provided', async () => {
    const branch = 'main'

    mockCfFetchSuccess({ source: { config: { production_branch: 'main' } } })
    mockCfFetchSuccess(success)

    await sdk.createDeployment(branch)

    expect(fetch).toHaveBeenCalledTimes(2)

    expect(fetch).toHaveBeenNthCalledWith(1, expectedBaseUrl, {
      headers: expectedHeaders,
      method: 'GET',
    })

    expect(fetch).toHaveBeenNthCalledWith(2, `${expectedBaseUrl}/deployments`, {
      headers: expectedHeaders,
      method: 'POST',
    })
  })

  it('calls Create Deployment when non-production branch provided', async () => {
    const branch = 'foo'

    mockCfFetchSuccess({ source: { config: { production_branch: 'main' } } })
    mockCfFetchSuccess(success)

    await sdk.createDeployment(branch)

    expect(fetch).toHaveBeenCalledTimes(2)

    expect(fetch).toHaveBeenNthCalledWith(1, expectedBaseUrl, {
      headers: expectedHeaders,
      method: 'GET',
    })

    expect(fetch).toHaveBeenNthCalledWith(2, `${expectedBaseUrl}/deployments`, {
      headers: expectedHeaders,
      method: 'POST',
      body: expect.any(FormData),
    })
  })

  it('calls Get Deployment Info', async () => {
    await sdk.getDeploymentInfo('981d95c7-6a2f-491a-adee-09f74fbc38ce')
    expect(fetch).toHaveBeenCalledWith(
      `${expectedBaseUrl}/deployments/981d95c7-6a2f-491a-adee-09f74fbc38ce`,
      {
        headers: expectedHeaders,
        method: 'GET',
      },
    )
  })

  it('rejects with an API error for errors with no json body', async () => {
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: jest.fn(() => Promise.reject(new Error('foo'))),
    })

    await expect(sdk.createDeployment()).rejects.toThrowError(/\[502: Bad Gateway]$/)
  })

  it('rejects with an API error for errors with non-standard json bodies', async () => {
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: jest.fn(() => Promise.resolve({})),
    })

    await expect(sdk.createDeployment()).rejects.toThrowError(/\[502: Bad Gateway]\n{}$/)
  })

  it('rejects with an API error when response is not successful', async () => {
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: jest.fn(() => Promise.resolve(failure)),
    })

    await expect(sdk.createDeployment()).rejects.toThrowError(
      /\[500: Internal Server Error]\nAn unknown error occurred \[8000000]$/,
    )
  })

  it('rejects with an API error when response is ok but result is not successful', async () => {
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn(() => Promise.resolve(failure)),
    })

    await expect(sdk.createDeployment()).rejects.toThrowError(
      /\[200: OK]\nAn unknown error occurred \[8000000]$/,
    )
  })

  it('rejects with the response when not okay', async () => {
    const res = { ok: false, status: 502, statusText: 'Bad Gateway' }

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce(res)

    await expect(sdk.createDeployment()).rejects.toThrowError(/\[502: Bad Gateway\]$/)
  })

  describe('getLiveLogs', () => {
    const WS_HOST = process.env.WS_HOST
    let wss: WebSocket.Server

    function getClient(): WebSocket {
      const [ws] = wss.clients
      return ws
    }

    function broadcast(log: unknown, binary = false): void {
      wss.clients.forEach((client) => client.send(JSON.stringify(log), { binary }))
    }

    beforeEach(() => {
      wss = new WebSocket.Server({ port: 0 })
      process.env.WS_HOST = `ws://localhost:${(wss.address() as AddressInfo).port}`
    })

    afterEach(() => {
      wss.clients.forEach((client) => client.terminate())
      wss.close()
      process.env.WS_HOST = WS_HOST
    })

    test('it resolves to a close function on open', async () => {
      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn(() => Promise.resolve({ success: true, result: { jwt: '' } })),
      })

      const close = await sdk.getLiveLogs('981d95c7-6a2f-491a-adee-09f74fbc38ce', jest.fn())

      const client = getClient()

      await expect(close).toEqual(expect.any(Function))

      await close()

      expect(client.readyState).not.toBe(client.OPEN)
    })

    test('it safely handles multiple close calls', async () => {
      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn(() => Promise.resolve({ success: true, result: { jwt: '' } })),
      })

      const close = await sdk.getLiveLogs('981d95c7-6a2f-491a-adee-09f74fbc38ce', jest.fn())

      await expect(Promise.all([close(), close()])).resolves.toEqual([undefined, undefined])
      await expect(close()).resolves.toBeUndefined()
    })

    test('it rejects when connection closes before handshake complete', async () => {
      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn(() => Promise.resolve({ success: true, result: { jwt: '' } })),
      })

      process.env.WS_HOST = `ws://localhost:9999`
      const closePromise = sdk.getLiveLogs('981d95c7-6a2f-491a-adee-09f74fbc38ce', jest.fn())
      await expect(closePromise).rejects.toEqual(expect.any(Object))
    })

    test('it logs messages', async () => {
      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn(() => Promise.resolve({ success: true, result: { jwt: '' } })),
      })

      const onLog = jest.fn()
      await sdk.getLiveLogs('981d95c7-6a2f-491a-adee-09f74fbc38ce', onLog)

      buildLogs.forEach((log) => broadcast(log))
      await wait(5)
      expect(onLog).toHaveBeenCalledTimes(buildLogs.length)
      buildLogs.forEach((log) => expect(onLog).toHaveBeenCalledWith(log))
    })

    test('it handles invalid messages', async () => {
      ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn(() => Promise.resolve({ success: true, result: { jwt: '' } })),
      })

      const onLog = jest.fn()
      await sdk.getLiveLogs('981d95c7-6a2f-491a-adee-09f74fbc38ce', onLog)

      broadcast({ bad: 'format' })
      broadcast('not json')
      broadcast('binary', true)
      await wait(0)
      expect(onLog).toHaveBeenCalledTimes(0)
      expect(errorSpy).toHaveBeenCalledTimes(3)
    })
  })
})

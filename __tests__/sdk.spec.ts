import fetch from 'node-fetch'
import createSdk, { Sdk } from '../src/sdk'
import { ApiResult } from '../src/types'

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

const emptyFailure: ApiResult<null> = {
  result: null,
  success: false,
  errors: null,
  messages: [],
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(() =>
    Promise.resolve({ ok: true, json: jest.fn(() => Promise.resolve(success)) }),
  ),
}))

describe('sdk', () => {
  let sdk: Sdk

  beforeEach(() => {
    sdk = createSdk({
      accountId: '5790cddd-6172-4135-b275-2a64c49167d7',
      apiKey: '076758732de5497881a1cece814ff4faee9ab',
      email: 'name@example.com',
      projectName: 'example-project',
    })
  })

  it('calls Get Project', async () => {
    await sdk.getProject()
    expect(fetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/5790cddd-6172-4135-b275-2a64c49167d7/pages/projects/example-project',
      {
        headers: {
          'X-Auth-Email': 'name@example.com',
          'X-Auth-Key': '076758732de5497881a1cece814ff4faee9ab',
        },
        method: 'GET',
      },
    )
  })

  it('calls Create Deployment', async () => {
    await sdk.createDeployment()
    expect(fetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/5790cddd-6172-4135-b275-2a64c49167d7/pages/projects/example-project/deployments',
      {
        headers: {
          'X-Auth-Email': 'name@example.com',
          'X-Auth-Key': '076758732de5497881a1cece814ff4faee9ab',
        },
        method: 'POST',
      },
    )
  })

  it('calls Get Deployment Info', async () => {
    await sdk.getDeploymentInfo('981d95c7-6a2f-491a-adee-09f74fbc38ce')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/5790cddd-6172-4135-b275-2a64c49167d7/pages/projects/example-project/deployments/981d95c7-6a2f-491a-adee-09f74fbc38ce',
      {
        headers: {
          'X-Auth-Email': 'name@example.com',
          'X-Auth-Key': '076758732de5497881a1cece814ff4faee9ab',
        },
        method: 'GET',
      },
    )
  })

  it('calls Stage Logs', async () => {
    await sdk.getStageLogs('981d95c7-6a2f-491a-adee-09f74fbc38ce', 'build')

    expect(fetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/5790cddd-6172-4135-b275-2a64c49167d7/pages/projects/example-project/deployments/981d95c7-6a2f-491a-adee-09f74fbc38ce/history/build/logs',
      {
        headers: {
          'X-Auth-Email': 'name@example.com',
          'X-Auth-Key': '076758732de5497881a1cece814ff4faee9ab',
        },
        method: 'GET',
      },
    )
  })

  it('rejects with an API error when response is not successful', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn(() => Promise.resolve(failure)),
    })

    await expect(sdk.createDeployment()).rejects.toThrowError(
      '[Cloudflare API Error]:\nAn unknown error occurred [8000000]',
    )
  })

  it('rejects with an API error when response is not successful with no messages', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn(() => Promise.resolve(emptyFailure)),
    })

    await expect(sdk.createDeployment()).rejects.toThrowError('[Cloudflare API Error]')
  })

  it('rejects with the response when not okay', async () => {
    const res = { ok: false, status: 502, statusText: 'Bad Gateway' }

    ;(fetch as jest.Mock).mockResolvedValueOnce(res)

    await expect(sdk.createDeployment()).rejects.toThrowError('Bad Gateway')
  })
})

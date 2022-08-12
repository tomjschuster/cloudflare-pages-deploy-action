import fetch from 'node-fetch'
import createPagesSdk, { PagesSdk } from '../src/cloudflare'
import { DeployHookDeleteError } from '../src/errors'
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

  beforeEach(() => {
    jest.clearAllMocks()

    sdk = createPagesSdk({
      accountId: '5790cddd-6172-4135-b275-2a64c49167d7',
      apiKey: '076758732de5497881a1cece814ff4faee9ab',
      email: 'name@example.com',
      projectName: 'example-project',
    })

    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  const expectedBaseUrl =
    'https://api.cloudflare.com/client/v4/accounts/5790cddd-6172-4135-b275-2a64c49167d7/pages/projects/example-project'

  const expectedHooksBaseUrl = 'https://api.cloudflare.com/client/v4/pages/webhooks'

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

  it('creates, executes and deletes a deploy hook for Create Deployment with a non-production branch', async () => {
    const branch = 'foo'
    const hookId = 'f034771c-85ef-49d5-8d84-4683e365a23b'
    const deployId = '981d95c7-6a2f-491a-adee-09f74fbc38ce'

    mockCfFetchSuccess({ source: { config: { production_branch: 'main' } } })
    mockCfFetchSuccess({ hook_id: hookId })
    mockCfFetchSuccess({ id: deployId })
    mockCfFetchSuccess('ok')
    mockCfFetchSuccess(success)

    await sdk.createDeployment(branch)

    expect(fetch).toHaveBeenCalledTimes(5)

    expect(fetch).toHaveBeenNthCalledWith(1, expectedBaseUrl, {
      headers: expectedHeaders,
      method: 'GET',
    })

    expect(fetch).toHaveBeenNthCalledWith(2, `${expectedBaseUrl}/deploy_hooks`, {
      headers: expectedHeaders,
      body: expect.any(String),
      method: 'POST',
    })

    expect(fetch).toHaveBeenNthCalledWith(
      3,
      `${expectedHooksBaseUrl}/deploy_hooks/f034771c-85ef-49d5-8d84-4683e365a23b`,
      {
        headers: expectedHeaders,
        method: 'POST',
      },
    )

    expect(fetch).toHaveBeenNthCalledWith(
      4,
      `${expectedBaseUrl}/deploy_hooks/f034771c-85ef-49d5-8d84-4683e365a23b`,
      {
        headers: expectedHeaders,
        method: 'DELETE',
      },
    )

    expect(fetch).toHaveBeenNthCalledWith(
      5,
      `${expectedBaseUrl}/deployments/981d95c7-6a2f-491a-adee-09f74fbc38ce`,
      {
        headers: expectedHeaders,
        method: 'GET',
      },
    )
  })

  it('deletes a deploy hook for Create Deployment with a branch on failure', async () => {
    const branch = 'foo'
    const hookId = 'f034771c-85ef-49d5-8d84-4683e365a23b'

    mockCfFetchSuccess({ source: { config: { production_branch: 'main' } } })
    mockCfFetchSuccess({ hook_id: hookId })
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    })
    mockCfFetchSuccess('ok')

    await expect(sdk.createDeployment(branch)).rejects.toThrow()

    expect(fetch).toHaveBeenCalledTimes(4)

    expect(fetch).toHaveBeenNthCalledWith(1, expectedBaseUrl, {
      headers: expectedHeaders,
      method: 'GET',
    })

    expect(fetch).toHaveBeenNthCalledWith(2, `${expectedBaseUrl}/deploy_hooks`, {
      headers: expectedHeaders,
      body: expect.any(String),
      method: 'POST',
    })

    expect(fetch).toHaveBeenNthCalledWith(
      3,
      `${expectedHooksBaseUrl}/deploy_hooks/f034771c-85ef-49d5-8d84-4683e365a23b`,
      {
        headers: expectedHeaders,
        method: 'POST',
      },
    )

    expect(fetch).toHaveBeenNthCalledWith(
      4,
      `${expectedBaseUrl}/deploy_hooks/f034771c-85ef-49d5-8d84-4683e365a23b`,
      {
        headers: expectedHeaders,
        method: 'DELETE',
      },
    )
  })

  it('rejects with a hook error on delete deploy hook failure for Create Deployment with a branch on failure', async () => {
    const branch = 'foo'
    const hookId = 'f034771c-85ef-49d5-8d84-4683e365a23b'

    mockCfFetchSuccess({ source: { config: { production_branch: 'main' } } })
    mockCfFetchSuccess({ hook_id: hookId })
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    })
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    })

    await sdk
      .createDeployment(branch)
      .then(() => {
        // force failure if no
        expect(true).toBe(false)
      })
      .catch((e) => {
        expect(e).toBeInstanceOf(DeployHookDeleteError)
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

  it('rejects with an API error when response is not successful', async () => {
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn(() => Promise.resolve(failure)),
    })

    await expect(sdk.createDeployment()).rejects.toThrowError(
      '[Cloudflare API Error]\nAn unknown error occurred [8000000]',
    )
  })

  it('rejects with an API error when response is not successful with no messages', async () => {
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn(() => Promise.resolve(emptyFailure)),
    })

    await expect(sdk.createDeployment()).rejects.toThrowError('[Cloudflare API Error]')
  })

  it('rejects with the response when not okay', async () => {
    const res = { ok: false, status: 502, statusText: 'Bad Gateway' }

    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce(res)

    await expect(sdk.createDeployment()).rejects.toThrowError(/^502: Bad Gateway$/)
  })

  it('formats failed fetch errors', async () => {
    const res = {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ message: "You don't have access to this resource." }),
    }
    ;(fetch as unknown as jest.Mock).mockResolvedValueOnce(res)
    const message = `403: Forbidden
{
  "message": "You don't have access to this resource."
}`

    await expect(sdk.createDeployment()).rejects.toThrowError(message)
  })
})

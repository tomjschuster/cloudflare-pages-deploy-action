import { getOctokit } from '@actions/github'
import { createGithubCloudfrontDeploymentHandlers } from '../src/github'
import { completedDeployment } from '../__fixtures__/completedDeployment'
import { previewDeployment } from '../__fixtures__/previewDeployment'

jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(() => ({})),
}))

describe('createGithubCloudfrontDeploymentHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  it('returns handlers', () => {
    expect(createGithubCloudfrontDeploymentHandlers('foo', 'bar')).toEqual(
      expect.objectContaining({
        onStart: expect.any(Function),
        onStageChange: expect.any(Function),
        onSuccess: expect.any(Function),
        onFailure: expect.any(Function),
      }),
    )
  })

  it('creates a production deployment on start', async () => {
    const createDeployment = jest.fn(() => Promise.resolve({ status: 201, data: { id: 1 } }))
    ;(getOctokit as jest.Mock).mockReturnValueOnce({
      rest: {
        repos: {
          createDeployment,
        },
      },
    })

    const handlers = createGithubCloudfrontDeploymentHandlers('foo', 'bar')

    await handlers.onStart(completedDeployment)

    expect(createDeployment).toHaveBeenCalledTimes(1)
    expect(createDeployment).toHaveBeenLastCalledWith(
      expect.objectContaining({ environment: 'production' }),
    )
  })

  it('creates a preview deployment on start', async () => {
    const createDeployment = jest.fn(() => Promise.resolve({ status: 201, data: { id: 1 } }))
    ;(getOctokit as jest.Mock).mockReturnValueOnce({
      rest: {
        repos: {
          createDeployment,
        },
      },
    })

    const handlers = createGithubCloudfrontDeploymentHandlers('foo', 'bar')

    await handlers.onStart(previewDeployment)

    expect(createDeployment).toHaveBeenCalledTimes(1)
    expect(createDeployment).toHaveBeenLastCalledWith(
      expect.objectContaining({ environment: 'preview (some-feature)' }),
    )
  })

  it('updates the state on stage change', async () => {
    const createDeployment = jest.fn(() => Promise.resolve({ status: 201, data: { id: 1 } }))
    const createDeploymentStatus = jest.fn(() => Promise.resolve({ status: 201, data: { id: 1 } }))

    ;(getOctokit as jest.Mock).mockReturnValueOnce({
      rest: {
        repos: {
          createDeployment,
          createDeploymentStatus,
        },
      },
    })

    const handlers = createGithubCloudfrontDeploymentHandlers('foo', 'bar')

    await handlers.onStart(completedDeployment)
    await handlers.onStageChange('queued')
    await handlers.onStageChange('initialize')
    await handlers.onStageChange('build')

    expect(createDeploymentStatus).toHaveBeenCalledTimes(2)
  })

  it('updates the state on success', async () => {
    const createDeployment = jest.fn(() => Promise.resolve({ status: 201, data: { id: 1 } }))
    const createDeploymentStatus = jest.fn(() => Promise.resolve({ status: 201, data: { id: 1 } }))

    ;(getOctokit as jest.Mock).mockReturnValueOnce({
      rest: {
        repos: {
          createDeployment,
          createDeploymentStatus,
        },
      },
    })

    const handlers = createGithubCloudfrontDeploymentHandlers('foo', 'bar')

    await handlers.onStart(completedDeployment)
    await handlers.onSuccess()

    expect(createDeploymentStatus).toHaveBeenCalledTimes(1)
  })

  it('updates the state on failure', async () => {
    const createDeployment = jest.fn(() => Promise.resolve({ status: 201, data: { id: 1 } }))
    const createDeploymentStatus = jest.fn(() => Promise.resolve({ status: 201, data: { id: 1 } }))

    ;(getOctokit as jest.Mock).mockReturnValueOnce({
      rest: {
        repos: {
          createDeployment,
          createDeploymentStatus,
        },
      },
    })

    const handlers = createGithubCloudfrontDeploymentHandlers('foo', 'bar')

    await handlers.onStart(completedDeployment)
    await handlers.onFailure()

    expect(createDeploymentStatus).toHaveBeenCalledTimes(1)
  })

  it('returns GitHubApi error on failure', async () => {
    const createDeployment = jest.fn(() =>
      Promise.resolve({ status: 422, data: { message: 'there was a problem' } }),
    )

    ;(getOctokit as jest.Mock).mockReturnValueOnce({
      rest: {
        repos: {
          createDeployment,
        },
      },
    })

    const handlers = createGithubCloudfrontDeploymentHandlers('foo', 'bar')

    await expect(handlers.onStart(completedDeployment)).rejects.toThrowError(
      `[GitHub API Error] Status: 422, Message: there was a problem`,
    )
  })

  it('gracefully handles calling handlers before onStart', async () => {
    const createDeployment = jest.fn(() => Promise.resolve({ status: 201, data: { id: 1 } }))
    const createDeploymentStatus = jest.fn(() => Promise.resolve({ status: 201, data: { id: 1 } }))

    ;(getOctokit as jest.Mock).mockReturnValueOnce({
      rest: {
        repos: {
          createDeployment,
          createDeploymentStatus,
        },
      },
    })

    const handlers = createGithubCloudfrontDeploymentHandlers('foo', 'bar')

    await handlers.onStageChange('queued')
    await handlers.onFailure()
    await handlers.onSuccess()
    await handlers.onStart(completedDeployment)

    expect(createDeployment).toHaveBeenCalledTimes(1)
    expect(createDeploymentStatus).toHaveBeenCalledTimes(0)
  })
})

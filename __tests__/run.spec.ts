import * as actionsCore from '@actions/core'
import { getBooleanInput, getInput, setFailed, setOutput } from '@actions/core'
import * as github from '@actions/github'
import createPagesSdk from '../src/cloudflare'
import { deploy } from '../src/deploy'
import { DeploymentError } from '../src/errors'
import { run } from '../src/run'
import { DeploymentCallbacks } from '../src/types'
import { completedDeployment, failedDeployment, project } from './mocks'

jest.mock('@actions/core', () => ({
  error: jest.fn(),
  info: jest.fn(),
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
}))
jest.mock('../src/deploy', () => ({ deploy: jest.fn() }))
jest.mock('../src/cloudflare', () => ({ __esModule: true, default: jest.fn(() => ({})) }))

const mockGithubCallbacks: DeploymentCallbacks = {
  onStart: jest.fn(),
  onStageChange: jest.fn(),
  onSuccess: jest.fn(),
  onFailure: jest.fn(),
}

jest.mock('../src/github', () => ({
  createGithubCloudfrontDeploymentCallbacks: jest.fn(() => mockGithubCallbacks),
}))

describe('run', () => {
  let consoleLog: jest.SpyInstance<void, Parameters<typeof console.log>>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getInput as jest.Mock).mockReturnValueOnce('accountId')
    ;(getInput as jest.Mock).mockReturnValueOnce('apiKey')
    ;(getInput as jest.Mock).mockReturnValueOnce('email')
    ;(getInput as jest.Mock).mockReturnValueOnce('projectName')
    ;(createPagesSdk as jest.Mock).mockReturnValue({ getProject: jest.fn(async () => project) })
    consoleLog = jest.spyOn(actionsCore, 'info').mockImplementation(() => undefined)
    jest.spyOn(actionsCore, 'error').mockImplementation(() => undefined)
  })

  const originalContext = { ...github.context }

  afterEach(() => {
    // Restore original @actions/github context
    Object.defineProperty(github, 'context', {
      value: originalContext,
    })
  })

  function mockContext(owner: string, repo: string, payload: unknown): void {
    Object.defineProperty(github, 'context', { value: { payload: payload, repo: { owner, repo } } })
  }

  it('creates an sdk with the proper inputs', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    expect(createPagesSdk).toHaveBeenCalledWith({
      apiKey: 'apiKey',
      email: 'email',
      accountId: 'accountId',
      projectName: 'projectName',
    })
  })

  it('calls deploy with no branch when production is set', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    expect(deploy).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
      expect.any(Object),
      undefined,
    )
  })

  it('calls deploy with a branch when branch is set', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce('foo')

    await run()

    expect(deploy).toHaveBeenCalledWith(expect.any(Object), 'foo', expect.any(Object), undefined)
  })

  it('calls deploy with branch from context when preview is set', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)
    ;(getInput as jest.Mock).mockReturnValueOnce(undefined)

    mockContext('example-owner', 'example-project', { pull_request: { head: { ref: 'foo' } } })

    await run()

    expect(deploy).toHaveBeenCalledWith(expect.any(Object), 'foo', expect.any(Object), undefined)
  })

  it('sets outputs with the created deployment', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    expect(setOutput).toHaveBeenNthCalledWith(1, 'deployment-id', completedDeployment.id)
    expect(setOutput).toHaveBeenNthCalledWith(2, 'url', completedDeployment.url)
  })

  it('sets the job state to failed after a deploy failure', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(failedDeployment)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    expect(setFailed).toHaveBeenCalled()
  })

  it('sets the job state to failed when both production and branch are provided', async () => {
    ;(deploy as jest.Mock).mockRejectedValue(new Error('foo'))
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)
    ;(getInput as jest.Mock).mockReturnValueOnce('foo')

    await run()

    expect(setFailed).toHaveBeenCalled()
  })

  it('sets the job state to failed when neither production and branch are provided', async () => {
    ;(deploy as jest.Mock).mockRejectedValue(new Error('foo'))
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce(undefined)

    await run()

    expect(setFailed).toHaveBeenCalled()
  })

  it.each([
    '/',
    'foo..bar',
    'foo bar',
    'foo\x7Fbar',
    'foo~bar',
    'foo^bar',
    'foo:bar',
    'foo?bar',
    'foo*bar',
    'foo[bar',
    '/foo',
    'foo/',
    'foo//bar',
    'foo.',
    'foo@{bar',
    '@',
    'foo\\bar',
  ])('sets the job state to failed for invalid branch name "%s"', async (branch) => {
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce(branch)

    await run()

    expect(setFailed).toHaveBeenCalled()
  })

  it('sets the job state to failed for a very long branch name', async () => {
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce('foo'.repeat(100))

    await run()

    expect(setFailed).toHaveBeenCalled()
  })

  it('sets job state to failed when preview is set no pull request payload', async () => {
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    mockContext('example-owner', 'example-project', { payload: {} })

    await run()

    expect(setFailed).toHaveBeenCalled()
  })

  it('sets job state to failed when preview is set but repo is different', async () => {
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    mockContext('example-owner', 'other-project', { pull_request: { head: { ref: 'foo' } } })

    await run()

    expect(setFailed).toHaveBeenCalled()
  })

  it('sets job state to failed when preview is set but branch is production branch', async () => {
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    mockContext('example-owner', 'example-project', { pull_request: { head: { ref: 'main' } } })

    await run()

    expect(setFailed).toHaveBeenCalled()
  })

  it('sets the job state to failed after a runtime error', async () => {
    ;(deploy as jest.Mock).mockRejectedValue(new Error('foo'))
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    expect(setFailed).toHaveBeenCalledWith(new Error('foo'))
  })

  it('sets the job state to failed and logs a message when deployment starts but does not complete', async () => {
    ;(deploy as jest.Mock).mockRejectedValue(
      new DeploymentError(new Error('foo'), failedDeployment),
    )
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    // 1 for failure, 1 for GitHub deployment, 1 for report an issue
    expect(consoleLog).toHaveBeenCalledTimes(3)
    expect(setFailed).toHaveBeenCalled()
  })

  it('sets the job state to failed after an unexpected error', async () => {
    ;(deploy as jest.Mock).mockRejectedValue(1)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    expect(setFailed).toHaveBeenCalled()
  })

  it('creates GitHub deploy callbacks when token provided', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)
    // branch
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)
    ;(getInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce('githubToken')

    await run()

    expect(deploy).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
      expect.any(Object),
      expect.any(Object),
    )
  })

  it('marks a GitHub deploy as success', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)
    // branch
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)
    ;(getInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce('githubToken')

    await run()

    expect(mockGithubCallbacks.onSuccess).toHaveBeenCalledWith()
  })

  it('marks a GitHub deploy as failed after a failed build', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(failedDeployment)
    // branch
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)
    ;(getInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce('githubToken')

    await run()

    expect(mockGithubCallbacks.onFailure).toHaveBeenCalledWith()
  })

  it('marks a GitHub deploy as failed after an error', async () => {
    ;(deploy as jest.Mock).mockRejectedValue(
      new DeploymentError(new Error('foo'), failedDeployment),
    )
    // branch
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)
    ;(getInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce('githubToken')

    await run()

    expect(mockGithubCallbacks.onFailure).toHaveBeenCalledWith()
  })
})

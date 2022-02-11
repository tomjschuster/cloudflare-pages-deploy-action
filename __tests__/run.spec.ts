import { getBooleanInput, getInput, setFailed, setOutput } from '@actions/core'
import createPagesSdk from '../src/cloudflare'
import { deploy } from '../src/deploy'
import { DeployHookDeleteError, DeploymentError } from '../src/errors'
import { run } from '../src/run'
import { DeploymentHandlers } from '../src/types'
import { completedDeployment } from '../__fixtures__/completedDeployment'
import { failedLiveDeployment } from '../__fixtures__/failedDeployment'
import { initialLiveDeployment as deployment } from '../__fixtures__/liveDeployment'

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
}))
jest.mock('../src/deploy', () => ({ deploy: jest.fn() }))
jest.mock('../src/cloudflare', () => ({ __esModule: true, default: jest.fn(() => ({})) }))

const mockGithubHandlers: DeploymentHandlers = {
  onStart: jest.fn(),
  onStageChange: jest.fn(),
  onSuccess: jest.fn(),
  onFailure: jest.fn(),
}

jest.mock('../src/github', () => ({
  createGithubCloudfrontDeploymentHandlers: jest.fn(() => mockGithubHandlers),
}))

describe('run', () => {
  let consoleLog: jest.SpyInstance<void, Parameters<typeof console.log>>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getInput as jest.Mock).mockReturnValueOnce('accountId')
    ;(getInput as jest.Mock).mockReturnValueOnce('apiKey')
    ;(getInput as jest.Mock).mockReturnValueOnce('email')
    ;(getInput as jest.Mock).mockReturnValueOnce('projectName')
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

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

    expect(deploy).toHaveBeenCalledWith(expect.any(Object), undefined, undefined)
  })

  it('calls deploy with a branch when branch is set', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce('foo')

    await run()

    expect(deploy).toHaveBeenCalledWith(expect.any(Object), 'foo', undefined)
  })

  it('sets outputs with the created deployment', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    expect(setOutput).toHaveBeenNthCalledWith(1, 'deployment-id', completedDeployment.id)
    expect(setOutput).toHaveBeenNthCalledWith(2, 'url', completedDeployment.url)
  })

  it('sets the job state to failed after a deploy failure', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(failedLiveDeployment)
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

  it('sets the job state to failed after a runtime error', async () => {
    ;(deploy as jest.Mock).mockRejectedValue(new Error('foo'))
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    expect(setFailed).toHaveBeenCalledWith('foo')
  })

  it('sets the job state to failed and logs a message when deployment starts but does not complete', async () => {
    ;(deploy as jest.Mock).mockRejectedValue(new DeploymentError(new Error('foo'), deployment))
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    // 1 for failure, 1 for GitHub deployment
    expect(consoleLog).toHaveBeenCalledTimes(2)
    expect(setFailed).toHaveBeenCalled()
  })

  it('sets the job state to failed when deploy hook fails to delete', async () => {
    ;(deploy as jest.Mock).mockRejectedValue(new DeployHookDeleteError(new Error('foo'), 'bar'))
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    // 1 for failed deploy, 1 for failed hook deletion, 1 for GitHub deployment
    expect(consoleLog).toHaveBeenCalledTimes(3)
    expect(setFailed).toHaveBeenCalled()
  })

  it('sets the job state to failed after an unexpected error', async () => {
    ;(deploy as jest.Mock).mockRejectedValue(1)
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)

    await run()

    expect(setFailed).toHaveBeenCalled()
  })

  it('creates GitHub deploy handlers when token provided', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)
    // branch
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)
    ;(getInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce('githubToken')

    await run()

    expect(deploy).toHaveBeenCalledWith(expect.any(Object), undefined, expect.any(Object))
  })

  it('marks a GitHub deploy as success', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)
    // branch
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)
    ;(getInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce('githubToken')

    await run()

    expect(mockGithubHandlers.onSuccess).toHaveBeenCalledWith()
  })

  it('marks a GitHub deploy as failed after a failed build', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(failedLiveDeployment)
    // branch
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)
    ;(getInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce('githubToken')

    await run()

    expect(mockGithubHandlers.onFailure).toHaveBeenCalledWith()
  })

  it('marks a GitHub deploy as failed after an error', async () => {
    ;(deploy as jest.Mock).mockRejectedValue(new DeploymentError(new Error('foo'), deployment))
    // branch
    ;(getBooleanInput as jest.Mock).mockReturnValueOnce(true)
    ;(getInput as jest.Mock).mockReturnValueOnce(undefined)
    ;(getInput as jest.Mock).mockReturnValueOnce('githubToken')

    await run()

    expect(mockGithubHandlers.onFailure).toHaveBeenCalledWith()
  })
})

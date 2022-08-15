import * as actionsCore from '@actions/core'
import { PagesSdk } from '../src/cloudflare'
import { deploy, stagePollIntervalEnvName } from '../src/deploy'
import { DeploymentError } from '../src/errors'
import { createLogger, Logger } from '../src/logger'
import {
  Deployment,
  DeploymentCallbacks,
  DeploymentLog,
  KnownStageName,
  KnownStageStatus,
} from '../src/types'
import {
  buildLogs,
  cloneRepoLogs,
  deployLogs,
  initialDeployment,
  initializeLogs,
  mockDeployment,
  queuedLogs,
  stagesWithTest,
  testLogs,
} from './mocks'

const getProject: jest.Mock<ReturnType<PagesSdk['getProject']>> = jest.fn()
const createDeployment: jest.Mock<ReturnType<PagesSdk['createDeployment']>> = jest.fn()
const getDeploymentInfo: jest.Mock<ReturnType<PagesSdk['getDeploymentInfo']>> = jest.fn()
const getLiveLogs: jest.Mock<ReturnType<PagesSdk['getLiveLogs']>> = jest.fn(
  async () => () => Promise.resolve(),
)

const sdk = { getProject, createDeployment, getDeploymentInfo, getLiveLogs }

const accountId = '414fd50d-cb74-4dca-8d2e-ee9601a3f826'

describe('deploy', () => {
  const env = process.env
  let logger: Logger
  let consoleSpy: jest.SpyInstance
  let startGroupSpy: jest.SpyInstance
  let endGroupSpy: jest.SpyInstance

  beforeEach(() => {
    jest.restoreAllMocks()
    logger = createLogger()
    consoleSpy = jest.spyOn(actionsCore, 'info').mockImplementation(() => undefined)
    jest.spyOn(actionsCore, 'debug').mockImplementation(() => undefined)
    jest.spyOn(actionsCore, 'warning').mockImplementation(() => undefined)
    jest.spyOn(actionsCore, 'error').mockImplementation(() => undefined)
    startGroupSpy = jest.spyOn(actionsCore, 'startGroup').mockImplementation(() => undefined)
    endGroupSpy = jest.spyOn(actionsCore, 'endGroup').mockImplementation(() => undefined)
    ;['queued', 'initialize', 'clone_repo', 'test', 'build', 'deploy'].forEach((name) => {
      process.env[stagePollIntervalEnvName(name)] = '0'
    })
  })

  afterAll(() => {
    logger.flush()
    process.env = env
  })

  type MockStage = [KnownStageName, KnownStageStatus, DeploymentLog[]]

  async function assertStages(stages: MockStage[], overrides?: Partial<Deployment>): Promise<void> {
    const deployment = stages.reduce<Deployment | null>((_, [stage, status, logs]) => {
      const deployment = mockDeployment(stage, status, overrides)

      getDeploymentInfo.mockImplementationOnce(async () => {
        logs.forEach(logger.enqueue)
        return deployment
      })

      return deployment
    }, null)

    // assert resolved deployment is equal to last mock
    await expect(deploy(sdk, accountId, logger)).resolves.toEqual(deployment)

    // assert all logs flushed
    expect(consoleSpy).toHaveBeenCalledTimes(stages.flatMap((x) => x[2]).length)
  }

  it('logs all stages of successful deployments', async () => {
    createDeployment.mockResolvedValueOnce(mockDeployment('queued', 'idle'))

    const stages: MockStage[] = [
      ['queued', 'active', queuedLogs],
      ['queued', 'success', []],
      ['initialize', 'active', initializeLogs],
      ['initialize', 'success', []],
      ['clone_repo', 'active', cloneRepoLogs],
      ['clone_repo', 'success', []],
      ['build', 'active', buildLogs],
      ['build', 'success', []],
      ['deploy', 'active', deployLogs],
      ['deploy', 'success', []],
    ]

    await assertStages(stages)

    expect(startGroupSpy).toHaveBeenCalledTimes(5)
    expect(endGroupSpy).toHaveBeenCalledTimes(5)
  })

  it('skips stages without logs', async () => {
    createDeployment.mockResolvedValueOnce(mockDeployment('queued', 'idle'))

    const stages: MockStage[] = [
      ['queued', 'active', []],
      ['queued', 'success', []],
      ['initialize', 'active', initializeLogs],
      ['initialize', 'success', []],
      ['clone_repo', 'active', cloneRepoLogs],
      ['clone_repo', 'success', []],
      ['build', 'active', buildLogs],
      ['build', 'success', []],
      ['deploy', 'active', deployLogs],
      ['deploy', 'success', []],
    ]

    await assertStages(stages)

    expect(startGroupSpy).toHaveBeenCalledTimes(4)
    expect(endGroupSpy).toHaveBeenCalledTimes(4)
  })

  it('logs all, already completed stages', async () => {
    createDeployment.mockResolvedValueOnce(mockDeployment('queued', 'idle'))

    const stages: MockStage[] = [
      ['clone_repo', 'active', [...initializeLogs, ...cloneRepoLogs]],
      ['clone_repo', 'success', []],
      ['build', 'active', buildLogs],
      ['build', 'success', []],
      ['deploy', 'active', deployLogs],
      ['deploy', 'success', []],
    ]

    await assertStages(stages)

    expect(startGroupSpy).toHaveBeenCalledTimes(4)
    expect(endGroupSpy).toHaveBeenCalledTimes(4)
  })

  it('handles unexpected stages', async () => {
    createDeployment.mockResolvedValueOnce(
      mockDeployment('queued', 'idle', { stages: stagesWithTest }),
    )

    const stages: MockStage[] = [
      ['queued', 'active', queuedLogs],
      ['queued', 'success', []],
      ['initialize', 'active', initializeLogs],
      ['initialize', 'success', []],
      ['clone_repo', 'active', cloneRepoLogs],
      ['clone_repo', 'success', []],
      ['build', 'active', buildLogs],
      ['build', 'success', []],
      ['test' as KnownStageName, 'active', testLogs],
      ['test' as KnownStageName, 'success', []],
      ['deploy', 'active', deployLogs],
      ['deploy', 'success', []],
    ]

    await assertStages(stages, { stages: stagesWithTest })

    expect(startGroupSpy).toHaveBeenCalledTimes(6)
    expect(endGroupSpy).toHaveBeenCalledTimes(6)
  })

  it('logs until failure, then returns deploy', async () => {
    createDeployment.mockResolvedValueOnce(mockDeployment('queued', 'idle'))

    const stages: MockStage[] = [
      ['queued', 'active', queuedLogs],
      ['queued', 'success', []],
      ['initialize', 'active', initializeLogs],
      ['initialize', 'success', []],
      ['clone_repo', 'active', cloneRepoLogs],
      ['clone_repo', 'success', []],
      ['build', 'active', buildLogs],
      ['build', 'failure', []],
    ]

    await assertStages(stages)

    expect(startGroupSpy).toHaveBeenCalledTimes(4)
    expect(endGroupSpy).toHaveBeenCalledTimes(4)
  })

  it('throws a DeploymentError if error thrown after deployment start', async () => {
    sdk.createDeployment.mockResolvedValueOnce(initialDeployment)
    sdk.getDeploymentInfo.mockRejectedValueOnce(new Error('foo'))

    const error = new DeploymentError(new Error('foo'), initialDeployment)

    await expect(deploy(sdk, accountId, logger)).rejects.toThrowError(error)
  })

  it('calls onStart and onChange', async () => {
    const mockGitHubCallbacks: DeploymentCallbacks = {
      onStart: jest.fn(),
      onStageChange: jest.fn(),
      onSuccess: jest.fn(),
      onFailure: jest.fn(),
    }

    const completedDeployment = mockDeployment()

    sdk.createDeployment.mockResolvedValueOnce(completedDeployment)
    sdk.getDeploymentInfo.mockResolvedValueOnce(completedDeployment)

    await expect(deploy(sdk, accountId, logger, mockGitHubCallbacks)).resolves.toEqual(
      completedDeployment,
    )

    expect(mockGitHubCallbacks.onStart).toHaveBeenCalledWith(completedDeployment)
    expect(mockGitHubCallbacks.onStageChange).toHaveBeenCalledWith('initialize')
  })
})

import * as actionsCore from '@actions/core'
import { PagesSdk } from '../src/cloudflare'
import { deploy, stagePollIntervalEnvName } from '../src/deploy'
import { DeploymentError } from '../src/errors'
import { DeploymentHandlers } from '../src/types'
import {
  buildLogs,
  cloneRepoLogs,
  completedDeployment,
  deployLogs,
  initializeLogs,
  queuedLogs,
} from '../__fixtures__/completedDeployment'
import {
  activeFailureBuildLogs,
  activeFailureCloneRepoLogs,
  activeFailureInitializeLogs,
  completeFailureCloneRepoLogs,
  completeFailureInitializeLogs,
  completeFailureQueuedLogs,
  failedFailureBuildLogs,
  failedLiveDeployment,
  initialFailedDeployment,
} from '../__fixtures__/failedDeployment'
import {
  activeBuildLogs,
  activeCloneRepoLogs,
  activeDeployLogs,
  activeInitializeLogs,
  activeQueuedLogs,
  completeBuildLogs,
  completeCloneRepoLogs,
  completeDeployLogs,
  completeInitializeLogs,
  completeLiveDeployment,
  completeQueuedLogs,
  initialLiveDeployment,
  stillActiveBuildLogs,
} from '../__fixtures__/liveDeployment'
import {
  activeBuildLogsUnexpectedStage,
  activeCloneRepoLogsUnexpectedStage,
  activeDeployLogsUnexpectedStage,
  activeInitializeLogsUnexpectedStage,
  activeQueuedLogsUnexpectedStage,
  activeTestLogsUnexpectedStage,
  completeBuildLogsUnexpectedStage,
  completeCloneRepoLogsUnexpectedStage,
  completeDeployLogsUnexpectedStage,
  completeInitializeLogsUnexpectedStage,
  completeLiveDeploymentUnexpectedStage,
  completeQueuedLogsUnexpectedStage,
  completeTestLogsUnexpectedStage,
  initialLiveDeploymentUnexpectedStage,
} from '../__fixtures__/liveDeploymentUnexpectedStage'
import {
  activeCloneRepoLogsUnexpectedStatus,
  activeDeployLogsUnexpectedStatus,
  activeInitializeLogsUnexpectedStatus,
  activeLiveDeploymentUnexpectedStatus,
  activeQueuedLogsUnexpectedStatus,
  completeBuildLogsUnexpectedStatus,
  completeCloneRepoLogsUnexpectedStatus,
  completeDeployLogsUnexpectedStatus,
  completeInitializeLogsUnexpectedStatus,
  completeLiveDeploymentUnexpectedStatus,
  completeQueuedLogsUnexpectedStatus,
  initialLiveDeploymentUnexpectedStatus,
  skippedTestLogsUnexpectedStatus,
} from '../__fixtures__/liveDeploymentUnexpectedStatus'
import { noStageDeployment } from '../__fixtures__/noStageDeployment'
import { oneStageDeployLogs, oneStageDeployment } from '../__fixtures__/oneStageDeployment'

const getProject: jest.Mock<ReturnType<PagesSdk['getProject']>> = jest.fn()
const createDeployment: jest.Mock<ReturnType<PagesSdk['createDeployment']>> = jest.fn()
const getDeploymentInfo: jest.Mock<ReturnType<PagesSdk['getDeploymentInfo']>> = jest.fn()
const getStageLogs: jest.Mock<ReturnType<PagesSdk['getStageLogs']>> = jest.fn()

const sdk = { getProject, createDeployment, getDeploymentInfo, getStageLogs }
const accountId = '414fd50d-cb74-4dca-8d2e-ee9601a3f826'

describe('deploy', () => {
  const env = process.env
  let consoleSpy: jest.SpyInstance
  let startGroupSpy: jest.SpyInstance
  let endGroupSpy: jest.SpyInstance

  beforeEach(() => {
    jest.resetAllMocks()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    startGroupSpy = jest.spyOn(actionsCore, 'startGroup').mockImplementation(() => undefined)
    endGroupSpy = jest.spyOn(actionsCore, 'endGroup').mockImplementation(() => undefined)
    ;['queued', 'initialize', 'clone_repo', 'test', 'build', 'deploy'].forEach((name) => {
      process.env[stagePollIntervalEnvName(name)] = '0'
    })
  })

  afterAll(() => {
    process.env = env
  })

  it('logs live deployments', async () => {
    sdk.createDeployment.mockResolvedValueOnce(initialLiveDeployment)
    ;[
      activeQueuedLogs,
      completeQueuedLogs,
      activeInitializeLogs,
      completeInitializeLogs,
      activeCloneRepoLogs,
      completeCloneRepoLogs,
      activeBuildLogs,
      // keep build active for 3 polls
      stillActiveBuildLogs,
      completeBuildLogs,
      activeDeployLogs,
      completeDeployLogs,
    ].forEach(sdk.getStageLogs.mockResolvedValueOnce)

    sdk.getDeploymentInfo.mockResolvedValueOnce(completeLiveDeployment)

    await expect(deploy(sdk, accountId)).resolves.toEqual(completeLiveDeployment)

    // 2x for each stage, extra call for build
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(11)
    // 2x for each stage, extra log for build
    expect(consoleSpy).toHaveBeenCalledTimes(11)
    expect(startGroupSpy).toHaveBeenCalledTimes(5)
    expect(endGroupSpy).toHaveBeenCalledTimes(5)
  })

  it('skips queue when already completed', async () => {
    sdk.createDeployment.mockResolvedValueOnce(initialLiveDeployment)
    ;[
      completeQueuedLogs,
      activeInitializeLogs,
      completeInitializeLogs,
      activeCloneRepoLogs,
      completeCloneRepoLogs,
      activeBuildLogs,
      completeBuildLogs,
      activeDeployLogs,
      completeDeployLogs,
    ].forEach(sdk.getStageLogs.mockResolvedValueOnce)

    sdk.getDeploymentInfo.mockResolvedValueOnce(completeLiveDeployment)

    await expect(deploy(sdk, accountId)).resolves.toEqual(completeLiveDeployment)
    // 1x for queued, 2x for others
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(9)
    // 2x for each stage, extra log for build, skip queue
    expect(consoleSpy).toHaveBeenCalledTimes(9)
    expect(startGroupSpy).toHaveBeenCalledTimes(4)
    expect(endGroupSpy).toHaveBeenCalledTimes(4)
  })

  it('logs all, already completed stages, skipping queued', async () => {
    sdk.createDeployment.mockResolvedValueOnce(completedDeployment)
    ;[queuedLogs, initializeLogs, cloneRepoLogs, buildLogs, deployLogs].forEach(
      sdk.getStageLogs.mockResolvedValueOnce,
    )

    sdk.getDeploymentInfo.mockResolvedValueOnce(completedDeployment)

    await expect(deploy(sdk, accountId)).resolves.toEqual(completedDeployment)
    // 1x for each stage
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(5)
    // 2x for each stage, extra log for build, skip queue
    expect(consoleSpy).toHaveBeenCalledTimes(9)
    expect(startGroupSpy).toHaveBeenCalledTimes(4)
    expect(endGroupSpy).toHaveBeenCalledTimes(4)
  })

  it('logs a single, already completed stage', async () => {
    sdk.createDeployment.mockResolvedValueOnce(oneStageDeployment)
    sdk.getStageLogs.mockResolvedValueOnce(oneStageDeployLogs)
    sdk.getDeploymentInfo.mockResolvedValueOnce(oneStageDeployment)

    await expect(deploy(sdk, accountId)).resolves.toEqual(oneStageDeployment)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect(startGroupSpy).toHaveBeenCalledTimes(1)
    expect(endGroupSpy).toHaveBeenCalledTimes(1)
  })

  it('logs nothing and returns deployment when no stages', async () => {
    sdk.createDeployment.mockResolvedValueOnce(noStageDeployment)
    sdk.getDeploymentInfo.mockResolvedValueOnce(noStageDeployment)

    await expect(deploy(sdk, accountId)).resolves.toEqual(noStageDeployment)
    expect(consoleSpy).not.toHaveBeenCalled()
    expect(startGroupSpy).not.toHaveBeenCalled()
    expect(endGroupSpy).not.toHaveBeenCalled()
  })

  it('logs until failure, then returns deploy', async () => {
    sdk.createDeployment.mockResolvedValueOnce(initialFailedDeployment)
    ;[
      completeFailureQueuedLogs,
      activeFailureInitializeLogs,
      completeFailureInitializeLogs,
      activeFailureCloneRepoLogs,
      completeFailureCloneRepoLogs,
      activeFailureBuildLogs,
      failedFailureBuildLogs,
    ].forEach(sdk.getStageLogs.mockResolvedValueOnce)

    sdk.getDeploymentInfo.mockResolvedValueOnce(failedLiveDeployment)

    await expect(deploy(sdk, accountId)).resolves.toEqual(failedLiveDeployment)
    // 1 x for queued stage, 2x for others, skip queue
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(7)
    // 2x for each stage, extra log for build, skip queue
    expect(consoleSpy).toHaveBeenCalledTimes(7)
    expect(startGroupSpy).toHaveBeenCalledTimes(3)
    expect(endGroupSpy).toHaveBeenCalledTimes(3)
  })

  it('handles unknown stages', async () => {
    sdk.createDeployment.mockResolvedValueOnce(initialLiveDeploymentUnexpectedStage)
    ;[
      activeQueuedLogsUnexpectedStage,
      completeQueuedLogsUnexpectedStage,
      activeInitializeLogsUnexpectedStage,
      completeInitializeLogsUnexpectedStage,
      activeCloneRepoLogsUnexpectedStage,
      completeCloneRepoLogsUnexpectedStage,
      activeTestLogsUnexpectedStage,
      completeTestLogsUnexpectedStage,
      activeBuildLogsUnexpectedStage,
      completeBuildLogsUnexpectedStage,
      activeDeployLogsUnexpectedStage,
      completeDeployLogsUnexpectedStage,
    ].forEach(sdk.getStageLogs.mockResolvedValueOnce)

    sdk.getDeploymentInfo.mockResolvedValueOnce(completeLiveDeploymentUnexpectedStage)

    await expect(deploy(sdk, accountId)).resolves.toEqual(completeLiveDeploymentUnexpectedStage)
    // 2x for each stage including extra test stage
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(12)
    // 2x for each stage, extra log for build
    expect(consoleSpy).toHaveBeenCalledTimes(13)
    expect(startGroupSpy).toHaveBeenCalledTimes(6)
    expect(endGroupSpy).toHaveBeenCalledTimes(6)
  })

  it('handles unknown statuses', async () => {
    sdk.createDeployment.mockResolvedValueOnce(initialLiveDeploymentUnexpectedStatus)
    ;[
      activeQueuedLogsUnexpectedStatus,
      completeQueuedLogsUnexpectedStatus,
      activeInitializeLogsUnexpectedStatus,
      completeInitializeLogsUnexpectedStatus,
      activeCloneRepoLogsUnexpectedStatus,
      completeCloneRepoLogsUnexpectedStatus,
      skippedTestLogsUnexpectedStatus,
      skippedTestLogsUnexpectedStatus,
      skippedTestLogsUnexpectedStatus,
      skippedTestLogsUnexpectedStatus,
      skippedTestLogsUnexpectedStatus,
      activeBuildLogsUnexpectedStage,
      completeBuildLogsUnexpectedStatus,
      activeDeployLogsUnexpectedStatus,
      completeDeployLogsUnexpectedStatus,
    ].forEach(sdk.getStageLogs.mockResolvedValueOnce)

    // Called when test stage polls 5 times
    sdk.getDeploymentInfo.mockResolvedValueOnce(activeLiveDeploymentUnexpectedStatus)
    sdk.getDeploymentInfo.mockResolvedValueOnce(completeLiveDeploymentUnexpectedStatus)

    await expect(deploy(sdk, accountId)).resolves.toEqual(completeLiveDeploymentUnexpectedStatus)
    // 5x for test, 2x for other 5 stages
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(15)
    // 2x for each stage, extra log for build
    expect(consoleSpy).toHaveBeenCalledTimes(11)
    expect(startGroupSpy).toHaveBeenCalledTimes(6)
    expect(endGroupSpy).toHaveBeenCalledTimes(6)
  })

  it('throws a DeploymentError if error thrown after deployment start', async () => {
    sdk.createDeployment.mockResolvedValueOnce(initialLiveDeployment)
    sdk.getStageLogs.mockRejectedValueOnce(new Error('foo'))

    const error = new DeploymentError(new Error('foo'), initialLiveDeployment)

    await expect(deploy(sdk, accountId)).rejects.toThrowError(error)
  })

  it('calls onStart and onChange', async () => {
    const mockGithubHandlers: DeploymentHandlers = {
      onStart: jest.fn(),
      onStageChange: jest.fn(),
      onSuccess: jest.fn(),
      onFailure: jest.fn(),
    }

    sdk.createDeployment.mockResolvedValueOnce(completedDeployment)
    ;[queuedLogs, initializeLogs, cloneRepoLogs, buildLogs, deployLogs].forEach(
      sdk.getStageLogs.mockResolvedValueOnce,
    )
    sdk.getDeploymentInfo.mockResolvedValueOnce(completedDeployment)

    await expect(deploy(sdk, accountId, mockGithubHandlers)).resolves.toEqual(completedDeployment)

    expect(mockGithubHandlers.onStart).toHaveBeenCalledWith(completedDeployment)
    expect(mockGithubHandlers.onStageChange).toHaveBeenCalledWith('initialize')
  })
})

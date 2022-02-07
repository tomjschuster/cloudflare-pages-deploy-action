import * as actionsCore from '@actions/core'
import { deploy, stagePollIntervalEnvName } from '../src/deploy'
import { Sdk } from '../src/sdk'
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
  activeBuildLogsUnexpectedStatus,
  activeCloneRepoLogsUnexpectedStatus,
  activeDeployLogsUnexpectedStatus,
  activeInitializeLogsUnexpectedStatus,
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

const getProject: jest.Mock<ReturnType<Sdk['getProject']>> = jest.fn()
const createDeployment: jest.Mock<ReturnType<Sdk['createDeployment']>> = jest.fn()
const getDeploymentInfo: jest.Mock<ReturnType<Sdk['getDeploymentInfo']>> = jest.fn()
const getStageLogs: jest.Mock<ReturnType<Sdk['getStageLogs']>> = jest.fn()

const sdk = { getProject, createDeployment, getDeploymentInfo, getStageLogs }

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
    sdk.getStageLogs.mockResolvedValueOnce(activeQueuedLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeQueuedLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeInitializeLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeInitializeLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeCloneRepoLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeCloneRepoLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeBuildLogs)
    sdk.getStageLogs.mockResolvedValueOnce(stillActiveBuildLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeBuildLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeDeployLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeDeployLogs)
    sdk.getDeploymentInfo.mockResolvedValueOnce(completeLiveDeployment)

    await expect(deploy(sdk)).resolves.toEqual(completeLiveDeployment)
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(11)
    // extra log for build
    expect(consoleSpy).toHaveBeenCalledTimes(11)
    expect(startGroupSpy).toHaveBeenCalledTimes(5)
    expect(endGroupSpy).toHaveBeenCalledTimes(5)
  })

  it('skips queue when already completed', async () => {
    sdk.createDeployment.mockResolvedValueOnce(initialLiveDeployment)
    sdk.getStageLogs.mockResolvedValueOnce(completeQueuedLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeInitializeLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeInitializeLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeCloneRepoLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeCloneRepoLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeBuildLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeBuildLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeDeployLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeDeployLogs)
    sdk.getDeploymentInfo.mockResolvedValueOnce(completeLiveDeployment)

    await expect(deploy(sdk)).resolves.toEqual(completeLiveDeployment)
    // 1 call for queued stage, 2 logs for each other stage
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(9)
    // Skip queued stage, 2 logs for each other stage, extra log for build
    expect(consoleSpy).toHaveBeenCalledTimes(9)
    expect(startGroupSpy).toHaveBeenCalledTimes(4)
    expect(endGroupSpy).toHaveBeenCalledTimes(4)
  })

  it('logs all, already completed stages, skipping queued', async () => {
    sdk.createDeployment.mockResolvedValueOnce(completedDeployment)
    sdk.getStageLogs.mockResolvedValueOnce(queuedLogs)
    sdk.getStageLogs.mockResolvedValueOnce(initializeLogs)
    sdk.getStageLogs.mockResolvedValueOnce(cloneRepoLogs)
    sdk.getStageLogs.mockResolvedValueOnce(buildLogs)
    sdk.getStageLogs.mockResolvedValueOnce(deployLogs)
    sdk.getDeploymentInfo.mockResolvedValueOnce(completedDeployment)

    await expect(deploy(sdk)).resolves.toEqual(completedDeployment)
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(5)
    // Skip queued stage, 2 logs for each other stage, extra log for build
    expect(consoleSpy).toHaveBeenCalledTimes(9)
    expect(startGroupSpy).toHaveBeenCalledTimes(4)
    expect(endGroupSpy).toHaveBeenCalledTimes(4)
  })

  it('logs a single, already completed stage', async () => {
    sdk.createDeployment.mockResolvedValueOnce(oneStageDeployment)
    sdk.getStageLogs.mockResolvedValueOnce(oneStageDeployLogs)
    sdk.getDeploymentInfo.mockResolvedValueOnce(oneStageDeployment)

    await expect(deploy(sdk)).resolves.toEqual(oneStageDeployment)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect(startGroupSpy).toHaveBeenCalledTimes(1)
    expect(endGroupSpy).toHaveBeenCalledTimes(1)
  })

  it('logs nothing and returns deployment when no stages', async () => {
    sdk.createDeployment.mockResolvedValueOnce(noStageDeployment)
    sdk.getDeploymentInfo.mockResolvedValueOnce(noStageDeployment)

    await expect(deploy(sdk)).resolves.toEqual(noStageDeployment)
    expect(consoleSpy).not.toHaveBeenCalled()
    expect(startGroupSpy).not.toHaveBeenCalled()
    expect(endGroupSpy).not.toHaveBeenCalled()
  })

  it('logs until failure, then returns deploy', async () => {
    sdk.createDeployment.mockResolvedValueOnce(initialFailedDeployment)
    sdk.getStageLogs.mockResolvedValueOnce(completeFailureQueuedLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeFailureInitializeLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeFailureInitializeLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeFailureCloneRepoLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeFailureCloneRepoLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeFailureBuildLogs)
    sdk.getStageLogs.mockResolvedValueOnce(failedFailureBuildLogs)
    sdk.getDeploymentInfo.mockResolvedValueOnce(failedLiveDeployment)

    await expect(deploy(sdk)).resolves.toEqual(failedLiveDeployment)
    // 1 call for queued stage, 2 logs for each other stage, skip deploy
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(7)
    // Skip queued stage, 2 logs for each other stage, extra log for build, skip deploy
    expect(consoleSpy).toHaveBeenCalledTimes(7)
    expect(startGroupSpy).toHaveBeenCalledTimes(3)
    expect(endGroupSpy).toHaveBeenCalledTimes(3)
  })

  it('handles unknown stages', async () => {
    sdk.createDeployment.mockResolvedValueOnce(initialLiveDeploymentUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(activeQueuedLogsUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(completeQueuedLogsUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(activeInitializeLogsUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(completeInitializeLogsUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(activeCloneRepoLogsUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(completeCloneRepoLogsUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(activeTestLogsUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(completeTestLogsUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(activeBuildLogsUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(completeBuildLogsUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(activeDeployLogsUnexpectedStage)
    sdk.getStageLogs.mockResolvedValueOnce(completeDeployLogsUnexpectedStage)
    sdk.getDeploymentInfo.mockResolvedValueOnce(completeLiveDeploymentUnexpectedStage)

    await expect(deploy(sdk)).resolves.toEqual(completeLiveDeploymentUnexpectedStage)
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(12)
    // extra log for build
    expect(consoleSpy).toHaveBeenCalledTimes(13)
    expect(startGroupSpy).toHaveBeenCalledTimes(6)
    expect(endGroupSpy).toHaveBeenCalledTimes(6)
  })

  it.skip('handles unknown statuses', async () => {
    sdk.createDeployment.mockResolvedValueOnce(initialLiveDeploymentUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(activeQueuedLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(completeQueuedLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(activeInitializeLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(completeInitializeLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(activeCloneRepoLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(completeCloneRepoLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(skippedTestLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(skippedTestLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(skippedTestLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(skippedTestLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(skippedTestLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(activeBuildLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(completeBuildLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(activeDeployLogsUnexpectedStatus)
    sdk.getStageLogs.mockResolvedValueOnce(completeDeployLogsUnexpectedStatus)
    sdk.getDeploymentInfo.mockResolvedValueOnce(completeLiveDeploymentUnexpectedStatus)

    await expect(deploy(sdk)).resolves.toEqual(completeLiveDeploymentUnexpectedStatus)
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(12)
    // extra log for build
    expect(consoleSpy).toHaveBeenCalledTimes(6)
    expect(startGroupSpy).toHaveBeenCalledTimes(4)
    expect(endGroupSpy).toHaveBeenCalledTimes(4)
  })
})

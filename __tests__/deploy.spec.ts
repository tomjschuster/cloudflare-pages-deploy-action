import * as actionsCore from '@actions/core'
import { deploy } from '../src/deploy'
import { Sdk } from '../src/sdk'
import { StagePollIntervalConfig } from '../src/types'
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
} from '../__fixtures__/liveDeployment'
import { noStageDeployment } from '../__fixtures__/noStageDeployment'
import { oneStageDeployLogs, oneStageDeployment } from '../__fixtures__/oneStageDeployment'

const getProject: jest.Mock<ReturnType<Sdk['getProject']>> = jest.fn()
const createDeployment: jest.Mock<ReturnType<Sdk['createDeployment']>> = jest.fn()
const getDeploymentInfo: jest.Mock<ReturnType<Sdk['getDeploymentInfo']>> = jest.fn()
const getStageLogs: jest.Mock<ReturnType<Sdk['getStageLogs']>> = jest.fn()

const sdk = { getProject, createDeployment, getDeploymentInfo, getStageLogs }

const pollConfig: StagePollIntervalConfig = {
  queued: 0,
  initialize: 0,
  clone_repo: 0,
  build: 0,
  deploy: 0,
}

describe('deploy', () => {
  let consoleSpy: jest.SpyInstance
  let startGroupSpy: jest.SpyInstance
  let endGroupSpy: jest.SpyInstance

  beforeEach(() => {
    jest.resetAllMocks()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    startGroupSpy = jest.spyOn(actionsCore, 'startGroup').mockImplementation(() => undefined)
    endGroupSpy = jest.spyOn(actionsCore, 'endGroup').mockImplementation(() => undefined)
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
    sdk.getStageLogs.mockResolvedValueOnce(completeBuildLogs)
    sdk.getStageLogs.mockResolvedValueOnce(activeDeployLogs)
    sdk.getStageLogs.mockResolvedValueOnce(completeDeployLogs)
    sdk.getDeploymentInfo.mockResolvedValueOnce(completeLiveDeployment)

    await expect(deploy(sdk, pollConfig)).resolves.toEqual(completeLiveDeployment)
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(10)
    expect(consoleSpy).toHaveBeenCalledTimes(10)
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

    await expect(deploy(sdk, pollConfig)).resolves.toEqual(completeLiveDeployment)
    // 1 call for queued stage, 2 logs for each other stage
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(9)
    // Skip queued stage, 2 logs for each other stage
    expect(consoleSpy).toHaveBeenCalledTimes(8)
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
    // Skip queued stage, 2 logs for each other stage
    expect(consoleSpy).toHaveBeenCalledTimes(8)
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

    await expect(deploy(sdk, pollConfig)).resolves.toEqual(failedLiveDeployment)
    // 1 call for queued stage, 2 logs for each other stage, skip deploy
    expect(sdk.getStageLogs).toHaveBeenCalledTimes(7)
    // Skip queued stage, 2 logs for each other stage, skip deploy
    expect(consoleSpy).toHaveBeenCalledTimes(6)
    expect(startGroupSpy).toHaveBeenCalledTimes(3)
    expect(endGroupSpy).toHaveBeenCalledTimes(3)
  })
})

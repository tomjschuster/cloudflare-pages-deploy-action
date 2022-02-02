import { getInput, setFailed, setOutput } from '@actions/core'
import { deploy } from '../src/deploy'
import { run } from '../src/run'
import createSdk from '../src/sdk'
import { completedDeployment } from '../__fixtures__/completedDeployment'
import { failedLiveDeployment } from '../__fixtures__/failedDeployment'

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
}))
jest.mock('../src/deploy', () => ({ deploy: jest.fn() }))
jest.mock('../src/sdk', () => ({ __esModule: true, default: jest.fn() }))

describe('run', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    ;(getInput as jest.Mock).mockReturnValueOnce('accountId')
    ;(getInput as jest.Mock).mockReturnValueOnce('apiKey')
    ;(getInput as jest.Mock).mockReturnValueOnce('email')
    ;(getInput as jest.Mock).mockReturnValueOnce('projectName')
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  it('creates an sdk with the proper inputs', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)

    await run()

    expect(createSdk).toHaveBeenCalledWith({
      apiKey: 'apiKey',
      email: 'email',
      accountId: 'accountId',
      projectName: 'projectName',
    })
  })

  it('sets outputs with the created deployment', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(completedDeployment)

    await run()

    expect(setOutput).toHaveBeenNthCalledWith(1, 'deployment-id', completedDeployment.id)
    expect(setOutput).toHaveBeenNthCalledWith(2, 'url', completedDeployment.url)
  })

  it('exits with an error when deploy fails', async () => {
    ;(deploy as jest.Mock).mockResolvedValueOnce(failedLiveDeployment)

    await run()

    expect(setFailed).toHaveBeenCalled()
  })
})

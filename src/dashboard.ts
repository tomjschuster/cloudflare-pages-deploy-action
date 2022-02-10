import { Deployment } from './types'

export function dashboardDeploymentUrl(
  accountId: string,
  projectName: string,
  deployment?: Deployment,
): string {
  if (!deployment) {
    return baseDashboardUrl(accountId, projectName)
  }

  return `${baseDashboardUrl(accountId, projectName)}/${deployment.id}`
}

export function dashboardBuildDeploymentsSettingsUrl(
  accountId: string,
  projectName: string,
): string {
  return `${dashboardDeploymentUrl(accountId, projectName)}/settings/builds-deployments`
}

function baseDashboardUrl(accountId: string, projectName: string): string {
  return `https://dash.cloudflare.com/${accountId}/pages/view/${projectName}`
}

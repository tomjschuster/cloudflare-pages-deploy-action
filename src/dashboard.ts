export function dashboardDeploymentUrl(
  accountId: string,
  projectName: string,
  deploymentId?: string,
): string {
  if (!deploymentId) {
    return baseDashboardUrl(accountId, projectName)
  }

  return `${baseDashboardUrl(accountId, projectName)}/${deploymentId}`
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

'use server'
import { revalidatePath } from "next/cache"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { resolveConnectionCredentials } from "@/modules/infrastructure/integrations/connection-secrets"
import { BitbucketAdapter } from "@/modules/infrastructure/integrations/adapters/bitbucket-adapter"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { hasRole } from "@/modules/core/iam/services/org-roles"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { taskVcsService } from "../services/task-vcs-service"
import { TaskVcsLink } from "../types/vcs"

/**
 * Fetch all VCS links for a given task
 */
export async function getTaskVcsLinksAction(taskId: string): Promise<TaskVcsLink[]> {
  if (!taskId) return []
  return await taskVcsService.getTaskVcsLinks(taskId)
}

/**
 * Delete a VCS link from a task
 */
export async function unlinkVcsResourceAction(linkId: string, taskId: string): Promise<{ success: boolean; error?: string }> {
  const orgId = await getCurrentOrganizationId()
  if (!orgId) return { success: false, error: 'No organization context' }

  const success = await taskVcsService.deleteVcsLink(linkId, orgId)
  if (success) {
    revalidatePath('/operations/tasks')
  }
  return { success }
}

/**
 * List available Bitbucket repositories for project settings dropdown
 */
export async function getBitbucketRepositoriesAction(): Promise<{
  connected: boolean
  canManageIntegrations?: boolean
  repositories: Array<{
    full_name: string
    name: string
    slug: string
    is_private: boolean
    html_url: string
    default_branch?: string
  }>
  workspace?: string
}> {
  const orgId = await getCurrentOrganizationId()
  if (!orgId) return { connected: false, repositories: [], canManageIntegrations: false }

  let canManageIntegrations = false
  try {
    const [canManagePerm, isAdminRole] = await Promise.all([
      hasPermission(PERMISSIONS.ORG.MANAGE_INTEGRATIONS).catch(() => false),
      hasRole('admin').catch(() => false)
    ])
    canManageIntegrations = Boolean(canManagePerm || isAdminRole)
  } catch {
    canManageIntegrations = false
  }

  const supabase = await createClient()
  const { data: conn } = await supabase
    .from('integration_connections')
    .select('id, credentials, metadata')
    .eq('organization_id', orgId)
    .eq('provider_key', 'bitbucket')
    .neq('status', 'deleted')
    .limit(1)
    .maybeSingle()

  if (!conn) return { connected: false, repositories: [], canManageIntegrations }

  try {
    const creds = await resolveConnectionCredentials(conn.credentials)
    const adapter = new BitbucketAdapter()
    const repos = await adapter.getRepositories(creds)
    return {
      connected: true,
      canManageIntegrations,
      repositories: repos,
      workspace: creds.workspace
    }
  } catch (err) {
    console.error('[VCS Actions] Error fetching Bitbucket repositories:', err)
    return {
      connected: true,
      canManageIntegrations,
      repositories: [],
      workspace: conn.metadata?.workspace
    }
  }
}

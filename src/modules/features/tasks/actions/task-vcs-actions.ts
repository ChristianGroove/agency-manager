'use server'
import { revalidatePath } from "next/cache"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { resolveConnectionCredentials } from "@/modules/infrastructure/integrations/connection-secrets"
import { BitbucketAdapter } from "@/modules/infrastructure/integrations/adapters/bitbucket-adapter"
import { GithubAdapter } from "@/modules/infrastructure/integrations/adapters/github-adapter"
import { hasPermission } from "@/modules/core/iam/services/role-service"
import { hasRole } from "@/modules/core/iam/services/org-roles"
import { PERMISSIONS } from "@/modules/core/iam/actions/permissions"
import { taskVcsService } from "../services/task-vcs-service"
import { TaskVcsLink } from "../types/vcs"

/**
 * Fetch all VCS links for a given task (scoped by current organization context)
 */
export async function getTaskVcsLinksAction(taskId: string): Promise<TaskVcsLink[]> {
  if (!taskId) return []
  const orgId = await getCurrentOrganizationId()
  if (!orgId) return []
  return await taskVcsService.getTaskVcsLinks(taskId, orgId)
}

/**
 * Delete a VCS link from a task
 */
export async function unlinkVcsResourceAction(linkId: string, taskId: string): Promise<{ success: boolean; error?: string }> {
  if (!linkId) return { success: false, error: 'ID de recurso VCS requerido' }
  const orgId = await getCurrentOrganizationId()
  if (!orgId) return { success: false, error: 'No organization context' }

  let canManage = false
  try {
    const [canManageTasks, isAdmin, isStaff] = await Promise.all([
      hasPermission(PERMISSIONS.OPERATIONS.TASKS_MANAGE).catch(() => false),
      hasRole('admin').catch(() => false),
      hasRole('staff').catch(() => false)
    ])
    canManage = Boolean(canManageTasks || isAdmin || isStaff)
  } catch {
    canManage = false
  }
  if (!canManage) {
    return { success: false, error: 'No autorizado para desvincular recursos de control de versiones' }
  }

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

  // Security Guard: Non-admin users without MANAGE_INTEGRATIONS cannot list private company repositories
  if (!canManageIntegrations) {
    return {
      connected: true,
      canManageIntegrations: false,
      repositories: [],
      workspace: conn.metadata?.workspace
    }
  }

  try {
    const creds = await resolveConnectionCredentials(conn.credentials)
    const adapter = new BitbucketAdapter()
    const workspace = creds.workspace || conn.metadata?.workspace
    const repos = await adapter.getRepositories({
      ...creds,
      workspace
    })
    return {
      connected: true,
      canManageIntegrations,
      repositories: repos,
      workspace
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

/**
 * List available GitHub repositories for project settings dropdown
 */
export async function getGithubRepositoriesAction(): Promise<{
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
  owner?: string
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
    .eq('provider_key', 'github')
    .neq('status', 'deleted')
    .limit(1)
    .maybeSingle()

  if (!conn) return { connected: false, repositories: [], canManageIntegrations }

  // Security Guard: Non-admin users without MANAGE_INTEGRATIONS cannot list private company repositories
  if (!canManageIntegrations) {
    return {
      connected: true,
      canManageIntegrations: false,
      repositories: [],
      owner: conn.metadata?.owner
    }
  }

  try {
    const creds = await resolveConnectionCredentials(conn.credentials)
    const adapter = new GithubAdapter()
    const owner = creds.owner || conn.metadata?.owner
    const repos = await adapter.getRepositories({
      ...creds,
      owner
    })
    return {
      connected: true,
      canManageIntegrations,
      repositories: repos,
      owner
    }
  } catch (err) {
    console.error('[VCS Actions] Error fetching GitHub repositories:', err)
    return {
      connected: true,
      canManageIntegrations,
      repositories: [],
      owner: conn.metadata?.owner
    }
  }
}

export interface VcsUnifiedRepository {
  full_name: string
  name: string
  slug: string
  is_private: boolean
  html_url: string
  default_branch?: string
  provider: 'github' | 'bitbucket'
}

/**
 * List unified repositories across all connected VCS providers (Bitbucket and GitHub)
 */
export async function getVcsRepositoriesAction(): Promise<{
  connected: boolean
  hasBitbucket: boolean
  hasGithub: boolean
  canManageIntegrations?: boolean
  repositories: VcsUnifiedRepository[]
  workspace?: string
  owner?: string
}> {
  const [bitbucketRes, githubRes] = await Promise.all([
    getBitbucketRepositoriesAction(),
    getGithubRepositoriesAction()
  ])

  const connected = bitbucketRes.connected || githubRes.connected
  const canManageIntegrations = bitbucketRes.canManageIntegrations || githubRes.canManageIntegrations

  const unifiedRepos: VcsUnifiedRepository[] = [
    ...(bitbucketRes.repositories || []).map((r) => ({
      ...r,
      provider: 'bitbucket' as const
    })),
    ...(githubRes.repositories || []).map((r) => ({
      ...r,
      provider: 'github' as const
    }))
  ]

  return {
    connected,
    hasBitbucket: bitbucketRes.connected,
    hasGithub: githubRes.connected,
    canManageIntegrations,
    repositories: unifiedRepos,
    workspace: bitbucketRes.workspace,
    owner: githubRes.owner
  }
}

/**
 * Universal Version Control System (VCS) Abstraction Layer for Pixy Tasks
 * Supported providers: Bitbucket, GitHub, GitLab
 */

export type VcsProviderType = 'bitbucket' | 'github' | 'gitlab';

export type VcsResourceType = 'branch' | 'pull_request' | 'commit';

export interface TaskVcsLink {
  id: string;
  organization_id: string;
  task_id: string;
  provider: VcsProviderType;
  resource_type: VcsResourceType;
  external_id: string;
  repository_name: string;
  title: string;
  url: string;
  status?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TaskVcsResource {
  provider: VcsProviderType;
  resource_type: VcsResourceType;
  external_id: string;
  repository_name: string;
  title: string;
  url: string;
  status?: string | null;
  metadata?: Record<string, any>;
}

export interface ProjectVcsSettings {
  enabled: boolean;
  provider: VcsProviderType;
  repository?: string; // e.g. "workspace/repo-slug"
  repositories?: string[]; // multi-repo support (e.g. ["workspace/repo1", "workspace/repo2"])
  auto_transitions?: boolean;
  default_branch?: string;
  inherited_from_workspace?: boolean;
}

export interface VcsCommitInfo {
  hash: string;
  message: string;
  authorName?: string;
  authorEmail?: string;
  date?: string;
  url?: string;
}

export interface VcsPullRequestInfo {
  id: string;
  title: string;
  description?: string;
  state: 'OPEN' | 'MERGED' | 'DECLINED' | 'SUPERSEDED' | string;
  sourceBranch: string;
  destinationBranch: string;
  authorName?: string;
  url: string;
  commentCount?: number;
}

export interface VcsBranchInfo {
  name: string;
  url?: string;
  repository: string;
}

export interface VcsPayloadEvent {
  provider: VcsProviderType;
  eventKey: string;
  connectionId: string;
  organizationId: string;
  payload: Record<string, any>;
}

/**
 * Standard git branch name generator for Pixy tasks.
 * Normalizes ticket codes, strips accents, removes invalid characters, and prevents trailing dashes.
 * Example: "PIX-101", "Implement OAuth 2.0 flow" -> "feature/pix-101-implement-oauth-2-0-flow"
 */
export function generateGitBranchName(ticketCode: string, title?: string): string {
  const cleanCode = (ticketCode || 'task').trim().toLowerCase()
  const cleanSlug = (title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 45)
    .replace(/^-+|-+$/g, '')

  return cleanSlug ? `feature/${cleanCode}-${cleanSlug}` : `feature/${cleanCode}`
}


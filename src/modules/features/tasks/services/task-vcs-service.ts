import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import {
  TaskVcsLink,
  TaskVcsResource,
  VcsPayloadEvent,
  VcsProviderType,
  VcsResourceType,
  generateGitBranchName
} from '../types/vcs'
import {
  logTaskAuditComment,
  handleTaskUnblocking,
  notifyStakeholdersOnStatusChange
} from '../actions/task-actions'
import { TaskStatus, parseTaskChecklist } from '../types'

/**
 * Regex for standard ticket codes, e.g. PIX-101, PROJ-42, DEV-999, B2B-12
 * Handles prefixes with letters and numbers (as allowed in Pixy workspaces) and followed by word boundaries, hyphens or underscores.
 */
const TICKET_CODE_PATTERN = '(?<=^|[^a-zA-Z0-9])([A-Za-z][A-Za-z0-9]{1,14}-\\d+)(?=[^a-zA-Z0-9]|$)'

/**
 * Regex for worklog notations in commit messages, e.g. [1.5h], [2h], [30m], [45min]
 */
const WORKLOG_PATTERN = '\\[\\s*(\\d+(?:\\.\\d+)?)\\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\\s*\\]'

/**
 * Normalizes a repository identifier by trimming, converting to lowercase,
 * stripping protocols (http/https/git), removing .git suffix, and stripping leading/trailing slashes.
 * e.g. "https://bitbucket.org/owner/repo.git" -> "owner/repo"
 * e.g. "git@bitbucket.org:owner/repo.git" -> "owner/repo"
 * e.g. "owner/repo/" -> "owner/repo"
 */
export function normalizeRepositorySlug(repo: string): string {
  if (!repo) return ''
  let cleaned = repo.trim().toLowerCase()
  cleaned = cleaned.replace(/^https?:\/\/[^/]+\//, '')
  cleaned = cleaned.replace(/^git@[^:]+:/, '')
  cleaned = cleaned.replace(/\.git$/i, '')
  cleaned = cleaned.replace(/^\/+|\/+$/g, '')
  return cleaned
}

export class TaskVcsService {
  /**
   * Extract unique normalized ticket codes from arbitrary text (branch names, PR titles, commits)
   */
  extractTicketCodes(text: string): string[] {
    if (!text) return []
    const regex = new RegExp(TICKET_CODE_PATTERN, 'gi')
    const matches = Array.from(text.matchAll(regex)).map((m) => m[1].toUpperCase())
    return Array.from(new Set(matches))
  }

  /**
   * Extract total logged hours from commit message brackets like [1.5h] or [30m]
   */
  extractWorklogHours(text: string): number {
    if (!text) return 0
    let totalHours = 0
    const regex = new RegExp(WORKLOG_PATTERN, 'gi')
    const matches = Array.from(text.matchAll(regex))

    for (const match of matches) {
      const val = parseFloat(match[1])
      const unit = match[2].toLowerCase()
      if (isNaN(val) || val <= 0) continue

      if (unit.startsWith('m')) {
        totalHours += Math.round((val / 60) * 100) / 100
      } else {
        totalHours += Math.round(val * 100) / 100
      }
    }

    return Math.round(totalHours * 100) / 100
  }

  /**
   * Generates a standard git branch checkout command and name from ticket code & title
   */
  generateGitBranchName(ticketCode: string, title?: string): string {
    return generateGitBranchName(ticketCode, title)
  }

  /**
   * Evaluates checklist completion for a task, returning effective status and progress.
   * Enforces the 95% hold rule: if deliverables exist and any are unfinished, status is held in in_review (95%).
   * When all are finished (or checklist is empty), status progresses to done (100%).
   */
  evaluateChecklistDeliverables(checklist: any): {
    hasUnfinished: boolean
    effectiveProgress: number
    effectiveStatus: TaskStatus
  } {
    const list = parseTaskChecklist(checklist)
    const hasUnfinished = list.length > 0 && list.some((item) => !item.completed)

    return {
      hasUnfinished,
      effectiveProgress: hasUnfinished ? 95 : 100,
      effectiveStatus: hasUnfinished ? 'in_review' : 'done'
    }
  }

  /**
   * Centralized state machine for automated task lifecycle transitions triggered by VCS events.
   * Enforces:
   * - Opt-out honoring via project.settings.vcs.auto_transitions !== false
   * - Terminal governance: completed (done) tasks cannot be altered by automation
   * - Blocker governance: tasks blocked by an incomplete predecessor cannot advance to done
   * - 95% deliverable hold rule: tasks with incomplete checklist items stop at 95% in in_review
   * - Cascade unblocking: completing a task triggers unblocking of all dependent successors
   */
  async handleVcsAutoTransition(params: {
    organizationId: string
    task: any
    trigger: 'branch_created' | 'commit_pushed' | 'pr_opened' | 'pr_merged'
    provider?: VcsProviderType
    context: {
      branchName?: string
      commitHash?: string
      authorName?: string
      prId?: string
      prTitle?: string
    }
  }): Promise<{ transitioned: boolean; newStatus?: TaskStatus; reason?: string }> {
    const { organizationId, task, trigger, context } = params
    const provider: VcsProviderType = params.provider || 'bitbucket'
    const providerName = provider === 'github' ? 'GitHub' : 'Bitbucket'
    const auditTag = provider === 'github' ? 'GitHub VCS' : 'Bitbucket VCS'

    // 1. Opt-out: Honor project settings if auto-transitions explicitly disabled
    const project = Array.isArray(task.project) ? task.project[0] : task.project
    if (project?.settings?.vcs?.enabled === false || project?.settings?.vcs?.auto_transitions === false) {
      return { transitioned: false, reason: 'auto_transitions_disabled' }
    }

    // 2. Terminal Governance: Completed tasks cannot be modified by automation
    if (task.status === 'done') {
      return { transitioned: false, reason: 'terminal_status_locked' }
    }

    const prevStatus = task.status as TaskStatus

    switch (trigger) {
      case 'branch_created': {
        if (task.status === 'backlog' || task.status === 'todo') {
          const auditMsg = `🌱 Tarea iniciada por creación de rama Git: "${context.branchName || 'nueva rama'}"`
          await this.transitionTaskStatus(
            organizationId,
            task.id,
            prevStatus,
            'in_progress',
            25,
            auditMsg,
            provider
          )
          return { transitioned: true, newStatus: 'in_progress' }
        }
        return { transitioned: false, reason: 'status_not_eligible' }
      }

      case 'commit_pushed': {
        if (task.status === 'backlog' || task.status === 'todo') {
          const hashShort = context.commitHash ? context.commitHash.slice(0, 7) : 'commit'
          const author = context.authorName || 'Desarrollador'
          const auditMsg = `🌱 Tarea iniciada por commit Git: ${hashShort} por ${author}`
          await this.transitionTaskStatus(
            organizationId,
            task.id,
            prevStatus,
            'in_progress',
            25,
            auditMsg,
            provider
          )
          return { transitioned: true, newStatus: 'in_progress' }
        }
        return { transitioned: false, reason: 'status_not_eligible' }
      }

      case 'pr_opened': {
        if (task.status !== 'in_review' && task.status !== 'done') {
          const nextProgress = Math.max(task.progress_percentage || 0, 85)
          const prNum = context.prId ? `#${context.prId}` : 'PR'
          const author = context.authorName || 'Desarrollador'
          const title = context.prTitle ? ` ("${context.prTitle}")` : ''
          const auditMsg = `🔍 Pull Request ${prNum}${title} enviado a Revisión / QA por ${author}.`

          await this.transitionTaskStatus(
            organizationId,
            task.id,
            prevStatus,
            'in_review',
            nextProgress,
            auditMsg,
            provider
          )
          return { transitioned: true, newStatus: 'in_review' }
        }
        return { transitioned: false, reason: 'status_not_eligible' }
      }

      case 'pr_merged': {
        const prNum = context.prId ? `#${context.prId}` : 'PR'

        // 3. Predecessor Blocker Governance: Check if prerequisite task is incomplete
        if (task.blocked_by_task_id) {
          const { data: blocker } = await supabaseAdmin
            .from('task_items')
            .select('id, ticket_code, title, status')
            .eq('id', task.blocked_by_task_id)
            .maybeSingle()

          if (blocker && blocker.status !== 'done') {
            await supabaseAdmin
              .from('task_items')
              .update({
                status: 'in_review',
                progress_percentage: 95,
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id)

            const blockerAudit = `⚠️ Pull Request ${prNum} fusionado en ${providerName}, pero el ticket depende de #${blocker.ticket_code} (${blocker.title}) que aún está pendiente (${blocker.status}). Se mantiene en Revisión / QA (95%).`

            if (prevStatus !== 'in_review') {
              await notifyStakeholdersOnStatusChange(
                organizationId,
                task.id,
                'in_review',
                prevStatus,
                auditTag,
                undefined,
                undefined,
                blockerAudit
              )
            } else {
              await logTaskAuditComment(
                organizationId,
                task.id,
                blockerAudit,
                auditTag
              )
            }

            return { transitioned: true, newStatus: 'in_review', reason: 'blocked_by_predecessor' }
          }
        }

        // 4. Deliverables Checklist 95% Rule
        const { hasUnfinished } = this.evaluateChecklistDeliverables(task.checklist)

        if (hasUnfinished) {
          await supabaseAdmin
            .from('task_items')
            .update({
              status: 'in_review',
              progress_percentage: 95,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id)

          const auditMsg = `⚠️ Pull Request ${prNum} fusionado en ${providerName}, pero el ticket contiene entregables pendientes en el checklist de control. El avance se retiene en el 95% a la espera de la validación final del equipo.`

          if (prevStatus !== 'in_review') {
            await notifyStakeholdersOnStatusChange(
              organizationId,
              task.id,
              'in_review',
              prevStatus,
              auditTag,
              undefined,
              undefined,
              auditMsg
            )
          } else {
            await logTaskAuditComment(
              organizationId,
              task.id,
              auditMsg,
              auditTag
            )
          }

          return { transitioned: true, newStatus: 'in_review', reason: 'unfinished_deliverables_95' }
        } else {
          // Task completes at 100% and triggers cascade unblocking
          await supabaseAdmin
            .from('task_items')
            .update({
              status: 'done',
              progress_percentage: 100,
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id)

          const auditMsg = `🎉 Pull Request ${prNum} fusionado exitosamente en ${providerName}. Todos los entregables validados. Tarea marcada como Completada.`

          await notifyStakeholdersOnStatusChange(
            organizationId,
            task.id,
            'done',
            prevStatus,
            auditTag,
            undefined,
            undefined,
            auditMsg
          )

          await handleTaskUnblocking(task.id, task.ticket_code, task.title)

          return { transitioned: true, newStatus: 'done' }
        }
      }

      default:
        return { transitioned: false, reason: 'unknown_trigger' }
    }
  }

  /**
   * Upsert a VCS resource link into task_vcs_links
   */
  async syncVcsResource(
    organizationId: string,
    taskId: string,
    resource: TaskVcsResource
  ): Promise<TaskVcsLink | null> {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabaseAdmin
        .from('task_vcs_links')
        .upsert(
          {
            organization_id: organizationId,
            task_id: taskId,
            provider: resource.provider,
            resource_type: resource.resource_type,
            external_id: resource.external_id,
            repository_name: resource.repository_name,
            title: resource.title,
            url: resource.url,
            status: resource.status || null,
            metadata: resource.metadata || {},
            updated_at: now
          },
          { onConflict: 'task_id,provider,resource_type,external_id' }
        )
        .select('*')
        .single()

      if (error) {
        console.error('[TaskVcsService] Error syncing VCS resource:', error)
        return null
      }

      return data as TaskVcsLink
    } catch (err) {
      console.error('[TaskVcsService] syncVcsResource exception:', err)
      return null
    }
  }

  /**
   * Fetch all VCS links attached to a task, scoped by organizationId if provided
   */
  async getTaskVcsLinks(taskId: string, organizationId?: string): Promise<TaskVcsLink[]> {
    try {
      let query = supabaseAdmin
        .from('task_vcs_links')
        .select('*')
        .eq('task_id', taskId)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('[TaskVcsService] Error fetching VCS links:', error)
        return []
      }

      return (data || []) as TaskVcsLink[]
    } catch (err) {
      console.error('[TaskVcsService] getTaskVcsLinks exception:', err)
      return []
    }
  }

  /**
   * Delete a specific VCS link
   */
  async deleteVcsLink(linkId: string, organizationId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('task_vcs_links')
        .delete()
        .eq('id', linkId)
        .eq('organization_id', organizationId)

      return !error
    } catch (err) {
      console.error('[TaskVcsService] deleteVcsLink exception:', err)
      return false
    }
  }

  /**
   * Core Webhook Orchestrator: Process incoming Bitbucket VCS event
   */
  async processBitbucketEvent(event: VcsPayloadEvent): Promise<{ processed: boolean; summary?: string }> {
    if (!event || !event.payload) {
      return { processed: false, summary: 'Empty or missing event payload' }
    }

    const { organizationId, eventKey, payload } = event
    const repoFullName = payload.repository?.full_name || 'unknown/repo'

    switch (eventKey) {
      case 'repo:push':
        return await this.handleRepoPush(organizationId, repoFullName, payload)

      case 'pullrequest:created':
      case 'pullrequest:updated':
        return await this.handlePullRequestOpenedOrUpdated(organizationId, repoFullName, payload, eventKey)

      case 'pullrequest:fulfilled':
        return await this.handlePullRequestFulfilled(organizationId, repoFullName, payload)

      case 'pullrequest:rejected':
        return await this.handlePullRequestRejected(organizationId, repoFullName, payload)

      case 'repo:commit_status_created':
      case 'repo:commit_status_updated':
        return await this.handleCommitStatusUpdate(organizationId, payload)

      default:
        console.log(`[TaskVcsService] Unhandled Bitbucket event key: ${eventKey}`)
        return { processed: false, summary: `Ignored event: ${eventKey}` }
    }
  }

  /**
   * Handles repo:push events (new branches and commits)
   */
  private async handleRepoPush(
    organizationId: string,
    repositoryName: string,
    payload: Record<string, any>
  ): Promise<{ processed: boolean; summary: string }> {
    const changes = Array.isArray(payload.push?.changes) ? payload.push.changes : []
    let processedTickets = 0

    for (const change of changes) {
      // 1. Branch Deletion: change.closed === true must NOT trigger branch_created transitions
      if (change.closed) {
        const deletedBranchName = change.old?.name || change.new?.name
        if (deletedBranchName) {
          const branchTickets = this.extractTicketCodes(deletedBranchName)
          for (const ticketCode of branchTickets) {
            const task = await this.findTaskByCode(organizationId, ticketCode, repositoryName)
            if (!task) continue

            const { data: existingLink } = await supabaseAdmin
              .from('task_vcs_links')
              .select('id, metadata')
              .eq('task_id', task.id)
              .eq('provider', 'bitbucket')
              .eq('resource_type', 'branch')
              .eq('external_id', deletedBranchName)
              .maybeSingle()

            if (existingLink) {
              await supabaseAdmin
                .from('task_vcs_links')
                .update({
                  status: 'DELETED',
                  metadata: {
                    ...(existingLink.metadata || {}),
                    deleted_at: new Date().toISOString()
                  }
                })
                .eq('id', existingLink.id)

              processedTickets++
            }
          }
        }
      }

      // 2. Branch Detection: active branch creation
      if (!change.closed && change.new && change.new.type === 'branch') {
        const branchName = change.new.name
        const branchUrl = change.new.links?.html?.href || `https://bitbucket.org/${repositoryName}/branch/${branchName}`
        const branchTickets = this.extractTicketCodes(branchName)

        for (const ticketCode of branchTickets) {
          const task = await this.findTaskByCode(organizationId, ticketCode, repositoryName)
          if (!task) continue

          await this.syncVcsResource(organizationId, task.id, {
            provider: 'bitbucket',
            resource_type: 'branch',
            external_id: branchName,
            repository_name: repositoryName,
            title: branchName,
            url: branchUrl,
            status: 'ACTIVE',
            metadata: {
              target_hash: change.new.target?.hash,
              repository: repositoryName
            }
          })

          await this.handleVcsAutoTransition({
            organizationId,
            task,
            trigger: 'branch_created',
            context: { branchName }
          })

          processedTickets++
        }
      }

      // 3. Commits Detection
      const commits = !change.closed && Array.isArray(change.commits) && change.commits.length > 0
        ? change.commits
        : (!change.closed && change.new?.target)
          ? [change.new.target]
          : []

      for (const commit of commits) {
        const hash = commit.hash
        if (!hash) continue

        const message = commit.message || ''
        const commitUrl = commit.links?.html?.href || `https://bitbucket.org/${repositoryName}/commits/${hash}`
        const authorName = typeof commit.author === 'string'
          ? commit.author.trim()
          : (commit.author?.user?.display_name || commit.author?.name || commit.author?.raw || commit.author?.username || 'Desarrollador Git')
        const commitTickets = this.extractTicketCodes(message)
        const worklogHours = this.extractWorklogHours(message)

        for (const ticketCode of commitTickets) {
          const task = await this.findTaskByCode(organizationId, ticketCode, repositoryName)
          if (!task) continue

          // Idempotency: Check if commit was already linked for this task
          const { data: existingLink } = await supabaseAdmin
            .from('task_vcs_links')
            .select('id')
            .eq('task_id', task.id)
            .eq('provider', 'bitbucket')
            .eq('resource_type', 'commit')
            .eq('external_id', hash)
            .maybeSingle()

          await this.syncVcsResource(organizationId, task.id, {
            provider: 'bitbucket',
            resource_type: 'commit',
            external_id: hash,
            repository_name: repositoryName,
            title: message.trim().split('\n')[0] || `Commit ${hash.slice(0, 7)}`,
            url: commitUrl,
            status: 'COMMITTED',
            metadata: {
              hash,
              author: authorName,
              date: commit.date,
              worklog_hours: worklogHours > 0 ? worklogHours : undefined
            }
          })

          // Only credit worklog hours and execute auto-transition on first delivery
          if (!existingLink) {
            if (worklogHours > 0) {
              const currentActual = Number(task.actual_hours) || 0
              const updatedActual = Math.round((currentActual + worklogHours) * 100) / 100
              task.actual_hours = updatedActual

              await supabaseAdmin
                .from('task_items')
                .update({
                  actual_hours: updatedActual,
                  updated_at: new Date().toISOString()
                })
                .eq('id', task.id)

              await logTaskAuditComment(
                organizationId,
                task.id,
                `⏱️ Registro de trabajo vía Commit Git (${hash.slice(0, 7)}): +${worklogHours}h (Total: ${updatedActual}h) — "${message.trim()}"`,
                'Bitbucket VCS'
              )
            }

            await this.handleVcsAutoTransition({
              organizationId,
              task,
              trigger: 'commit_pushed',
              context: { commitHash: hash, authorName }
            })
          }

          processedTickets++
        }
      }
    }

    return { processed: true, summary: `Processed push with ${processedTickets} ticket associations.` }
  }

  /**
   * Handles pullrequest:created and pullrequest:updated
   */
  private async handlePullRequestOpenedOrUpdated(
    organizationId: string,
    repositoryName: string,
    payload: Record<string, any>,
    eventKey: string
  ): Promise<{ processed: boolean; summary: string }> {
    const pr = payload.pullrequest
    if (!pr) return { processed: false, summary: 'No pullrequest data' }

    const prId = String(pr.id)
    const prTitle = pr.title || ''
    const prUrl = pr.links?.html?.href || `https://bitbucket.org/${repositoryName}/pull-requests/${prId}`
    const sourceBranch = pr.source?.branch?.name || ''
    const destBranch = pr.destination?.branch?.name || ''
    const authorName = typeof pr.author === 'string'
      ? pr.author.trim()
      : (pr.author?.display_name || pr.author?.nickname || pr.author?.raw || pr.author?.username || 'Desarrollador')

    // Extract ticket codes from both PR title and source branch name
    const ticketCodes = Array.from(
      new Set([
        ...this.extractTicketCodes(prTitle),
        ...this.extractTicketCodes(sourceBranch)
      ])
    )

    let processedCount = 0

    for (const code of ticketCodes) {
      const task = await this.findTaskByCode(organizationId, code, repositoryName)
      if (!task) continue

      await this.syncVcsResource(organizationId, task.id, {
        provider: 'bitbucket',
        resource_type: 'pull_request',
        external_id: prId,
        repository_name: repositoryName,
        title: prTitle,
        url: prUrl,
        status: pr.state || 'OPEN',
        metadata: {
          id: prId,
          source_branch: sourceBranch,
          destination_branch: destBranch,
          author: authorName,
          comment_count: pr.comment_count || 0
        }
      })

      await this.handleVcsAutoTransition({
        organizationId,
        task,
        trigger: 'pr_opened',
        context: { prId, prTitle, authorName, branchName: sourceBranch }
      })

      processedCount++
    }

    return { processed: true, summary: `Processed PR #${prId} (${eventKey}) for ${processedCount} tasks.` }
  }

  /**
   * Handles pullrequest:fulfilled (MERGED)
   * Enforces the 95% deliverable checklist rule, blocker governance, and cascades task unblocking
   */
  private async handlePullRequestFulfilled(
    organizationId: string,
    repositoryName: string,
    payload: Record<string, any>
  ): Promise<{ processed: boolean; summary: string }> {
    const pr = payload.pullrequest
    if (!pr) return { processed: false, summary: 'No pullrequest data' }

    const prId = String(pr.id)
    const prTitle = pr.title || ''
    const prUrl = pr.links?.html?.href || `https://bitbucket.org/${repositoryName}/pull-requests/${prId}`
    const sourceBranch = pr.source?.branch?.name || ''
    const authorName = typeof pr.author === 'string'
      ? pr.author.trim()
      : (pr.author?.display_name || pr.author?.nickname || pr.author?.raw || pr.author?.username || 'Desarrollador')

    const ticketCodes = Array.from(
      new Set([
        ...this.extractTicketCodes(prTitle),
        ...this.extractTicketCodes(sourceBranch)
      ])
    )

    let processedCount = 0

    for (const code of ticketCodes) {
      const task = await this.findTaskByCode(organizationId, code, repositoryName)
      if (!task) continue

      // Idempotency: Check if PR was already recorded as MERGED
      const { data: existingPrLink } = await supabaseAdmin
        .from('task_vcs_links')
        .select('id, status')
        .eq('task_id', task.id)
        .eq('provider', 'bitbucket')
        .eq('resource_type', 'pull_request')
        .eq('external_id', prId)
        .maybeSingle()

      const wasAlreadyMerged = existingPrLink?.status === 'MERGED'

      // Update PR link to MERGED
      await this.syncVcsResource(organizationId, task.id, {
        provider: 'bitbucket',
        resource_type: 'pull_request',
        external_id: prId,
        repository_name: repositoryName,
        title: prTitle,
        url: prUrl,
        status: 'MERGED',
        metadata: {
          id: prId,
          source_branch: sourceBranch,
          merged_by: authorName,
          merged_at: new Date().toISOString()
        }
      })

      // Only transition if not previously processed as merged
      if (!wasAlreadyMerged) {
        await this.handleVcsAutoTransition({
          organizationId,
          task,
          trigger: 'pr_merged',
          context: { prId, prTitle, authorName, branchName: sourceBranch }
        })
      }

      processedCount++
    }

    return { processed: true, summary: `Processed merged PR #${prId} for ${processedCount} tasks.` }
  }

  /**
   * Handles pullrequest:rejected (Declined)
   */
  private async handlePullRequestRejected(
    organizationId: string,
    repositoryName: string,
    payload: Record<string, any>
  ): Promise<{ processed: boolean; summary: string }> {
    const pr = payload.pullrequest
    if (!pr) return { processed: false, summary: 'No pullrequest data' }

    const prId = String(pr.id)
    const prTitle = pr.title || ''
    const prUrl = pr.links?.html?.href || `https://bitbucket.org/${repositoryName}/pull-requests/${prId}`
    const sourceBranch = pr.source?.branch?.name || ''

    const ticketCodes = Array.from(
      new Set([
        ...this.extractTicketCodes(prTitle),
        ...this.extractTicketCodes(sourceBranch)
      ])
    )

    for (const code of ticketCodes) {
      const task = await this.findTaskByCode(organizationId, code, repositoryName)
      if (!task) continue

      await this.syncVcsResource(organizationId, task.id, {
        provider: 'bitbucket',
        resource_type: 'pull_request',
        external_id: prId,
        repository_name: repositoryName,
        title: prTitle,
        url: prUrl,
        status: 'DECLINED',
        metadata: {
          id: prId,
          declined_at: new Date().toISOString()
        }
      })

      await logTaskAuditComment(
        organizationId,
        task.id,
        `❌ Pull Request #${prId} ("${prTitle}") fue declinado en Bitbucket sin fusionar.`,
        'Bitbucket VCS'
      )
    }

    return { processed: true, summary: `Processed declined PR #${prId}.` }
  }

  /**
   * Handles CI/CD commit status updates
   */
  private async handleCommitStatusUpdate(
    organizationId: string,
    payload: Record<string, any>
  ): Promise<{ processed: boolean; summary: string }> {
    const commitStatus = payload.commit_status
    if (!commitStatus) return { processed: false, summary: 'No commit_status data' }

    const commitHash = commitStatus.commit?.hash
    const state = commitStatus.state // SUCCESSFUL, FAILED, INPROGRESS
    const buildUrl = commitStatus.url
    const buildName = commitStatus.name || commitStatus.key

    if (!commitHash) return { processed: false, summary: 'No commit hash in status' }

    // Find any vcs link referencing this commit
    const { data: links } = await supabaseAdmin
      .from('task_vcs_links')
      .select('id, metadata, task_id')
      .eq('organization_id', organizationId)
      .eq('external_id', commitHash)

    if (links && links.length > 0) {
      for (const link of links) {
        const metadata = {
          ...(link.metadata || {}),
          ci_status: state,
          ci_url: buildUrl,
          ci_name: buildName,
          ci_updated_at: new Date().toISOString()
        }

        await supabaseAdmin
          .from('task_vcs_links')
          .update({ metadata })
          .eq('id', link.id)
      }
    }

    return { processed: true, summary: `Updated build status ${state} for commit ${commitHash.slice(0, 7)}.` }
  }

  /**
   * Core Webhook Orchestrator: Process incoming GitHub VCS event
   */
  async processGithubEvent(event: VcsPayloadEvent): Promise<{ processed: boolean; summary?: string }> {
    if (!event || !event.payload) {
      return { processed: false, summary: 'Empty or missing event payload' }
    }

    const { organizationId, eventKey, payload } = event
    const repoFullName = payload.repository?.full_name || 'unknown/repo'

    switch (eventKey) {
      case 'ping':
        return { processed: true, summary: 'GitHub ping received' }

      case 'push':
        return await this.handleGithubRepoPush(organizationId, repoFullName, payload)

      case 'pull_request':
        return await this.handleGithubPullRequest(organizationId, repoFullName, payload)

      case 'status':
        return await this.handleGithubCommitStatusUpdate(organizationId, payload)

      default:
        console.log(`[TaskVcsService] Unhandled GitHub event key: ${eventKey}`)
        return { processed: false, summary: `Ignored GitHub event: ${eventKey}` }
    }
  }

  /**
   * Handles GitHub push events (branches and commits)
   */
  private async handleGithubRepoPush(
    organizationId: string,
    repositoryName: string,
    payload: Record<string, any>
  ): Promise<{ processed: boolean; summary: string }> {
    const ref = payload.ref
    if (!ref || typeof ref !== 'string' || !ref.startsWith('refs/heads/')) {
      return { processed: true, summary: 'Ignored non-branch push ref' }
    }

    const branchName = ref.replace(/^refs\/heads\//, '')
    const repoHtmlUrl = payload.repository?.html_url || `https://github.com/${repositoryName}`
    let processedTickets = 0

    // 1. Branch Deletion: payload.deleted === true
    if (payload.deleted === true) {
      const branchTickets = this.extractTicketCodes(branchName)
      for (const ticketCode of branchTickets) {
        const task = await this.findTaskByCode(organizationId, ticketCode, repositoryName)
        if (!task) continue

        const { data: existingLink } = await supabaseAdmin
          .from('task_vcs_links')
          .select('id, metadata')
          .eq('task_id', task.id)
          .eq('provider', 'github')
          .eq('resource_type', 'branch')
          .eq('external_id', branchName)
          .maybeSingle()

        if (existingLink) {
          await supabaseAdmin
            .from('task_vcs_links')
            .update({
              status: 'DELETED',
              metadata: {
                ...(existingLink.metadata || {}),
                deleted_at: new Date().toISOString()
              }
            })
            .eq('id', existingLink.id)

          processedTickets++
        }
      }
      return { processed: true, summary: `Processed GitHub branch deletion for ${branchName} (${processedTickets} tickets)` }
    }

    // 2. Branch Creation: payload.created === true
    if (payload.created === true) {
      const branchTickets = this.extractTicketCodes(branchName)
      for (const ticketCode of branchTickets) {
        const task = await this.findTaskByCode(organizationId, ticketCode, repositoryName)
        if (!task) continue

        await this.syncVcsResource(organizationId, task.id, {
          provider: 'github',
          resource_type: 'branch',
          external_id: branchName,
          repository_name: repositoryName,
          title: branchName,
          url: `${repoHtmlUrl}/tree/${encodeURIComponent(branchName)}`,
          status: 'ACTIVE',
          metadata: {
            target_hash: payload.after,
            repository: repositoryName
          }
        })

        await this.handleVcsAutoTransition({
          organizationId,
          task,
          trigger: 'branch_created',
          provider: 'github',
          context: { branchName }
        })

        processedTickets++
      }
    }

    // 3. Commits & Worklogs Detection
    const commits = Array.isArray(payload.commits) && payload.commits.length > 0
      ? payload.commits
      : (payload.head_commit ? [payload.head_commit] : [])

    for (const commit of commits) {
      const hash = commit.id
      if (!hash) continue

      const message = commit.message || ''
      const commitUrl = commit.url || `${repoHtmlUrl}/commit/${hash}`
      const authorName = commit.author?.name || commit.author?.username || commit.committer?.name || 'Desarrollador Git'
      const commitTickets = this.extractTicketCodes(message)
      const worklogHours = this.extractWorklogHours(message)

      for (const ticketCode of commitTickets) {
        const task = await this.findTaskByCode(organizationId, ticketCode, repositoryName)
        if (!task) continue

        // Idempotency: Check if commit was already linked for this task
        const { data: existingLink } = await supabaseAdmin
          .from('task_vcs_links')
          .select('id')
          .eq('task_id', task.id)
          .eq('provider', 'github')
          .eq('resource_type', 'commit')
          .eq('external_id', hash)
          .maybeSingle()

        await this.syncVcsResource(organizationId, task.id, {
          provider: 'github',
          resource_type: 'commit',
          external_id: hash,
          repository_name: repositoryName,
          title: message.trim().split('\n')[0] || `Commit ${hash.slice(0, 7)}`,
          url: commitUrl,
          status: 'COMMITTED',
          metadata: {
            hash,
            author: authorName,
            date: commit.timestamp,
            worklog_hours: worklogHours > 0 ? worklogHours : undefined
          }
        })

        if (!existingLink) {
          if (worklogHours > 0) {
            const currentActual = Number(task.actual_hours) || 0
            const updatedActual = Math.round((currentActual + worklogHours) * 100) / 100
            task.actual_hours = updatedActual

            await supabaseAdmin
              .from('task_items')
              .update({
                actual_hours: updatedActual,
                updated_at: new Date().toISOString()
              })
              .eq('id', task.id)

            await logTaskAuditComment(
              organizationId,
              task.id,
              `⏱️ Registro de trabajo vía Commit Git (${hash.slice(0, 7)}): +${worklogHours}h (Total: ${updatedActual}h) — "${message.trim()}"`,
              'GitHub VCS'
            )
          }

          await this.handleVcsAutoTransition({
            organizationId,
            task,
            trigger: 'commit_pushed',
            provider: 'github',
            context: { commitHash: hash, authorName }
          })
        }

        processedTickets++
      }
    }

    return { processed: true, summary: `Processed GitHub push with ${processedTickets} ticket associations.` }
  }

  /**
   * Handles GitHub pull_request events (opened, reopened, synchronize, closed)
   */
  private async handleGithubPullRequest(
    organizationId: string,
    repositoryName: string,
    payload: Record<string, any>
  ): Promise<{ processed: boolean; summary: string }> {
    const pr = payload.pull_request
    if (!pr) return { processed: false, summary: 'No pull_request data in GitHub payload' }

    const action = payload.action
    const prId = String(pr.number || pr.id)
    const prTitle = pr.title || ''
    const prUrl = pr.html_url || `https://github.com/${repositoryName}/pull/${prId}`
    const sourceBranch = pr.head?.ref || ''
    const destBranch = pr.base?.ref || ''
    const authorName = pr.user?.login || pr.user?.name || 'Desarrollador'
    const isMerged = pr.merged === true

    const ticketCodes = Array.from(
      new Set([
        ...this.extractTicketCodes(prTitle),
        ...this.extractTicketCodes(sourceBranch)
      ])
    )

    let processedCount = 0

    if (action === 'opened' || action === 'reopened' || action === 'synchronize') {
      for (const code of ticketCodes) {
        const task = await this.findTaskByCode(organizationId, code, repositoryName)
        if (!task) continue

        await this.syncVcsResource(organizationId, task.id, {
          provider: 'github',
          resource_type: 'pull_request',
          external_id: prId,
          repository_name: repositoryName,
          title: prTitle,
          url: prUrl,
          status: (pr.state || 'OPEN').toUpperCase(),
          metadata: {
            id: prId,
            source_branch: sourceBranch,
            destination_branch: destBranch,
            author: authorName,
            comment_count: pr.comments || 0
          }
        })

        await this.handleVcsAutoTransition({
          organizationId,
          task,
          trigger: 'pr_opened',
          provider: 'github',
          context: { prId, prTitle, authorName, branchName: sourceBranch }
        })

        processedCount++
      }

      return { processed: true, summary: `Processed GitHub PR #${prId} (${action}) for ${processedCount} tasks.` }
    }

    if (action === 'closed' && isMerged) {
      for (const code of ticketCodes) {
        const task = await this.findTaskByCode(organizationId, code, repositoryName)
        if (!task) continue

        const { data: existingPrLink } = await supabaseAdmin
          .from('task_vcs_links')
          .select('id, status')
          .eq('task_id', task.id)
          .eq('provider', 'github')
          .eq('resource_type', 'pull_request')
          .eq('external_id', prId)
          .maybeSingle()

        const wasAlreadyMerged = existingPrLink?.status === 'MERGED'

        await this.syncVcsResource(organizationId, task.id, {
          provider: 'github',
          resource_type: 'pull_request',
          external_id: prId,
          repository_name: repositoryName,
          title: prTitle,
          url: prUrl,
          status: 'MERGED',
          metadata: {
            id: prId,
            source_branch: sourceBranch,
            destination_branch: destBranch,
            merged_by: pr.merged_by?.login || authorName,
            merged_at: pr.merged_at || new Date().toISOString()
          }
        })

        if (!wasAlreadyMerged) {
          await this.handleVcsAutoTransition({
            organizationId,
            task,
            trigger: 'pr_merged',
            provider: 'github',
            context: { prId, prTitle, authorName, branchName: sourceBranch }
          })
        }

        processedCount++
      }

      return { processed: true, summary: `Processed merged GitHub PR #${prId} for ${processedCount} tasks.` }
    }

    if (action === 'closed' && !isMerged) {
      for (const code of ticketCodes) {
        const task = await this.findTaskByCode(organizationId, code, repositoryName)
        if (!task) continue

        await this.syncVcsResource(organizationId, task.id, {
          provider: 'github',
          resource_type: 'pull_request',
          external_id: prId,
          repository_name: repositoryName,
          title: prTitle,
          url: prUrl,
          status: 'DECLINED',
          metadata: {
            id: prId,
            source_branch: sourceBranch,
            destination_branch: destBranch,
            declined_at: new Date().toISOString()
          }
        })

        await logTaskAuditComment(
          organizationId,
          task.id,
          `❌ Pull Request #${prId} ("${prTitle}") fue cerrado en GitHub sin fusionar.`,
          'GitHub VCS'
        )

        processedCount++
      }

      return { processed: true, summary: `Processed closed unmerged GitHub PR #${prId} for ${processedCount} tasks.` }
    }

    return { processed: false, summary: `Ignored GitHub PR action: ${action}` }
  }

  /**
   * Handles GitHub commit status updates
   */
  private async handleGithubCommitStatusUpdate(
    organizationId: string,
    payload: Record<string, any>
  ): Promise<{ processed: boolean; summary: string }> {
    const commitHash = payload.sha
    const state = payload.state // success, failure, pending, error
    const buildUrl = payload.target_url
    const buildName = payload.context

    if (!commitHash) return { processed: false, summary: 'No commit hash in GitHub status' }

    const { data: links } = await supabaseAdmin
      .from('task_vcs_links')
      .select('id, metadata, task_id')
      .eq('organization_id', organizationId)
      .eq('external_id', commitHash)

    if (links && links.length > 0) {
      for (const link of links) {
        const metadata = {
          ...(link.metadata || {}),
          ci_status: typeof state === 'string' ? state.toUpperCase() : state,
          ci_url: buildUrl,
          ci_name: buildName,
          ci_updated_at: new Date().toISOString()
        }

        await supabaseAdmin
          .from('task_vcs_links')
          .update({ metadata })
          .eq('id', link.id)
      }
    }

    return { processed: true, summary: `Updated build status ${state} for commit ${commitHash.slice(0, 7)}.` }
  }

  /**
   * Utility helper to update task status, progress percentage, and notify stakeholders with single audit comment
   */
  private async transitionTaskStatus(
    organizationId: string,
    taskId: string,
    prevStatus: TaskStatus,
    targetStatus: TaskStatus,
    progressPercentage: number,
    auditMessage: string,
    provider: VcsProviderType = 'bitbucket'
  ): Promise<void> {
    await supabaseAdmin
      .from('task_items')
      .update({
        status: targetStatus,
        progress_percentage: progressPercentage,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)

    const auditTag = provider === 'github' ? 'GitHub VCS' : 'Bitbucket VCS'

    await notifyStakeholdersOnStatusChange(
      organizationId,
      taskId,
      targetStatus,
      prevStatus,
      auditTag,
      undefined,
      undefined,
      auditMessage
    )
  }

  /**
   * Validates if an incoming repository matches the project settings or inherits from the parent workspace.
   * Handles:
   * - Explicit disable (enabled === false)
   * - Multi-repo arrays (settings.vcs.repositories)
   * - Single-repo strings (settings.vcs.repository)
   * - Workspace multi-repo inheritance
   * - Full names ('owner/repo'), multi-level nested paths ('group/subgroup/repo'), URLs, and short slug matching ('repo')
   */
  matchesRepository(
    incomingRepo?: string,
    projectVcs?: any,
    workspaceVcs?: any
  ): boolean {
    // 1. Explicitly disabled at project level
    if (projectVcs?.enabled === false) {
      return false
    }

    // 2. Explicitly disabled at workspace level (unless project explicitly overrides with enabled: true)
    if (workspaceVcs?.enabled === false && projectVcs?.enabled !== true) {
      return false
    }

    // 3. Inheritance explicitly checked
    if (projectVcs?.inherited_from_workspace && workspaceVcs?.enabled === false) {
      return false
    }

    if (!incomingRepo) return true

    const cleanIncoming = normalizeRepositorySlug(incomingRepo)
    if (!cleanIncoming) return true

    const candidateRepos: string[] = []

    // 1. Project-level multi-repo
    if (Array.isArray(projectVcs?.repositories)) {
      projectVcs.repositories.forEach((r: any) => {
        if (typeof r === 'string' && r.trim()) {
          const norm = normalizeRepositorySlug(r)
          if (norm && !candidateRepos.includes(norm)) candidateRepos.push(norm)
        }
      })
    }

    // 2. Project-level single repo
    if (typeof projectVcs?.repository === 'string' && projectVcs.repository.trim()) {
      const norm = normalizeRepositorySlug(projectVcs.repository)
      if (norm && !candidateRepos.includes(norm)) candidateRepos.push(norm)
    }

    // 3. Parent workspace-level multi-repo (inheritance)
    if (workspaceVcs?.enabled !== false && Array.isArray(workspaceVcs?.repositories)) {
      workspaceVcs.repositories.forEach((r: any) => {
        if (typeof r === 'string' && r.trim()) {
          const norm = normalizeRepositorySlug(r)
          if (norm && !candidateRepos.includes(norm)) candidateRepos.push(norm)
        }
      })
    }

    // 4. Parent workspace-level single repo (if any)
    if (workspaceVcs?.enabled !== false && typeof workspaceVcs?.repository === 'string' && workspaceVcs.repository.trim()) {
      const norm = normalizeRepositorySlug(workspaceVcs.repository)
      if (norm && !candidateRepos.includes(norm)) candidateRepos.push(norm)
    }

    // If no specific repositories are configured at project or workspace level, allow matching
    if (candidateRepos.length === 0) {
      return true
    }

    const incomingHasSlash = cleanIncoming.includes('/')
    const incomingSlug = cleanIncoming.split('/').filter(Boolean).pop() || cleanIncoming

    return candidateRepos.some((candRepo) => {
      if (cleanIncoming === candRepo) {
        return true
      }

      const candHasSlash = candRepo.includes('/')
      const candSlug = candRepo.split('/').filter(Boolean).pop() || candRepo

      // Only match slugs if at least one candidate doesn't have an owner/namespace prefix
      if ((!incomingHasSlash || !candHasSlash) && incomingSlug === candSlug) {
        return true
      }

      return false
    })
  }

  /**
   * Resolves a task by its ticket_code within an organization, optionally checking project and workspace VCS repository settings
   */
  private async findTaskByCode(
    organizationId: string,
    ticketCode: string,
    repositoryName?: string
  ): Promise<any | null> {
    const { data: task, error } = await supabaseAdmin
      .from('task_items')
      .select(`
        id,
        ticket_code,
        title,
        status,
        progress_percentage,
        checklist,
        actual_hours,
        organization_id,
        qa_staff_id,
        assigned_staff_id,
        blocked_by_task_id,
        project:task_projects!task_items_project_id_fkey(
          id,
          name,
          settings,
          workspace_id,
          workspace:task_workspaces!task_projects_workspace_id_fkey(
            id,
            name,
            settings
          )
        )
      `)
      .eq('organization_id', organizationId)
      .ilike('ticket_code', ticketCode)
      .maybeSingle()

    if (error || !task) return null

    const project = Array.isArray(task.project) ? task.project[0] : task.project
    const parentWorkspace = Array.isArray(project?.workspace) ? project.workspace[0] : project?.workspace

    if (!this.matchesRepository(repositoryName, project?.settings?.vcs, parentWorkspace?.settings?.vcs)) {
      console.log(`[TaskVcsService] Task ${ticketCode} does not match repository "${repositoryName}". Skipping.`)
      return null
    }

    return task
  }
}

export const taskVcsService = new TaskVcsService()

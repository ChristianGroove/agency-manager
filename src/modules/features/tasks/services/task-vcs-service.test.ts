import { describe, it, expect, vi, beforeEach } from "vitest"
import { TaskVcsService } from "./task-vcs-service"

const mocks = vi.hoisted(() => ({
  supabaseFrom: vi.fn(),
  logTaskAuditComment: vi.fn(async () => {}),
  handleTaskUnblocking: vi.fn(async () => []),
  notifyStakeholdersOnStatusChange: vi.fn(async () => {}),
}))

vi.mock("@/modules/core/database/supabase-admin", () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mocks.supabaseFrom(...args),
  },
}))

vi.mock("../actions/task-actions", () => ({
  logTaskAuditComment: (...args: any[]) => (mocks.logTaskAuditComment as any)(...args),
  handleTaskUnblocking: (...args: any[]) => (mocks.handleTaskUnblocking as any)(...args),
  notifyStakeholdersOnStatusChange: (...args: any[]) => (mocks.notifyStakeholdersOnStatusChange as any)(...args),
}))

function createChainableMock(handlers?: {
  findTask?: (code: string) => any
  findExistingLink?: (externalId: string) => any
  onUpsert?: (record: any) => any
  onUpdate?: (table: string, updateData: any) => void
}) {
  return (table: string) => {
    let currentTaskCode = ""
    let currentExternalId = ""

    const chain: any = {
      select: vi.fn(() => chain),
      update: vi.fn((data: any) => {
        if (handlers?.onUpdate) handlers.onUpdate(table, data)
        return chain
      }),
      upsert: vi.fn((record: any) => {
        if (handlers?.onUpsert) handlers.onUpsert(record)
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: "link-upserted-id", ...record }, error: null })),
          })),
        }
      }),
      delete: vi.fn(() => chain),
      eq: vi.fn((field: string, val: any) => {
        if (field === "external_id") currentExternalId = String(val)
        return chain
      }),
      neq: vi.fn(() => chain),
      ilike: vi.fn((field: string, val: any) => {
        if (field === "ticket_code") currentTaskCode = String(val).toUpperCase()
        return chain
      }),
      order: vi.fn(() => chain),
      single: vi.fn(async () => ({ data: null, error: null })),
      maybeSingle: vi.fn(async () => {
        if (table === "task_items" && handlers?.findTask) {
          const task = handlers.findTask(currentTaskCode)
          return { data: task || null, error: null }
        }
        if (table === "task_vcs_links" && handlers?.findExistingLink) {
          const link = handlers.findExistingLink(currentExternalId)
          return { data: link || null, error: null }
        }
        return { data: null, error: null }
      }),
    }

    return chain
  }
}

describe("TaskVcsService - Unit Tests", () => {
  const service = new TaskVcsService()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.supabaseFrom.mockImplementation(createChainableMock())
  })

  describe("extractTicketCodes", () => {
    it("extracts standard ticket codes from branch names", () => {
      const codes = service.extractTicketCodes("feature/PIX-101-auth-improvements")
      expect(codes).toEqual(["PIX-101"])
    })

    it("extracts and normalizes lowercase ticket codes to uppercase", () => {
      const codes = service.extractTicketCodes("fix/pix-202-null-pointer")
      expect(codes).toEqual(["PIX-202"])
    })

    it("extracts ticket codes when followed by underscores in branch names", () => {
      const codes = service.extractTicketCodes("feature/PIX-101_fix_login_flow")
      expect(codes).toEqual(["PIX-101"])
    })

    it("extracts ticket codes with numbers in the prefix (e.g. B2B, WEB3)", () => {
      const codes = service.extractTicketCodes("feature/B2B-42-invoice-sync")
      expect(codes).toEqual(["B2B-42"])

      const web3Codes = service.extractTicketCodes("WEB3-99: crypto gateway")
      expect(web3Codes).toEqual(["WEB3-99"])
    })

    it("extracts multiple unique ticket codes from commit messages or PR titles", () => {
      const message = "[PIX-101] [PROJ-42] Refactor api response and link to PIX-101"
      const codes = service.extractTicketCodes(message)
      expect(codes).toEqual(["PIX-101", "PROJ-42"])
    })

    it("returns empty array when no ticket code is present", () => {
      expect(service.extractTicketCodes("update documentation and readme")).toEqual([])
      expect(service.extractTicketCodes("")).toEqual([])
      expect(service.extractTicketCodes(null as any)).toEqual([])
      expect(service.extractTicketCodes(undefined as any)).toEqual([])
    })

    it("handles long ticket prefix up to 10 chars", () => {
      const codes = service.extractTicketCodes("ENGPLATFORM-890: Infrastructure fix")
      expect(codes).toEqual(["ENGPLATFORM-890"])
    })

    it("extracts ticket codes when preceded by underscores in branch names", () => {
      const codes = service.extractTicketCodes("feat_PIX-101_user_auth")
      expect(codes).toEqual(["PIX-101"])
    })

    it("handles descriptive ticket prefixes up to 15 chars", () => {
      const codes = service.extractTicketCodes("ENTERPRISEPLATF-999: Cloud migration")
      expect(codes).toEqual(["ENTERPRISEPLATF-999"])
    })
  })

  describe("extractWorklogHours", () => {
    it("extracts decimal hours [1.5h]", () => {
      const hours = service.extractWorklogHours("PIX-101: implemented cache [1.5h]")
      expect(hours).toBe(1.5)
    })

    it("extracts integer hours [2h], [3hr], [4hours]", () => {
      expect(service.extractWorklogHours("fix bug [2h]")).toBe(2)
      expect(service.extractWorklogHours("fix bug [3hr]")).toBe(3)
      expect(service.extractWorklogHours("fix bug [4hours]")).toBe(4)
    })

    it("extracts and converts minutes to fractional hours [30m], [15min], [45mins]", () => {
      expect(service.extractWorklogHours("quick fix [30m]")).toBe(0.5)
      expect(service.extractWorklogHours("refactor [15min]")).toBe(0.25)
      expect(service.extractWorklogHours("docs update [45mins]")).toBe(0.75)
    })

    it("accumulates multiple bracketed worklog entries in single commit", () => {
      const message = "PIX-101 [1h] coding and [30m] unit tests"
      expect(service.extractWorklogHours(message)).toBe(1.5)
    })

    it("handles whitespace inside brackets [ 2.5 h ]", () => {
      expect(service.extractWorklogHours("commit message [ 2.5 h ]")).toBe(2.5)
    })

    it("ignores non-worklog bracket expressions", () => {
      expect(service.extractWorklogHours("[WIP] fix login")).toBe(0)
      expect(service.extractWorklogHours("[BUG] crash on startup")).toBe(0)
      expect(service.extractWorklogHours("[123] general refactor")).toBe(0)
      expect(service.extractWorklogHours("")).toBe(0)
      expect(service.extractWorklogHours(null as any)).toBe(0)
    })
  })

  describe("generateGitBranchName", () => {
    it("generates a clean standard feature branch name", () => {
      const branch = service.generateGitBranchName("PIX-42", "Fix user authentication session")
      expect(branch).toBe("feature/pix-42-fix-user-authentication-session")
    })

    it("normalizes accents, removes special characters, and trims trailing dashes", () => {
      const branch = service.generateGitBranchName("PIX-99", "Validación de contraseña & sesión!!")
      expect(branch).toBe("feature/pix-99-validacion-de-contrasena-sesion")
    })

    it("avoids trailing dash when title has only non-ASCII characters or is empty", () => {
      const branch = service.generateGitBranchName("PIX-12", "🚀 🔥 !!!")
      expect(branch).toBe("feature/pix-12")

      const emptyTitleBranch = service.generateGitBranchName("PIX-12", "")
      expect(emptyTitleBranch).toBe("feature/pix-12")
    })

    it("truncates very long task titles cleanly", () => {
      const longTitle = "This is an extremely long ticket title intended to describe every detail of the task requirement that could exceed branch limits"
      const branch = service.generateGitBranchName("PIX-100", longTitle)
      expect(branch.startsWith("feature/pix-100-")).toBe(true)
      expect(branch.length).toBeLessThan(70)
      expect(branch.endsWith("-")).toBe(false)
    })

    it("ensures no trailing dash when truncation cuts exactly on a hyphen boundary", () => {
      const titleWithHyphenBoundary = "Fix authentication and session timeout issue - high priority"
      const branch = service.generateGitBranchName("PIX-101", titleWithHyphenBoundary)
      expect(branch.endsWith("-")).toBe(false)
    })
  })

  describe("evaluateChecklistDeliverables (95% Rule)", () => {
    it("holds task at 95% in in_review when incomplete deliverables exist", () => {
      const checklistWithPending = [
        { id: "1", title: "API Endpoint", completed: true },
        { id: "2", title: "Integration Test", completed: false }
      ]
      const result = service.evaluateChecklistDeliverables(checklistWithPending)

      expect(result.hasUnfinished).toBe(true)
      expect(result.effectiveProgress).toBe(95)
      expect(result.effectiveStatus).toBe("in_review")
    })

    it("progresses task to 100% in done when all deliverables are completed", () => {
      const checklistCompleted = [
        { id: "1", title: "API Endpoint", completed: true },
        { id: "2", title: "Integration Test", completed: true }
      ]
      const result = service.evaluateChecklistDeliverables(checklistCompleted)

      expect(result.hasUnfinished).toBe(false)
      expect(result.effectiveProgress).toBe(100)
      expect(result.effectiveStatus).toBe("done")
    })

    it("progresses task to 100% in done when checklist is empty or not defined", () => {
      const emptyResult = service.evaluateChecklistDeliverables([])
      expect(emptyResult.hasUnfinished).toBe(false)
      expect(emptyResult.effectiveProgress).toBe(100)
      expect(emptyResult.effectiveStatus).toBe("done")

      const nullResult = service.evaluateChecklistDeliverables(null)
      expect(nullResult.hasUnfinished).toBe(false)
      expect(nullResult.effectiveProgress).toBe(100)
      expect(nullResult.effectiveStatus).toBe("done")
    })

    it("safely handles stringified JSON checklist from Postgres JSONB", () => {
      const stringifiedChecklist = JSON.stringify([
        { id: "1", title: "Documentation", completed: false }
      ])
      const result = service.evaluateChecklistDeliverables(stringifiedChecklist)
      expect(result.hasUnfinished).toBe(true)
      expect(result.effectiveProgress).toBe(95)
      expect(result.effectiveStatus).toBe("in_review")
    })
  })

  describe("handleVcsAutoTransition", () => {
    it("skips transitions when project settings disable auto-transitions", async () => {
      const task = {
        id: "task-1",
        status: "todo",
        project: { settings: { vcs: { auto_transitions: false } } }
      }

      const res = await service.handleVcsAutoTransition({
        organizationId: "org-1",
        task,
        trigger: "branch_created",
        context: { branchName: "feature/pix-1-test" }
      })

      expect(res.transitioned).toBe(false)
      expect(res.reason).toBe("auto_transitions_disabled")
    })

    it("honors terminal status governance and does not modify done tasks", async () => {
      const task = {
        id: "task-2",
        status: "done",
        progress_percentage: 100,
        project: { settings: { vcs: { auto_transitions: true } } }
      }

      const res = await service.handleVcsAutoTransition({
        organizationId: "org-1",
        task,
        trigger: "commit_pushed",
        context: { commitHash: "abcdef123456" }
      })

      expect(res.transitioned).toBe(false)
      expect(res.reason).toBe("terminal_status_locked")
    })

    it("transitions todo/backlog task to in_progress on branch_created", async () => {
      const task = {
        id: "task-3",
        status: "todo",
        project: { settings: { vcs: { auto_transitions: true } } }
      }

      const res = await service.handleVcsAutoTransition({
        organizationId: "org-1",
        task,
        trigger: "branch_created",
        context: { branchName: "feature/pix-3-feature" }
      })

      expect(res.transitioned).toBe(true)
      expect(res.newStatus).toBe("in_progress")
    })

    it("transitions task to in_review on pr_opened", async () => {
      const task = {
        id: "task-4",
        status: "in_progress",
        progress_percentage: 50,
        project: { settings: { vcs: { auto_transitions: true } } }
      }

      const res = await service.handleVcsAutoTransition({
        organizationId: "org-1",
        task,
        trigger: "pr_opened",
        context: { prId: "42", prTitle: "Add payment gateway", authorName: "Dev" }
      })

      expect(res.transitioned).toBe(true)
      expect(res.newStatus).toBe("in_review")
    })

    it("transitions task to done (100%) and triggers unblocking on pr_merged when checklist is complete", async () => {
      const task = {
        id: "task-5",
        status: "in_review",
        ticket_code: "PIX-5",
        title: "Complete feature",
        checklist: [{ id: "1", title: "Deliverable 1", completed: true }],
        project: { settings: { vcs: { auto_transitions: true } } }
      }

      const res = await service.handleVcsAutoTransition({
        organizationId: "org-1",
        task,
        trigger: "pr_merged",
        context: { prId: "50", prTitle: "Merge feature" }
      })

      expect(res.transitioned).toBe(true)
      expect(res.newStatus).toBe("done")
    })

    it("holds task at in_review (95%) on pr_merged when checklist has unfinished deliverables", async () => {
      const task = {
        id: "task-6",
        status: "in_review",
        ticket_code: "PIX-6",
        title: "Feature with pending tasks",
        checklist: [{ id: "1", title: "Deliverable 1", completed: false }],
        project: { settings: { vcs: { auto_transitions: true } } }
      }

      const res = await service.handleVcsAutoTransition({
        organizationId: "org-1",
        task,
        trigger: "pr_merged",
        context: { prId: "51", prTitle: "Merge feature with unfinished checklist" }
      })

      expect(res.transitioned).toBe(true)
      expect(res.newStatus).toBe("in_review")
      expect(res.reason).toBe("unfinished_deliverables_95")
    })

    it("skips transitions when project settings has vcs.enabled = false", async () => {
      const task = {
        id: "task-7",
        status: "todo",
        project: { settings: { vcs: { enabled: false, auto_transitions: true } } }
      }

      const res = await service.handleVcsAutoTransition({
        organizationId: "org-1",
        task,
        trigger: "branch_created",
        context: { branchName: "feature/pix-7-test" }
      })

      expect(res.transitioned).toBe(false)
      expect(res.reason).toBe("auto_transitions_disabled")
    })

    it("holds task at in_review (95%) on pr_merged when blocked by an incomplete prerequisite task", async () => {
      const blockerTask = {
        id: "task-blocker-1",
        ticket_code: "PIX-BLOCKER",
        title: "Database schema migration",
        status: "in_progress",
      }

      const dependentTask = {
        id: "task-dep-2",
        ticket_code: "PIX-DEP",
        title: "Dependent API endpoint",
        status: "in_review",
        blocked_by_task_id: "task-blocker-1",
        checklist: [],
        project: { settings: { vcs: { auto_transitions: true } } }
      }

      mocks.supabaseFrom.mockImplementation((table: string) => {
        if (table === "task_items") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: blockerTask, error: null }))
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null }))
            }))
          }
        }
        return {}
      })

      const res = await service.handleVcsAutoTransition({
        organizationId: "org-1",
        task: dependentTask,
        trigger: "pr_merged",
        context: { prId: "77", prTitle: "Merge dependent API" }
      })

      expect(res.transitioned).toBe(true)
      expect(res.newStatus).toBe("in_review")
      expect(res.reason).toBe("blocked_by_predecessor")
      expect(mocks.logTaskAuditComment).toHaveBeenCalledWith(
        "org-1",
        "task-dep-2",
        expect.stringContaining("depende de #PIX-BLOCKER"),
        "Bitbucket VCS"
      )
    })
  })

  describe("processBitbucketEvent - Edge Cases & Lifecycle Verification", () => {
    const orgId = "org-pixy-vcs"

    it("branch deletion (change.closed === true) does NOT trigger branch_created transition", async () => {
      const taskPIX101 = {
        id: "task-101",
        ticket_code: "PIX-101",
        title: "Feature Auth",
        status: "todo",
        progress_percentage: 0,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const existingBranchLink = {
        id: "link-branch-101",
        status: "ACTIVE",
        metadata: { branch_name: "feature/PIX-101-auth" },
      }

      const updatedLinks: any[] = []
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-101" ? taskPIX101 : null),
          findExistingLink: () => existingBranchLink,
          onUpdate: (table, data) => {
            if (table === "task_vcs_links") updatedLinks.push(data)
          },
        })
      )

      // Bitbucket push payload when a branch is deleted
      const branchDeletionPayload = {
        repository: { full_name: "acme/backend" },
        push: {
          changes: [
            {
              closed: true, // Key flag indicating branch was deleted
              new: null,
              old: {
                type: "branch",
                name: "feature/PIX-101-auth",
              },
              commits: [],
            },
          ],
        },
      }

      const result = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "repo:push",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: branchDeletionPayload,
      })

      expect(result.processed).toBe(true)
      // Must NOT trigger auto-transition on deleted branch
      expect(mocks.notifyStakeholdersOnStatusChange).not.toHaveBeenCalled()
      // Existing branch link should be updated to DELETED
      expect(updatedLinks.some((l) => l.status === "DELETED")).toBe(true)
    })

    it("active branch creation triggers branch_created and transitions eligible task to in_progress", async () => {
      const taskPIX102 = {
        id: "task-102",
        ticket_code: "PIX-102",
        title: "User Profile Screen",
        status: "todo",
        progress_percentage: 0,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const syncedResources: any[] = []
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-102" ? taskPIX102 : null),
          onUpsert: (record) => syncedResources.push(record),
        })
      )

      const branchCreationPayload = {
        repository: { full_name: "acme/backend" },
        push: {
          changes: [
            {
              closed: false,
              new: {
                type: "branch",
                name: "feature/PIX-102-profile-screen",
                target: { hash: "hash123456" },
              },
              commits: [],
            },
          ],
        },
      }

      const result = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "repo:push",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: branchCreationPayload,
      })

      expect(result.processed).toBe(true)
      expect(syncedResources.some((r) => r.resource_type === "branch" && r.status === "ACTIVE")).toBe(true)
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalledWith(
        orgId,
        "task-102",
        "in_progress",
        "todo",
        "Bitbucket VCS",
        undefined,
        undefined,
        expect.stringContaining("feature/PIX-102-profile-screen")
      )
    })

    it("handles pullrequest:rejected (declined PR) without advancing task and logs audit comment", async () => {
      const taskPIX103 = {
        id: "task-103",
        ticket_code: "PIX-103",
        title: "OAuth Google Login",
        status: "in_review",
        progress_percentage: 95,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const syncedResources: any[] = []
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-103" ? taskPIX103 : null),
          onUpsert: (record) => syncedResources.push(record),
        })
      )

      const prDeclinedPayload = {
        repository: { full_name: "acme/backend" },
        pullrequest: {
          id: 42,
          title: "PIX-103 Implement Google Login",
          state: "DECLINED",
          source: { branch: { name: "feature/PIX-103" } },
          links: { html: { href: "https://bitbucket.org/acme/backend/pull-requests/42" } },
        },
      }

      const result = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "pullrequest:rejected",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: prDeclinedPayload,
      })

      expect(result.processed).toBe(true)
      expect(syncedResources.some((r) => r.resource_type === "pull_request" && r.status === "DECLINED")).toBe(true)
      expect(mocks.logTaskAuditComment).toHaveBeenCalledWith(
        orgId,
        "task-103",
        expect.stringContaining("fue declinado en Bitbucket sin fusionar"),
        "Bitbucket VCS"
      )
      // Must not complete the task
      expect(mocks.notifyStakeholdersOnStatusChange).not.toHaveBeenCalled()
    })

    it("handles commits with multiple ticket codes and distributes worklog hours", async () => {
      const taskA = {
        id: "task-201",
        ticket_code: "PIX-201",
        title: "API gateway auth",
        status: "todo",
        actual_hours: 1.0,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const taskB = {
        id: "task-202",
        ticket_code: "PIX-202",
        title: "Frontend auth hook",
        status: "backlog",
        actual_hours: 0,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const syncedResources: any[] = []
      const taskUpdates: Record<string, any> = {}

      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => {
            if (code === "PIX-201") return taskA
            if (code === "PIX-202") return taskB
            return null
          },
          findExistingLink: () => null, // First time delivery
          onUpsert: (record) => syncedResources.push(record),
          onUpdate: (table, data) => {
            if (table === "task_items") {
              if (data.actual_hours !== undefined) {
                taskUpdates[data.actual_hours] = data
              }
            }
          },
        })
      )

      const multiTicketPushPayload = {
        repository: { full_name: "acme/backend" },
        push: {
          changes: [
            {
              closed: false,
              commits: [
                {
                  hash: "a1b2c3d4e5f6789",
                  message: "[PIX-201] [PIX-202] Implement JWT exchange [2h]",
                  date: new Date().toISOString(),
                  author: {
                    user: { display_name: "Fullstack Dev" },
                  },
                },
              ],
            },
          ],
        },
      }

      const result = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "repo:push",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: multiTicketPushPayload,
      })

      expect(result.processed).toBe(true)
      expect(result.summary).toContain("2 ticket associations")

      // Both tickets got synced
      const commitLinks = syncedResources.filter((r) => r.resource_type === "commit")
      expect(commitLinks.length).toBe(2)

      // Both tasks logged audit comments with the worklog
      expect(mocks.logTaskAuditComment).toHaveBeenCalledTimes(2)
      expect(mocks.logTaskAuditComment).toHaveBeenCalledWith(
        orgId,
        "task-201",
        expect.stringContaining("+2h (Total: 3h)"),
        "Bitbucket VCS"
      )
      expect(mocks.logTaskAuditComment).toHaveBeenCalledWith(
        orgId,
        "task-202",
        expect.stringContaining("+2h (Total: 2h)"),
        "Bitbucket VCS"
      )

      // Both tasks auto-transitioned to in_progress
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalledTimes(2)
    })

    it("safely handles empty payloads without throwing errors", async () => {
      // 1. Missing event or missing event.payload
      const nullEventResult = await service.processBitbucketEvent(null as any)
      expect(nullEventResult.processed).toBe(false)
      expect(nullEventResult.summary).toBe("Empty or missing event payload")

      const emptyEventResult = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "repo:push",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: null as any,
      })
      expect(emptyEventResult.processed).toBe(false)

      // 2. Empty payload {} for repo:push
      const emptyPushResult = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "repo:push",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: {},
      })
      expect(emptyPushResult.processed).toBe(true)
      expect(emptyPushResult.summary).toContain("0 ticket associations")

      // 3. Empty payload {} for PR events
      const emptyPrResult = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "pullrequest:created",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: {},
      })
      expect(emptyPrResult.processed).toBe(false)
      expect(emptyPrResult.summary).toBe("No pullrequest data")

      // 4. Empty payload {} for PR fulfilled
      const emptyPrFulfilledResult = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "pullrequest:fulfilled",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: {},
      })
      expect(emptyPrFulfilledResult.processed).toBe(false)
      expect(emptyPrFulfilledResult.summary).toBe("No pullrequest data")

      // 5. Empty payload {} for commit status
      const emptyStatusResult = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "repo:commit_status_created",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: {},
      })
      expect(emptyStatusResult.processed).toBe(false)
      expect(emptyStatusResult.summary).toBe("No commit_status data")

      // 6. Unknown event key
      const unknownResult = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "issue:created",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: {},
      })
      expect(unknownResult.processed).toBe(false)
      expect(unknownResult.summary).toBe("Ignored event: issue:created")
    })

    it("robustly handles malformed and varied commit author formats", async () => {
      const taskPIX300 = {
        id: "task-300",
        ticket_code: "PIX-300",
        title: "Edge case testing",
        status: "in_progress",
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const syncedResources: any[] = []
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-300" ? taskPIX300 : null),
          onUpsert: (record) => syncedResources.push(record),
        })
      )

      // Test cases of author representations: string, raw, name, null, undefined, empty object
      const authorTestCases = [
        { author: "Alice String Author", expected: "Alice String Author" },
        { author: { raw: "raw_author_name" }, expected: "raw_author_name" },
        { author: { name: "Named Author" }, expected: "Named Author" },
        { author: {}, expected: "Desarrollador Git" },
        { author: null, expected: "Desarrollador Git" },
        { author: undefined, expected: "Desarrollador Git" },
      ]

      for (let i = 0; i < authorTestCases.length; i++) {
        const tc = authorTestCases[i]
        const hash = `hash00000${i}`

        await service.processBitbucketEvent({
          provider: "bitbucket",
          eventKey: "repo:push",
          connectionId: "conn-1",
          organizationId: orgId,
          payload: {
            repository: { full_name: "acme/backend" },
            push: {
              changes: [
                {
                  closed: false,
                  commits: [
                    {
                      hash,
                      message: `PIX-300 commit test ${i}`,
                      author: tc.author,
                    },
                  ],
                },
              ],
            },
          },
        })

        const matchedLink = syncedResources.find((r) => r.external_id === hash)
        expect(matchedLink).toBeDefined()
        expect(matchedLink.metadata.author).toBe(tc.expected)
      }
    })

    it("respects project repository settings and ignores events from non-matching repositories", async () => {
      const taskWithSpecificRepo = {
        id: "task-401",
        ticket_code: "PIX-401",
        title: "Targeted repo task",
        status: "todo",
        organization_id: orgId,
        project: {
          settings: {
            vcs: {
              enabled: true,
              repository: "acme/primary-service",
            },
          },
        },
      }

      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-401" ? taskWithSpecificRepo : null),
        })
      )

      // Push coming from a different repository: "acme/secondary-worker"
      const mismatchedRepoPush = {
        repository: { full_name: "acme/secondary-worker" },
        push: {
          changes: [
            {
              closed: false,
              commits: [
                {
                  hash: "diff123",
                  message: "PIX-401 working in different repo",
                },
              ],
            },
          ],
        },
      }

      const result = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "repo:push",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: mismatchedRepoPush,
      })

      expect(result.processed).toBe(true)
      expect(result.summary).toContain("0 ticket associations")
      expect(mocks.notifyStakeholdersOnStatusChange).not.toHaveBeenCalled()
    })

    it("handles commit CI/CD status updates (repo:commit_status_created and updated)", async () => {
      const existingCommitLink = {
        id: "link-commit-ci-1",
        task_id: "task-ci-1",
        metadata: {
          author: "CI Author",
        },
      }

      const updatedLinks: any[] = []
      mocks.supabaseFrom.mockImplementation((table: string) => {
        if (table === "task_vcs_links") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(async () => ({ data: [existingCommitLink], error: null })),
              })),
            })),
            update: vi.fn((data: any) => {
              updatedLinks.push(data)
              return {
                eq: vi.fn(async () => ({ error: null })),
              }
            }),
          }
        }
        return {}
      })

      const statusPayload = {
        commit_status: {
          name: "Pipelines #142",
          state: "SUCCESSFUL",
          url: "https://bitbucket.org/acme/backend/pipelines/results/142",
          commit: {
            hash: "c0ffee123456789",
          },
        },
      }

      const result = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "repo:commit_status_created",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: statusPayload,
      })

      expect(result.processed).toBe(true)
      expect(result.summary).toContain("SUCCESSFUL")
      expect(updatedLinks.length).toBe(1)
      expect(updatedLinks[0].metadata).toEqual(
        expect.objectContaining({
          ci_status: "SUCCESSFUL",
          ci_url: "https://bitbucket.org/acme/backend/pipelines/results/142",
          ci_name: "Pipelines #142",
        })
      )
    })

    it("processes pullrequest:fulfilled (MERGED) and auto-transitions task to done", async () => {
      const taskPIX500 = {
        id: "task-500",
        ticket_code: "PIX-500",
        title: "Deploy payment gateway",
        status: "in_review",
        progress_percentage: 95,
        checklist: [],
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const syncedResources: any[] = []
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-500" ? taskPIX500 : null),
          findExistingLink: () => null, // First time merging
          onUpsert: (record) => syncedResources.push(record),
        })
      )

      const prMergedPayload = {
        repository: { full_name: "acme/backend" },
        pullrequest: {
          id: 88,
          title: "PIX-500 Deploy payment gateway",
          state: "MERGED",
          source: { branch: { name: "feature/PIX-500" } },
          author: { display_name: "Lead Dev" },
          links: { html: { href: "https://bitbucket.org/acme/backend/pull-requests/88" } },
        },
      }

      const result = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "pullrequest:fulfilled",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: prMergedPayload,
      })

      expect(result.processed).toBe(true)
      expect(result.summary).toContain("Processed merged PR #88")
      expect(syncedResources.some((r) => r.resource_type === "pull_request" && r.status === "MERGED")).toBe(true)
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalledWith(
        orgId,
        "task-500",
        "done",
        "in_review",
        "Bitbucket VCS",
        undefined,
        undefined,
        expect.stringContaining("fusionado exitosamente")
      )
    })

    it("guarantees idempotency on duplicate commit delivery: does not double-credit worklog hours", async () => {
      const taskPIX600 = {
        id: "task-600",
        ticket_code: "PIX-600",
        title: "Idempotency test task",
        status: "in_progress",
        actual_hours: 2.0,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const existingCommit = {
        id: "link-commit-existing",
        status: "COMMITTED",
        external_id: "hash-already-delivered",
      }

      const taskUpdates: any[] = []
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-600" ? taskPIX600 : null),
          findExistingLink: (extId) => (extId === "hash-already-delivered" ? existingCommit : null),
          onUpdate: (table, data) => {
            if (table === "task_items") taskUpdates.push(data)
          },
        })
      )

      const duplicateCommitPayload = {
        repository: { full_name: "acme/backend" },
        push: {
          changes: [
            {
              closed: false,
              commits: [
                {
                  hash: "hash-already-delivered",
                  message: "PIX-600 Repeated delivery [3h]",
                  date: new Date().toISOString(),
                },
              ],
            },
          ],
        },
      }

      const result = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "repo:push",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: duplicateCommitPayload,
      })

      expect(result.processed).toBe(true)
      // Must NOT update actual_hours because commit was already recorded
      expect(taskUpdates.filter((u) => u.actual_hours !== undefined)).toHaveLength(0)
      expect(mocks.logTaskAuditComment).not.toHaveBeenCalled()
    })

    it("guarantees idempotency on duplicate PR merged delivery: does not re-trigger auto-transitions", async () => {
      const taskPIX700 = {
        id: "task-700",
        ticket_code: "PIX-700",
        title: "PR idempotency task",
        status: "done",
        progress_percentage: 100,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const existingMergedPr = {
        id: "link-pr-merged-existing",
        status: "MERGED",
        external_id: "99",
      }

      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-700" ? taskPIX700 : null),
          findExistingLink: (extId) => (extId === "99" ? existingMergedPr : null),
        })
      )

      const duplicatePrMergedPayload = {
        repository: { full_name: "acme/backend" },
        pullrequest: {
          id: 99,
          title: "PIX-700 Already merged PR",
          state: "MERGED",
          source: { branch: { name: "feature/PIX-700" } },
        },
      }

      const result = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "pullrequest:fulfilled",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: duplicatePrMergedPayload,
      })

      expect(result.processed).toBe(true)
      expect(mocks.notifyStakeholdersOnStatusChange).not.toHaveBeenCalled()
    })

    it("ignores incoming push events when project explicitly has vcs.enabled = false", async () => {
      const taskInDisabledProject = {
        id: "task-disabled-1",
        ticket_code: "PIX-DIS",
        title: "Disabled VCS Project Task",
        status: "todo",
        organization_id: orgId,
        project: {
          settings: {
            vcs: {
              enabled: false,
              repository: "acme/backend",
            },
          },
        },
      }

      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-DIS" ? taskInDisabledProject : null),
        })
      )

      const pushPayload = {
        repository: { full_name: "acme/backend" },
        push: {
          changes: [
            {
              closed: false,
              commits: [
                {
                  hash: "hash-dis-1",
                  message: "PIX-DIS commit on disabled project",
                },
              ],
            },
          ],
        },
      }

      const result = await service.processBitbucketEvent({
        provider: "bitbucket",
        eventKey: "repo:push",
        connectionId: "conn-1",
        organizationId: orgId,
        payload: pushPayload,
      })

      expect(result.processed).toBe(true)
      expect(result.summary).toContain("0 ticket associations")
      expect(mocks.notifyStakeholdersOnStatusChange).not.toHaveBeenCalled()
    })
  })

  describe("Direct CRUD Methods (syncVcsResource, getTaskVcsLinks, deleteVcsLink)", () => {
    const orgId = "org-pixy-crud"

    it("syncVcsResource performs upsert with onConflict on unique constraint", async () => {
      const upsertSpy = vi.fn((record: any) => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { id: "link-new-1", ...record }, error: null })),
        })),
      }))

      mocks.supabaseFrom.mockImplementation((table: string) => {
        if (table === "task_vcs_links") {
          return { upsert: upsertSpy }
        }
        return {}
      })

      const link = await service.syncVcsResource(orgId, "task-1", {
        provider: "bitbucket",
        resource_type: "branch",
        external_id: "feature/pix-1",
        repository_name: "acme/repo",
        title: "feature/pix-1",
        url: "https://bitbucket.org/acme/repo/branch/feature/pix-1",
        status: "ACTIVE",
      })

      expect(link).toBeDefined()
      expect(link?.id).toBe("link-new-1")
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: orgId,
          task_id: "task-1",
          provider: "bitbucket",
          external_id: "feature/pix-1",
        }),
        { onConflict: "task_id,provider,resource_type,external_id" }
      )
    })

    it("getTaskVcsLinks fetches all links ordered by created_at descending", async () => {
      const sampleLinks = [
        { id: "link-1", task_id: "task-1", resource_type: "branch" },
        { id: "link-2", task_id: "task-1", resource_type: "commit" },
      ]

      mocks.supabaseFrom.mockImplementation((table: string) => {
        if (table === "task_vcs_links") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(async () => ({ data: sampleLinks, error: null })),
              })),
            })),
          }
        }
        return {}
      })

      const links = await service.getTaskVcsLinks("task-1")
      expect(links).toHaveLength(2)
      expect(links[0].id).toBe("link-1")
    })

    it("getTaskVcsLinks scopes query by organizationId when provided", async () => {
      const eqSpy = vi.fn().mockReturnThis()
      const orderSpy = vi.fn(async () => ({ data: [], error: null }))

      mocks.supabaseFrom.mockImplementation((table: string) => {
        if (table === "task_vcs_links") {
          return {
            select: vi.fn(() => ({
              eq: eqSpy.mockReturnValue({
                eq: eqSpy.mockReturnValue({
                  order: orderSpy,
                }),
                order: orderSpy,
              }),
            })),
          }
        }
        return {}
      })

      await service.getTaskVcsLinks("task-1", "org-tenant-abc")
      expect(eqSpy).toHaveBeenCalledWith("task_id", "task-1")
      expect(eqSpy).toHaveBeenCalledWith("organization_id", "org-tenant-abc")
    })

    it("deleteVcsLink deletes link with organization isolation", async () => {
      const deleteEqOrg = vi.fn(async () => ({ error: null }))
      const deleteEqId = vi.fn(() => ({ eq: deleteEqOrg }))

      mocks.supabaseFrom.mockImplementation((table: string) => {
        if (table === "task_vcs_links") {
          return {
            delete: vi.fn(() => ({
              eq: deleteEqId,
            })),
          }
        }
        return {}
      })

      const success = await service.deleteVcsLink("link-123", orgId)
      expect(success).toBe(true)
      expect(deleteEqId).toHaveBeenCalledWith("id", "link-123")
      expect(deleteEqOrg).toHaveBeenCalledWith("organization_id", orgId)
    })
  })

  describe("matchesRepository - Workspace and Project isolation", () => {
    it("returns false if workspaceVcs has enabled: false and project does not override with enabled: true", () => {
      const matches = service.matchesRepository(
        "acme/repo",
        { repositories: ["acme/repo"] },
        { enabled: false }
      )
      expect(matches).toBe(false)
    })

    it("returns true if workspaceVcs has enabled: false but project explicitly overrides with enabled: true", () => {
      const matches = service.matchesRepository(
        "acme/repo",
        { enabled: true, repositories: ["acme/repo"] },
        { enabled: false }
      )
      expect(matches).toBe(true)
    })

    it("returns false if projectVcs has enabled: false even if workspace has repositories", () => {
      const matches = service.matchesRepository(
        "acme/repo",
        { enabled: false },
        { enabled: true, repositories: ["acme/repo"] }
      )
      expect(matches).toBe(false)
    })
  })
})

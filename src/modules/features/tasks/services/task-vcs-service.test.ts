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
          if (!task) return { data: null, error: null }
          if (task.project?.settings?.vcs && task.project.settings.vcs.enabled === undefined) {
            return {
              data: {
                ...task,
                project: {
                  ...task.project,
                  settings: {
                    ...task.project.settings,
                    vcs: {
                      ...task.project.settings.vcs,
                      enabled: true,
                    },
                  },
                },
              },
              error: null,
            }
          }
          return { data: task, error: null }
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

    it("Bitbucket branch creation with commits calls notifyStakeholdersOnStatusChange only once", async () => {
      const taskPIX199 = {
        id: "task-199",
        ticket_code: "PIX-199",
        title: "User Profile Screen Dedup",
        status: "todo",
        progress_percentage: 0,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-199" ? taskPIX199 : null),
        })
      )

      const branchWithCommitsPayload = {
        repository: { full_name: "acme/backend" },
        push: {
          changes: [
            {
              closed: false,
              new: {
                type: "branch",
                name: "feature/PIX-199-profile-screen",
                target: { hash: "hash123456" },
              },
              commits: [
                {
                  hash: "hash123456",
                  message: "PIX-199: initial commit on branch",
                  author: "Dev",
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
        payload: branchWithCommitsPayload,
      })

      expect(result.processed).toBe(true)
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalledTimes(1)
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalledWith(
        orgId,
        "task-199",
        "in_progress",
        "todo",
        "Bitbucket VCS",
        undefined,
        undefined,
        expect.stringContaining("feature/PIX-199-profile-screen")
      )
    })

    it("Bitbucket push with 2 commits for same task on existing branch triggers auto-transition and notification only once", async () => {
      const taskPIX198 = {
        id: "task-198",
        ticket_code: "PIX-198",
        title: "Multi Commit Push",
        status: "todo",
        progress_percentage: 0,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-198" ? taskPIX198 : null),
        })
      )

      const multiCommitPayload = {
        repository: { full_name: "acme/backend" },
        push: {
          changes: [
            {
              closed: false,
              new: {
                type: "branch",
                name: "main",
                target: { hash: "commit2" },
              },
              commits: [
                {
                  hash: "commit1",
                  message: "PIX-198: first commit on branch",
                  author: "Dev",
                  date: new Date().toISOString(),
                },
                {
                  hash: "commit2",
                  message: "PIX-198: second commit on branch",
                  author: "Dev",
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
        payload: multiCommitPayload,
      })

      expect(result.processed).toBe(true)
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalledTimes(1)
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalledWith(
        orgId,
        "task-198",
        "in_progress",
        "todo",
        "Bitbucket VCS",
        undefined,
        undefined,
        expect.stringContaining("commit1")
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

    it("returns false when neither project nor workspace has VCS enabled (non-technical project isolation)", () => {
      expect(service.matchesRepository("acme/repo", undefined, undefined)).toBe(false)
      expect(service.matchesRepository("acme/repo", {}, {})).toBe(false)
      expect(service.matchesRepository("acme/repo", { enabled: false }, undefined)).toBe(false)
      expect(service.matchesRepository("acme/repo", undefined, { enabled: false })).toBe(false)
      expect(service.matchesRepository("", undefined, undefined)).toBe(false)
      expect(service.matchesRepository(undefined, undefined, undefined)).toBe(false)
    })
  })

  describe("processGithubEvent - GitHub VCS Integration Lifecycle", () => {
    const orgId = "org-github-vcs"

    it("branch push with commits linking ticket transitions task to in_progress and records GitHub links", async () => {
      const taskPIX501 = {
        id: "task-501",
        ticket_code: "PIX-501",
        title: "GitHub Native Integration",
        status: "todo",
        progress_percentage: 0,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const syncedResources: any[] = []
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-501" ? taskPIX501 : null),
          onUpsert: (record) => syncedResources.push(record),
        })
      )

      const pushPayload = {
        ref: "refs/heads/feature/PIX-501-github-support",
        created: true,
        deleted: false,
        repository: {
          full_name: "pixy/agency-manager",
          html_url: "https://github.com/pixy/agency-manager",
        },
        commits: [
          {
            id: "commit-gh-1",
            message: "PIX-501: add github webhook handler",
            author: { name: "Octo Dev", username: "octodev" },
            timestamp: new Date().toISOString(),
            url: "https://github.com/pixy/agency-manager/commit/commit-gh-1",
          },
        ],
      }

      const result = await service.processGithubEvent({
        provider: "github",
        eventKey: "push",
        connectionId: "conn-gh-1",
        organizationId: orgId,
        payload: pushPayload,
      })

      expect(result.processed).toBe(true)
      expect(result.summary).toContain("2 ticket associations")

      // Both branch and commit recorded with provider 'github'
      const branchLink = syncedResources.find((r) => r.resource_type === "branch")
      expect(branchLink).toBeDefined()
      expect(branchLink.provider).toBe("github")
      expect(branchLink.title).toBe("feature/PIX-501-github-support")

      const commitLink = syncedResources.find((r) => r.resource_type === "commit")
      expect(commitLink).toBeDefined()
      expect(commitLink.provider).toBe("github")
      expect(commitLink.external_id).toBe("commit-gh-1")

      // Auto-transitioned to in_progress with audit tag 'GitHub VCS' - called exactly once (no double notification)
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalledTimes(1)
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalledWith(
        orgId,
        "task-501",
        "in_progress",
        "todo",
        "GitHub VCS",
        undefined,
        undefined,
        expect.stringContaining("feature/PIX-501-github-support")
      )
    })

    it("GitHub push with 2 commits for same task on existing branch triggers auto-transition and notification only once", async () => {
      const taskPIX500 = {
        id: "task-500",
        ticket_code: "PIX-500",
        title: "Multi Commit GitHub Push",
        status: "todo",
        progress_percentage: 0,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-500" ? taskPIX500 : null),
        })
      )

      const pushPayload = {
        ref: "refs/heads/main",
        created: false,
        deleted: false,
        repository: {
          name: "agency-manager",
          full_name: "pixy/agency-manager",
          html_url: "https://github.com/pixy/agency-manager",
        },
        commits: [
          {
            id: "commit-gh-first",
            message: "PIX-500: first commit",
            timestamp: new Date().toISOString(),
            author: { name: "Octocat", username: "octocat" },
          },
          {
            id: "commit-gh-second",
            message: "PIX-500: second commit",
            timestamp: new Date().toISOString(),
            author: { name: "Octocat", username: "octocat" },
          },
        ],
      }

      const result = await service.processGithubEvent({
        provider: "github",
        eventKey: "push",
        connectionId: "conn-gh-1",
        organizationId: orgId,
        payload: pushPayload,
      })

      expect(result.processed).toBe(true)
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalledTimes(1)
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalledWith(
        orgId,
        "task-500",
        "in_progress",
        "todo",
        "GitHub VCS",
        undefined,
        undefined,
        expect.stringContaining("commit-")
      )
    })

    it("branch deletion (payload.deleted === true) marks branch link as DELETED without triggering auto-transition", async () => {
      const taskPIX502 = {
        id: "task-502",
        ticket_code: "PIX-502",
        title: "Delete Me",
        status: "in_progress",
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const existingBranchLink = {
        id: "link-branch-502",
        task_id: "task-502",
        external_id: "feature/PIX-502-delete-me",
        title: "feature/PIX-502-delete-me",
        status: "ACTIVE",
        organization_id: orgId,
      }

      const updatedLinks: any[] = []
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-502" ? taskPIX502 : null),
          findExistingLink: (extId) => (extId === "feature/PIX-502-delete-me" ? existingBranchLink : null),
          onUpdate: (table, data) => {
            if (table === "task_vcs_links") updatedLinks.push(data)
          },
        })
      )

      const deletePayload = {
        ref: "refs/heads/feature/PIX-502-delete-me",
        deleted: true,
        after: "0000000000000000000000000000000000000000",
        repository: { full_name: "pixy/agency-manager" },
        commits: [],
      }

      const result = await service.processGithubEvent({
        provider: "github",
        eventKey: "push",
        connectionId: "conn-gh-1",
        organizationId: orgId,
        payload: deletePayload,
      })

      expect(result.processed).toBe(true)
      expect(mocks.notifyStakeholdersOnStatusChange).not.toHaveBeenCalled()
      expect(updatedLinks.some((l) => l.status === "DELETED")).toBe(true)
    })

    it("ignores tag pushes (refs/tags/...) without creating branch links", async () => {
      const syncedResources: any[] = []
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          onUpsert: (record) => syncedResources.push(record),
        })
      )

      const tagPayload = {
        ref: "refs/tags/v1.0.0",
        created: true,
        repository: { full_name: "pixy/agency-manager" },
        commits: [],
      }

      const result = await service.processGithubEvent({
        provider: "github",
        eventKey: "push",
        connectionId: "conn-gh-1",
        organizationId: orgId,
        payload: tagPayload,
      })

      expect(result.processed).toBe(true)
      expect(syncedResources.filter((r) => r.resource_type === "branch")).toHaveLength(0)
    })

    it("parses worklog hours [1.5h] in commit messages and accumulates on actual_hours", async () => {
      const taskPIX503 = {
        id: "task-503",
        ticket_code: "PIX-503",
        title: "Worklog Test",
        status: "in_progress",
        actual_hours: 2.0,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      let updatedHours: number | undefined
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-503" ? taskPIX503 : null),
          onUpdate: (table, data) => {
            if (table === "task_items" && data.actual_hours !== undefined) {
              updatedHours = data.actual_hours
            }
          },
        })
      )

      const pushWithWorklogPayload = {
        ref: "refs/heads/feature/PIX-503-worklog",
        repository: { full_name: "pixy/agency-manager" },
        commits: [
          {
            id: "commit-wl-1",
            message: "PIX-503 [1.5h]: Complete adapter implementation",
            author: { name: "Octo Engineer" },
            timestamp: new Date().toISOString(),
          },
        ],
      }

      const result = await service.processGithubEvent({
        provider: "github",
        eventKey: "push",
        connectionId: "conn-gh-1",
        organizationId: orgId,
        payload: pushWithWorklogPayload,
      })

      expect(result.processed).toBe(true)
      expect(updatedHours).toBe(3.5)
      expect(mocks.logTaskAuditComment).toHaveBeenCalledWith(
        orgId,
        "task-503",
        expect.stringContaining("+1.5h (Total: 3.5h)"),
        "GitHub VCS"
      )
    })

    it("pull_request opened event records PR link and auto-transitions task", async () => {
      const taskPIX504 = {
        id: "task-504",
        ticket_code: "PIX-504",
        title: "PR Open Test",
        status: "todo",
        progress_percentage: 0,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const syncedResources: any[] = []
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-504" ? taskPIX504 : null),
          onUpsert: (record) => syncedResources.push(record),
        })
      )

      const prOpenPayload = {
        action: "opened",
        repository: { full_name: "pixy/agency-manager" },
        pull_request: {
          id: 101,
          number: 101,
          title: "PIX-504: Feature implementation PR",
          body: "Resolves PIX-504",
          html_url: "https://github.com/pixy/agency-manager/pull/101",
          state: "open",
          merged: false,
          user: { login: "octocat" },
          head: { ref: "feature/PIX-504-feat" },
          base: { ref: "main" },
        },
      }

      const result = await service.processGithubEvent({
        provider: "github",
        eventKey: "pull_request",
        connectionId: "conn-gh-1",
        organizationId: orgId,
        payload: prOpenPayload,
      })

      expect(result.processed).toBe(true)
      const prLink = syncedResources.find((r) => r.resource_type === "pull_request")
      expect(prLink).toBeDefined()
      expect(prLink.provider).toBe("github")
      expect(prLink.status).toBe("OPEN")
      expect(mocks.notifyStakeholdersOnStatusChange).toHaveBeenCalled()
    })

    it("pull_request closed (declined/unmerged) marks PR link as DECLINED and does not complete task", async () => {
      const taskPIX505 = {
        id: "task-505",
        ticket_code: "PIX-505",
        title: "Declined PR Test",
        status: "in_review",
        progress_percentage: 95,
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      const syncedResources: any[] = []
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-505" ? taskPIX505 : null),
          onUpsert: (record) => syncedResources.push(record),
        })
      )

      const prDeclinedPayload = {
        action: "closed",
        repository: { full_name: "pixy/agency-manager" },
        pull_request: {
          id: 102,
          number: 102,
          title: "PIX-505: Cancelled feature",
          html_url: "https://github.com/pixy/agency-manager/pull/102",
          state: "closed",
          merged: false,
          head: { ref: "feature/PIX-505-cancelled" },
        },
      }

      const result = await service.processGithubEvent({
        provider: "github",
        eventKey: "pull_request",
        connectionId: "conn-gh-1",
        organizationId: orgId,
        payload: prDeclinedPayload,
      })

      expect(result.processed).toBe(true)
      const prLink = syncedResources.find((r) => r.resource_type === "pull_request")
      expect(prLink?.status).toBe("DECLINED")
      expect(mocks.logTaskAuditComment).toHaveBeenCalledWith(
        orgId,
        "task-505",
        expect.stringContaining("fue cerrado en GitHub sin fusionar"),
        "GitHub VCS"
      )
      expect(mocks.notifyStakeholdersOnStatusChange).not.toHaveBeenCalled()
    })

    it("pull_request merged holds task at 95% if checklist deliverables are incomplete", async () => {
      const taskPIX506 = {
        id: "task-506",
        ticket_code: "PIX-506",
        title: "Task with unfinished deliverables",
        status: "in_review",
        progress_percentage: 80,
        checklist: [
          { id: "chk-1", title: "Write tests", completed: true },
          { id: "chk-2", title: "Security review", completed: false },
        ],
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      let updatedProgress: number | undefined
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-506" ? taskPIX506 : null),
          onUpdate: (table, data) => {
            if (table === "task_items" && data.progress_percentage !== undefined) {
              updatedProgress = data.progress_percentage
            }
          },
        })
      )

      const prMergedPayload = {
        action: "closed",
        repository: { full_name: "pixy/agency-manager" },
        pull_request: {
          id: 103,
          number: 103,
          title: "PIX-506: Merge feature with pending checklist",
          html_url: "https://github.com/pixy/agency-manager/pull/103",
          state: "closed",
          merged: true,
          head: { ref: "feature/PIX-506-feat" },
        },
      }

      const result = await service.processGithubEvent({
        provider: "github",
        eventKey: "pull_request",
        connectionId: "conn-gh-1",
        organizationId: orgId,
        payload: prMergedPayload,
      })

      expect(result.processed).toBe(true)
      expect(updatedProgress).toBe(95)
      expect(mocks.logTaskAuditComment).toHaveBeenCalledWith(
        orgId,
        "task-506",
        expect.stringContaining("entregables pendientes en el checklist de control"),
        "GitHub VCS"
      )
      expect(mocks.handleTaskUnblocking).not.toHaveBeenCalled()
    })

    it("pull_request merged holds task at 95% if blocked by incomplete predecessor task", async () => {
      const blockerTask = {
        id: "task-blocker-99",
        ticket_code: "PIX-499",
        title: "Database Migration",
        status: "in_progress",
      }

      const taskPIX508 = {
        id: "task-508",
        ticket_code: "PIX-508",
        title: "API Endpoint Depending on DB",
        status: "in_review",
        progress_percentage: 80,
        blocked_by_task_id: "task-blocker-99",
        checklist: [],
        organization_id: orgId,
        project: { settings: { vcs: { enabled: true, auto_transitions: true } } },
      }

      let updatedProgress: number | undefined
      mocks.supabaseFrom.mockImplementation((table: string) => {
        let currentId = ""
        let currentCode = ""
        const chain: any = {
          select: vi.fn(() => chain),
          update: vi.fn((data: any) => {
            if (table === "task_items" && data.progress_percentage !== undefined) {
              updatedProgress = data.progress_percentage
            }
            return chain
          }),
          upsert: vi.fn((record: any) => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: "link-id", ...record }, error: null })),
            })),
          })),
          eq: vi.fn((field: string, val: any) => {
            if (field === "id") currentId = String(val)
            return chain
          }),
          ilike: vi.fn((field: string, val: any) => {
            if (field === "ticket_code") currentCode = String(val).toUpperCase()
            return chain
          }),
          maybeSingle: vi.fn(async () => {
            if (table === "task_items") {
              if (currentId === "task-blocker-99") return { data: blockerTask, error: null }
              if (currentCode === "PIX-508") return { data: taskPIX508, error: null }
            }
            return { data: null, error: null }
          }),
        }
        return chain
      })

      const prMergedPayload = {
        action: "closed",
        repository: { full_name: "pixy/agency-manager" },
        pull_request: {
          id: 105,
          number: 105,
          title: "PIX-508: PR merged with active blocker",
          html_url: "https://github.com/pixy/agency-manager/pull/105",
          state: "closed",
          merged: true,
          head: { ref: "feature/PIX-508-feat" },
        },
      }

      const result = await service.processGithubEvent({
        provider: "github",
        eventKey: "pull_request",
        connectionId: "conn-gh-1",
        organizationId: orgId,
        payload: prMergedPayload,
      })

      expect(result.processed).toBe(true)
      expect(updatedProgress).toBe(95)
      expect(mocks.logTaskAuditComment).toHaveBeenCalledWith(
        orgId,
        "task-508",
        expect.stringContaining("depende de #PIX-499"),
        "GitHub VCS"
      )
      expect(mocks.handleTaskUnblocking).not.toHaveBeenCalled()
    })

    it("pull_request merged completes task to done (100%) and unblocks dependent tasks when clean", async () => {
      const taskPIX507 = {
        id: "task-507",
        ticket_code: "PIX-507",
        title: "Clean Feature Ready for Done",
        status: "in_review",
        progress_percentage: 95,
        checklist: [
          { id: "chk-1", title: "All done", completed: true },
        ],
        organization_id: orgId,
        project: { settings: { vcs: { auto_transitions: true } } },
      }

      let finalStatus: string | undefined
      let finalProgress: number | undefined
      mocks.supabaseFrom.mockImplementation(
        createChainableMock({
          findTask: (code) => (code === "PIX-507" ? taskPIX507 : null),
          onUpdate: (table, data) => {
            if (table === "task_items") {
              if (data.status !== undefined) finalStatus = data.status
              if (data.progress_percentage !== undefined) finalProgress = data.progress_percentage
            }
          },
        })
      )

      const prMergedPayload = {
        action: "closed",
        repository: { full_name: "pixy/agency-manager" },
        pull_request: {
          id: 104,
          number: 104,
          title: "PIX-507: Merge clean feature",
          html_url: "https://github.com/pixy/agency-manager/pull/104",
          state: "closed",
          merged: true,
          head: { ref: "feature/PIX-507-feat" },
        },
      }

      const result = await service.processGithubEvent({
        provider: "github",
        eventKey: "pull_request",
        connectionId: "conn-gh-1",
        organizationId: orgId,
        payload: prMergedPayload,
      })

      expect(result.processed).toBe(true)
      expect(finalStatus).toBe("done")
      expect(finalProgress).toBe(100)
      expect(mocks.handleTaskUnblocking).toHaveBeenCalledWith("task-507", "PIX-507", "Clean Feature Ready for Done")
    })

    it("safely handles empty payloads without throwing", async () => {
      const nullRes = await service.processGithubEvent(null as any)
      expect(nullRes.processed).toBe(false)
      expect(nullRes.summary).toBe("Empty or missing event payload")

      const unknownRes = await service.processGithubEvent({
        provider: "github",
        eventKey: "star",
        connectionId: "conn-gh-1",
        organizationId: orgId,
        payload: {},
      })
      expect(unknownRes.processed).toBe(false)
      expect(unknownRes.summary).toBe("Ignored GitHub event: star")
    })
  })
})


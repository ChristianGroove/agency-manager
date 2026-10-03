import { describe, it, expect, vi } from "vitest"
import { resolveCollaboratorCapabilities, CollaboratorRole, TaskCollaborator } from "../types"
import { TaskVcsService, normalizeRepositorySlug } from "./task-vcs-service"

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

describe("Collaborator Capabilities & Multi-Repo Inheritance Unit Tests", () => {
  describe("resolveCollaboratorCapabilities", () => {
    it("returns all false capabilities when collaborator is null or undefined", () => {
      expect(resolveCollaboratorCapabilities(null)).toEqual({
        vcs_code: false,
        design_preview: false,
        monitoring: false,
        finance_costs: false,
      })

      expect(resolveCollaboratorCapabilities(undefined)).toEqual({
        vcs_code: false,
        design_preview: false,
        monitoring: false,
        finance_costs: false,
      })
    })

    describe("Smart role defaults", () => {
      it("resolves developer role defaults (vcs_code: true, monitoring: true, design_preview: false, finance_costs: false)", () => {
        const collab: Partial<TaskCollaborator> = {
          task_role: "developer" as CollaboratorRole,
        }
        const caps = resolveCollaboratorCapabilities(collab)
        expect(caps).toEqual({
          vcs_code: true,
          design_preview: false,
          monitoring: true,
          finance_costs: false,
        })
      })

      it("resolves designer role defaults (design_preview: true, vcs_code: false, monitoring: false, finance_costs: false)", () => {
        const collab: Partial<TaskCollaborator> = {
          task_role: "designer" as CollaboratorRole,
        }
        const caps = resolveCollaboratorCapabilities(collab)
        expect(caps).toEqual({
          vcs_code: false,
          design_preview: true,
          monitoring: false,
          finance_costs: false,
        })
      })

      it("resolves qa_lead role defaults (vcs_code: true, design_preview: true, monitoring: true, finance_costs: false)", () => {
        const collab: Partial<TaskCollaborator> = {
          task_role: "qa_lead" as CollaboratorRole,
        }
        const caps = resolveCollaboratorCapabilities(collab)
        expect(caps).toEqual({
          vcs_code: true,
          design_preview: true,
          monitoring: true,
          finance_costs: false,
        })
      })

      it("resolves pm role defaults (vcs_code: true, design_preview: true, monitoring: true, finance_costs: true)", () => {
        const collab: Partial<TaskCollaborator> = {
          task_role: "pm" as CollaboratorRole,
        }
        const caps = resolveCollaboratorCapabilities(collab)
        expect(caps).toEqual({
          vcs_code: true,
          design_preview: true,
          monitoring: true,
          finance_costs: true,
        })
      })

      it("resolves specialist, support, sales, operations, observer, consultant to all false defaults", () => {
        const nonTechRoles: CollaboratorRole[] = [
          "specialist",
          "support",
          "sales",
          "operations",
          "observer",
          "consultant",
        ]

        for (const role of nonTechRoles) {
          const caps = resolveCollaboratorCapabilities({ task_role: role })
          expect(caps).toEqual({
            vcs_code: false,
            design_preview: false,
            monitoring: false,
            finance_costs: false,
          })
        }
      })
    })

    describe("Role inference fallback from free-text job title", () => {
      it("infers developer capabilities from free-text title", () => {
        const collab = { role: "Senior Backend Developer" }
        expect(resolveCollaboratorCapabilities(collab)).toEqual({
          vcs_code: true,
          design_preview: false,
          monitoring: true,
          finance_costs: false,
        })
      })

      it("infers designer capabilities from free-text title", () => {
        const collab = { role: "UI/UX Designer & Researcher" }
        expect(resolveCollaboratorCapabilities(collab)).toEqual({
          vcs_code: false,
          design_preview: true,
          monitoring: false,
          finance_costs: false,
        })
      })

      it("infers pm capabilities from free-text title", () => {
        const collab = { role: "Product Manager / Scrum Master" }
        expect(resolveCollaboratorCapabilities(collab)).toEqual({
          vcs_code: true,
          design_preview: true,
          monitoring: true,
          finance_costs: true,
        })
      })

      it("infers qa_lead capabilities from free-text title", () => {
        const collab = { role: "Líder de Calidad y Pruebas QA" }
        expect(resolveCollaboratorCapabilities(collab)).toEqual({
          vcs_code: true,
          design_preview: true,
          monitoring: true,
          finance_costs: false,
        })
      })

      it("defaults unrecognized free-text title to specialist (all false)", () => {
        const collab = { role: "Community Evangelist" }
        expect(resolveCollaboratorCapabilities(collab)).toEqual({
          vcs_code: false,
          design_preview: false,
          monitoring: false,
          finance_costs: false,
        })
      })
    })

    describe("Explicit settings overrides", () => {
      it("allows designer to receive vcs_code: true via explicit override", () => {
        const designerTech: Partial<TaskCollaborator> = {
          task_role: "designer",
          settings: {
            capabilities: {
              vcs_code: true,
            },
          },
        }
        const caps = resolveCollaboratorCapabilities(designerTech)
        expect(caps.vcs_code).toBe(true)
        expect(caps.design_preview).toBe(true) // retained from designer default
        expect(caps.finance_costs).toBe(false)
      })

      it("allows developer to have vcs_code explicitly revoked (vcs_code: false)", () => {
        const devRestricted: Partial<TaskCollaborator> = {
          task_role: "developer",
          settings: {
            capabilities: {
              vcs_code: false,
            },
          },
        }
        const caps = resolveCollaboratorCapabilities(devRestricted)
        expect(caps.vcs_code).toBe(false)
        expect(caps.monitoring).toBe(true) // retained from developer default
      })

      it("allows developer to be granted finance_costs: true via explicit override", () => {
        const devLead: Partial<TaskCollaborator> = {
          task_role: "developer",
          settings: {
            capabilities: {
              finance_costs: true,
            },
          },
        }
        const caps = resolveCollaboratorCapabilities(devLead)
        expect(caps.vcs_code).toBe(true)
        expect(caps.finance_costs).toBe(true)
      })

      it("allows pm to have finance_costs explicitly revoked (finance_costs: false)", () => {
        const pmJunior: Partial<TaskCollaborator> = {
          task_role: "pm",
          settings: {
            capabilities: {
              finance_costs: false,
            },
          },
        }
        const caps = resolveCollaboratorCapabilities(pmJunior)
        expect(caps.finance_costs).toBe(false)
        expect(caps.vcs_code).toBe(true)
      })

      it("ignores non-boolean values in settings overrides and maintains smart defaults", () => {
        const devInvalidSettings: Partial<TaskCollaborator> = {
          task_role: "developer",
          settings: {
            capabilities: {
              vcs_code: "true" as any,
              design_preview: 1 as any,
              finance_costs: null as any,
            },
          },
        }
        const caps = resolveCollaboratorCapabilities(devInvalidSettings)
        expect(caps).toEqual({
          vcs_code: true,
          design_preview: false,
          monitoring: true,
          finance_costs: false,
        })
      })

      it("parses stringified JSON settings properly and applies capability overrides", () => {
        const collabWithStringSettings: any = {
          task_role: "designer",
          settings: JSON.stringify({
            capabilities: {
              vcs_code: true,
            },
          }),
        }
        const caps = resolveCollaboratorCapabilities(collabWithStringSettings)
        expect(caps.vcs_code).toBe(true)
        expect(caps.design_preview).toBe(true)
      })

      it("respects direct top-level capabilities property when settings is not wrapped", () => {
        const collabWithTopLevelCaps: any = {
          task_role: "developer",
          capabilities: {
            vcs_code: false,
          },
        }
        const caps = resolveCollaboratorCapabilities(collabWithTopLevelCaps)
        expect(caps.vcs_code).toBe(false)
        expect(caps.monitoring).toBe(true)
      })
    })
  })

  describe("TaskVcsService.matchesRepository", () => {
    const service = new TaskVcsService()

    describe("Explicit disable & Empty repo rules", () => {
      it("returns false immediately when projectVcs.enabled is false, regardless of repos", () => {
        expect(
          service.matchesRepository(
            "my-workspace/backend",
            { enabled: false, repository: "my-workspace/backend" },
            { repositories: ["my-workspace/backend"] }
          )
        ).toBe(false)
      })

      it("returns true when incoming repo is missing or empty (cannot disqualify)", () => {
        expect(
          service.matchesRepository(
            "",
            { enabled: true, repository: "my-workspace/backend" },
            undefined
          )
        ).toBe(true)

        expect(
          service.matchesRepository(
            undefined,
            { enabled: true, repository: "my-workspace/backend" },
            undefined
          )
        ).toBe(true)
      })

      it("returns true when no repository restrictions exist at project or workspace level", () => {
        expect(
          service.matchesRepository(
            "my-workspace/random-repo",
            { enabled: true },
            undefined
          )
        ).toBe(true)

        expect(
          service.matchesRepository(
            "my-workspace/random-repo",
            undefined,
            undefined
          )
        ).toBe(true)
      })
    })

    describe("Project-level single repository matching", () => {
      const projectVcs = {
        enabled: true,
        repository: "agency-inc/api-gateway",
      }

      it("matches exact full repository string (case insensitive)", () => {
        expect(service.matchesRepository("agency-inc/api-gateway", projectVcs)).toBe(true)
        expect(service.matchesRepository("AGENCY-INC/API-GATEWAY", projectVcs)).toBe(true)
        expect(service.matchesRepository("  agency-inc/api-gateway  ", projectVcs)).toBe(true)
      })

      it("matches when candidate is full repo and incoming is short slug", () => {
        expect(service.matchesRepository("api-gateway", projectVcs)).toBe(true)
      })

      it("matches when candidate is short slug and incoming is full repo", () => {
        const shortRepoVcs = { enabled: true, repository: "api-gateway" }
        expect(service.matchesRepository("agency-inc/api-gateway", shortRepoVcs)).toBe(true)
      })

      it("rejects non-matching repository", () => {
        expect(service.matchesRepository("agency-inc/marketing-web", projectVcs)).toBe(false)
        expect(service.matchesRepository("other-org/api-gateway-v2", projectVcs)).toBe(false)
      })
    })

    describe("Project-level multi-repository array matching", () => {
      const projectVcs = {
        enabled: true,
        repositories: [
          "agency-inc/web-frontend",
          "agency-inc/api-backend",
          "agency-inc/mobile-app",
        ],
      }

      it("matches any repository listed in the multi-repo array", () => {
        expect(service.matchesRepository("agency-inc/web-frontend", projectVcs)).toBe(true)
        expect(service.matchesRepository("agency-inc/api-backend", projectVcs)).toBe(true)
        expect(service.matchesRepository("agency-inc/mobile-app", projectVcs)).toBe(true)
      })

      it("matches short slug to any item in multi-repo array", () => {
        expect(service.matchesRepository("web-frontend", projectVcs)).toBe(true)
        expect(service.matchesRepository("api-backend", projectVcs)).toBe(true)
        expect(service.matchesRepository("mobile-app", projectVcs)).toBe(true)
      })

      it("rejects repository not present in the array", () => {
        expect(service.matchesRepository("agency-inc/analytics-service", projectVcs)).toBe(false)
        expect(service.matchesRepository("random-repo", projectVcs)).toBe(false)
      })
    })

    describe("Workspace inheritance matching", () => {
      const workspaceVcs = {
        enabled: true,
        repositories: [
          "agency-corp/shared-ui",
          "agency-corp/auth-service",
          "agency-corp/docs",
        ],
      }

      it("inherits multi-repo array from workspace when project has inherited_from_workspace flag", () => {
        const projectVcs = {
          enabled: true,
          inherited_from_workspace: true,
        }

        expect(service.matchesRepository("agency-corp/shared-ui", projectVcs, workspaceVcs)).toBe(true)
        expect(service.matchesRepository("agency-corp/auth-service", projectVcs, workspaceVcs)).toBe(true)
        expect(service.matchesRepository("auth-service", projectVcs, workspaceVcs)).toBe(true)
        expect(service.matchesRepository("agency-corp/billing", projectVcs, workspaceVcs)).toBe(false)
      })

      it("inherits single repository from workspace when workspace has repository string", () => {
        const singleWorkspaceVcs = {
          enabled: true,
          repository: "agency-corp/monorepo",
        }
        const projectVcs = {
          enabled: true,
          inherited_from_workspace: true,
        }

        expect(service.matchesRepository("agency-corp/monorepo", projectVcs, singleWorkspaceVcs)).toBe(true)
        expect(service.matchesRepository("monorepo", projectVcs, singleWorkspaceVcs)).toBe(true)
        expect(service.matchesRepository("other-repo", projectVcs, singleWorkspaceVcs)).toBe(false)
      })

      it("unions project-specific repository with parent workspace repositories", () => {
        const projectVcs = {
          enabled: true,
          repository: "agency-corp/custom-microservice",
        }

        // Project-specific repo matches
        expect(service.matchesRepository("agency-corp/custom-microservice", projectVcs, workspaceVcs)).toBe(true)
        // Inherited workspace repos also match
        expect(service.matchesRepository("agency-corp/shared-ui", projectVcs, workspaceVcs)).toBe(true)
        expect(service.matchesRepository("agency-corp/auth-service", projectVcs, workspaceVcs)).toBe(true)
        // Unrelated repo still rejected
        expect(service.matchesRepository("agency-corp/unrelated", projectVcs, workspaceVcs)).toBe(false)
      })

      it("rejects workspace repositories if workspace VCS is explicitly disabled", () => {
        const disabledWorkspaceVcs = {
          enabled: false,
          repositories: ["agency-corp/shared-ui"],
        }
        const projectVcs = {
          enabled: true,
          inherited_from_workspace: true,
        }

        expect(service.matchesRepository("agency-corp/shared-ui", projectVcs, disabledWorkspaceVcs)).toBe(false)
      })
    })

    describe("Multi-level nested repos, URLs, and Cross-Namespace Isolation", () => {
      it("normalizes repository URLs, SSH paths, .git suffixes, and slashes correctly", () => {
        expect(normalizeRepositorySlug("https://bitbucket.org/owner/repo.git")).toBe("owner/repo")
        expect(normalizeRepositorySlug("git@bitbucket.org:owner/repo.git")).toBe("owner/repo")
        expect(normalizeRepositorySlug("http://github.com/owner/repo/")).toBe("owner/repo")
        expect(normalizeRepositorySlug("/owner/repo/")).toBe("owner/repo")
        expect(normalizeRepositorySlug("repo.git")).toBe("repo")
      })

      it("matches multi-level nested repository paths (e.g. Bitbucket group/subgroup/repo)", () => {
        const nestedProjectVcs = {
          enabled: true,
          repository: "atlassian/enterprise/core-billing",
        }

        // Exact match
        expect(service.matchesRepository("atlassian/enterprise/core-billing", nestedProjectVcs)).toBe(true)
        // Short slug match
        expect(service.matchesRepository("core-billing", nestedProjectVcs)).toBe(true)
        // Incoming URL with .git
        expect(service.matchesRepository("https://bitbucket.org/atlassian/enterprise/core-billing.git", nestedProjectVcs)).toBe(true)
      })

      it("enforces cross-namespace isolation (prevents org1/app from matching org2/app)", () => {
        const orgAProjectVcs = {
          enabled: true,
          repository: "client-a/microservice-api",
        }

        // Same slug but different namespace MUST be rejected
        expect(service.matchesRepository("client-b/microservice-api", orgAProjectVcs)).toBe(false)
        expect(service.matchesRepository("other-org/microservice-api", orgAProjectVcs)).toBe(false)
      })
    })
  })
})

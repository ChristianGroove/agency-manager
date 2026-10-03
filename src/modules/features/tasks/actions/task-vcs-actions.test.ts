import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getTaskVcsLinksAction,
  unlinkVcsResourceAction,
  getBitbucketRepositoriesAction,
} from "./task-vcs-actions"

const mocks = vi.hoisted(() => ({
  getCurrentOrganizationId: vi.fn(),
  revalidatePath: vi.fn(),
  getTaskVcsLinks: vi.fn(),
  deleteVcsLink: vi.fn(),
  resolveConnectionCredentials: vi.fn(),
  getRepositories: vi.fn(),
  supabaseCreateClient: vi.fn(),
  hasPermission: vi.fn(async () => true),
  hasRole: vi.fn(async () => true),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/modules/core/organizations/organization-actions", () => ({
  getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock("@/modules/core/database/supabase-server", () => ({
  createClient: mocks.supabaseCreateClient,
}))

vi.mock("../services/task-vcs-service", () => ({
  taskVcsService: {
    getTaskVcsLinks: mocks.getTaskVcsLinks,
    deleteVcsLink: mocks.deleteVcsLink,
  },
}))

vi.mock("@/modules/infrastructure/integrations/connection-secrets", () => ({
  resolveConnectionCredentials: mocks.resolveConnectionCredentials,
}))

vi.mock("@/modules/infrastructure/integrations/adapters/bitbucket-adapter", () => ({
  BitbucketAdapter: class {
    getRepositories = mocks.getRepositories
  },
}))

vi.mock("@/modules/core/iam/services/role-service", () => ({
  hasPermission: mocks.hasPermission,
}))

vi.mock("@/modules/core/iam/services/org-roles", () => ({
  hasRole: mocks.hasRole,
}))

describe("task-vcs-actions - Server Actions Unit Tests", () => {
  const orgId = "org-test-123"

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentOrganizationId.mockResolvedValue(orgId)
    mocks.hasPermission.mockResolvedValue(true)
    mocks.hasRole.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getTaskVcsLinksAction", () => {
    it("returns empty array when taskId is empty string or undefined", async () => {
      const res1 = await getTaskVcsLinksAction("")
      expect(res1).toEqual([])
      expect(mocks.getTaskVcsLinks).not.toHaveBeenCalled()

      const res2 = await getTaskVcsLinksAction(undefined as any)
      expect(res2).toEqual([])
      expect(mocks.getTaskVcsLinks).not.toHaveBeenCalled()
    })

    it("fetches links for task via taskVcsService when valid taskId provided", async () => {
      const mockLinks = [
        { id: "link-1", task_id: "task-100", title: "feature/pix-100" },
      ]
      mocks.getTaskVcsLinks.mockResolvedValue(mockLinks)

      const result = await getTaskVcsLinksAction("task-100")
      expect(result).toEqual(mockLinks)
      expect(mocks.getTaskVcsLinks).toHaveBeenCalledWith("task-100")
    })
  })

  describe("unlinkVcsResourceAction", () => {
    it("returns error when organization context is unavailable", async () => {
      mocks.getCurrentOrganizationId.mockResolvedValue(null)

      const result = await unlinkVcsResourceAction("link-1", "task-100")
      expect(result).toEqual({ success: false, error: "No organization context" })
      expect(mocks.deleteVcsLink).not.toHaveBeenCalled()
      expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it("deletes link and revalidates /operations/tasks on success", async () => {
      mocks.deleteVcsLink.mockResolvedValue(true)

      const result = await unlinkVcsResourceAction("link-1", "task-100")
      expect(result).toEqual({ success: true })
      expect(mocks.deleteVcsLink).toHaveBeenCalledWith("link-1", orgId)
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/operations/tasks")
    })

    it("returns success false and skips revalidatePath when deleteVcsLink fails", async () => {
      mocks.deleteVcsLink.mockResolvedValue(false)

      const result = await unlinkVcsResourceAction("link-1", "task-100")
      expect(result).toEqual({ success: false })
      expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe("getBitbucketRepositoriesAction", () => {
    it("returns connected: false when no active organization exists", async () => {
      mocks.getCurrentOrganizationId.mockResolvedValue(null)

      const result = await getBitbucketRepositoriesAction()
      expect(result).toEqual({ connected: false, repositories: [], canManageIntegrations: false })
    })

    it("evaluates canManageIntegrations as false when non-admin and without manage permission", async () => {
      mocks.hasPermission.mockResolvedValue(false)
      mocks.hasRole.mockResolvedValue(false)

      mocks.supabaseCreateClient.mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: null })),
                  })),
                })),
              })),
            })),
          })),
        })),
      })

      const result = await getBitbucketRepositoriesAction()
      expect(result).toEqual({ connected: false, repositories: [], canManageIntegrations: false })
    })

    it("returns connected: false when no Bitbucket connection is found in database", async () => {
      mocks.supabaseCreateClient.mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: null })),
                  })),
                })),
              })),
            })),
          })),
        })),
      })

      const result = await getBitbucketRepositoriesAction()
      expect(result).toEqual({ connected: false, repositories: [], canManageIntegrations: true })
    })

    it("resolves credentials, queries adapter, and returns repository list when connected", async () => {
      const mockConn = {
        id: "conn-bb-1",
        credentials: { encrypted_token: "enc-xyz" },
        metadata: { workspace: "pixy-corp" },
      }

      mocks.supabaseCreateClient.mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: mockConn })),
                  })),
                })),
              })),
            })),
          })),
        })),
      })

      mocks.resolveConnectionCredentials.mockResolvedValue({
        workspace: "pixy-corp",
        token: "token-123",
      })

      const mockRepos = [
        {
          full_name: "pixy-corp/backend-api",
          name: "backend-api",
          slug: "backend-api",
          is_private: true,
          html_url: "https://bitbucket.org/pixy-corp/backend-api",
          default_branch: "main",
        },
      ]
      mocks.getRepositories.mockResolvedValue(mockRepos)

      const result = await getBitbucketRepositoriesAction()
      expect(result).toEqual({
        connected: true,
        canManageIntegrations: true,
        repositories: mockRepos,
        workspace: "pixy-corp",
      })
      expect(mocks.resolveConnectionCredentials).toHaveBeenCalledWith(mockConn.credentials)
    })

    it("handles adapter error gracefully without throwing, falling back to empty list", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const mockConn = {
        id: "conn-bb-2",
        credentials: {},
        metadata: { workspace: "cached-workspace" },
      }

      mocks.supabaseCreateClient.mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: mockConn })),
                  })),
                })),
              })),
            })),
          })),
        })),
      })

      mocks.resolveConnectionCredentials.mockRejectedValue(new Error("Decryption failed"))

      const result = await getBitbucketRepositoriesAction()
      expect(result).toEqual({
        connected: true,
        canManageIntegrations: true,
        repositories: [],
        workspace: "cached-workspace",
      })
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })
})

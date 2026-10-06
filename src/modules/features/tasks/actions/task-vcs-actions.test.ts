import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getTaskVcsLinksAction,
  unlinkVcsResourceAction,
  getBitbucketRepositoriesAction,
  getGithubRepositoriesAction,
  getVcsRepositoriesAction,
} from "./task-vcs-actions"

const mocks = vi.hoisted(() => ({
  getCurrentOrganizationId: vi.fn(),
  revalidatePath: vi.fn(),
  getTaskVcsLinks: vi.fn(),
  deleteVcsLink: vi.fn(),
  resolveConnectionCredentials: vi.fn(),
  getRepositories: vi.fn(),
  getGithubRepositories: vi.fn(),
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

vi.mock("@/modules/infrastructure/integrations/adapters/github-adapter", () => ({
  GithubAdapter: class {
    getRepositories = mocks.getGithubRepositories
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
      expect(mocks.getTaskVcsLinks).toHaveBeenCalledWith("task-100", orgId)
    })

    it("returns empty array when organization context is unavailable", async () => {
      mocks.getCurrentOrganizationId.mockResolvedValue(null)

      const result = await getTaskVcsLinksAction("task-100")
      expect(result).toEqual([])
      expect(mocks.getTaskVcsLinks).not.toHaveBeenCalled()
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

    it("rejects unauthorized users lacking TASKS_MANAGE permission or admin/staff role", async () => {
      mocks.hasPermission.mockResolvedValue(false)
      mocks.hasRole.mockResolvedValue(false)

      const result = await unlinkVcsResourceAction("link-1", "task-100")
      expect(result).toEqual({
        success: false,
        error: "No autorizado para desvincular recursos de control de versiones",
      })
      expect(mocks.deleteVcsLink).not.toHaveBeenCalled()
      expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it("allows authorized users with staff role to unlink VCS resource", async () => {
      mocks.hasPermission.mockResolvedValue(false)
      mocks.hasRole.mockImplementation(async (role: string) => role === "staff")
      mocks.deleteVcsLink.mockResolvedValue(true)

      const result = await unlinkVcsResourceAction("link-1", "task-100")
      expect(result).toEqual({ success: true })
      expect(mocks.deleteVcsLink).toHaveBeenCalledWith("link-1", orgId)
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/operations/tasks")
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

    it("returns empty repository list and does not leak private repos when canManageIntegrations is false", async () => {
      mocks.hasPermission.mockResolvedValue(false)
      mocks.hasRole.mockResolvedValue(false)

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

      const result = await getBitbucketRepositoriesAction()
      expect(result).toEqual({
        connected: true,
        canManageIntegrations: false,
        repositories: [],
        workspace: "pixy-corp",
      })
      expect(mocks.resolveConnectionCredentials).not.toHaveBeenCalled()
      expect(mocks.getRepositories).not.toHaveBeenCalled()
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

  describe("getGithubRepositoriesAction", () => {
    it("returns connected: false when organization context is unavailable", async () => {
      mocks.getCurrentOrganizationId.mockResolvedValue(null)

      const result = await getGithubRepositoriesAction()
      expect(result).toEqual({ connected: false, repositories: [], canManageIntegrations: false })
      expect(mocks.supabaseCreateClient).not.toHaveBeenCalled()
    })

    it("returns connected: false when no active github connection exists", async () => {
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

      const result = await getGithubRepositoriesAction()
      expect(result).toEqual({ connected: false, repositories: [], canManageIntegrations: true })
    })

    it("returns connected: true with empty repos when user lacks MANAGE_INTEGRATIONS permission", async () => {
      mocks.hasPermission.mockResolvedValue(false)
      mocks.hasRole.mockResolvedValue(false)

      const mockConn = {
        id: "conn-gh-1",
        credentials: {},
        metadata: { owner: "my-github-org" },
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

      const result = await getGithubRepositoriesAction()
      expect(result).toEqual({
        connected: true,
        canManageIntegrations: false,
        repositories: [],
        owner: "my-github-org",
      })
      expect(mocks.getGithubRepositories).not.toHaveBeenCalled()
    })

    it("resolves credentials, queries GithubAdapter, and returns repository list when connected", async () => {
      const mockConn = {
        id: "conn-gh-2",
        credentials: { encrypted_token: "enc-gh" },
        metadata: { owner: "pixy-org" },
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
        owner: "pixy-org",
        token: "gh-token-123",
      })

      const mockRepos = [
        {
          full_name: "pixy-org/frontend-app",
          name: "frontend-app",
          slug: "frontend-app",
          is_private: true,
          html_url: "https://github.com/pixy-org/frontend-app",
          default_branch: "main",
        },
      ]
      mocks.getGithubRepositories.mockResolvedValue(mockRepos)

      const result = await getGithubRepositoriesAction()
      expect(result).toEqual({
        connected: true,
        canManageIntegrations: true,
        repositories: mockRepos,
        owner: "pixy-org",
      })
      expect(mocks.resolveConnectionCredentials).toHaveBeenCalledWith(mockConn.credentials)
    })

    it("handles adapter error gracefully without throwing, falling back to empty list", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const mockConn = {
        id: "conn-gh-3",
        credentials: {},
        metadata: { owner: "cached-gh-owner" },
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

      mocks.resolveConnectionCredentials.mockRejectedValue(new Error("Decryption error"))

      const result = await getGithubRepositoriesAction()
      expect(result).toEqual({
        connected: true,
        canManageIntegrations: true,
        repositories: [],
        owner: "cached-gh-owner",
      })
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe("getVcsRepositoriesAction", () => {
    it("unifies repositories across Bitbucket and GitHub with correct provider tags", async () => {
      const mockBbRepo = {
        full_name: "bb-team/api",
        name: "api",
        slug: "api",
        is_private: true,
        html_url: "https://bitbucket.org/bb-team/api",
        default_branch: "main",
      }
      const mockGhRepo = {
        full_name: "gh-org/web",
        name: "web",
        slug: "web",
        is_private: false,
        html_url: "https://github.com/gh-org/web",
        default_branch: "main",
      }

      // Mock database returning both connections
      mocks.supabaseCreateClient.mockImplementation(() => ({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn((_col: string, val: string) => ({
              eq: vi.fn((_providerCol: string, providerVal: string) => ({
                neq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => {
                      if (providerVal === "bitbucket") {
                        return { data: { id: "c-bb", credentials: {}, metadata: { workspace: "bb-team" } } }
                      }
                      if (providerVal === "github") {
                        return { data: { id: "c-gh", credentials: {}, metadata: { owner: "gh-org" } } }
                      }
                      return { data: null }
                    }),
                  })),
                })),
              })),
            })),
          })),
        })),
      }))

      mocks.resolveConnectionCredentials.mockResolvedValue({})
      mocks.getRepositories.mockResolvedValue([mockBbRepo])
      mocks.getGithubRepositories.mockResolvedValue([mockGhRepo])

      const result = await getVcsRepositoriesAction()

      expect(result.connected).toBe(true)
      expect(result.hasBitbucket).toBe(true)
      expect(result.hasGithub).toBe(true)
      expect(result.workspace).toBe("bb-team")
      expect(result.owner).toBe("gh-org")
      expect(result.repositories).toEqual([
        { ...mockBbRepo, provider: "bitbucket" },
        { ...mockGhRepo, provider: "github" },
      ])
    })

    it("handles case where only GitHub is connected", async () => {
      const mockGhRepo = {
        full_name: "gh-org/sole-repo",
        name: "sole-repo",
        slug: "sole-repo",
        is_private: false,
        html_url: "https://github.com/gh-org/sole-repo",
        default_branch: "main",
      }

      mocks.supabaseCreateClient.mockImplementation(() => ({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn((_col: string, _val: string) => ({
              eq: vi.fn((_providerCol: string, providerVal: string) => ({
                neq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => {
                      if (providerVal === "github") {
                        return { data: { id: "c-gh", credentials: {}, metadata: { owner: "gh-org" } } }
                      }
                      return { data: null }
                    }),
                  })),
                })),
              })),
            })),
          })),
        })),
      }))

      mocks.resolveConnectionCredentials.mockResolvedValue({})
      mocks.getGithubRepositories.mockResolvedValue([mockGhRepo])

      const result = await getVcsRepositoriesAction()

      expect(result.connected).toBe(true)
      expect(result.hasBitbucket).toBe(false)
      expect(result.hasGithub).toBe(true)
      expect(result.owner).toBe("gh-org")
      expect(result.repositories).toEqual([
        { ...mockGhRepo, provider: "github" },
      ])
    })
  })
})

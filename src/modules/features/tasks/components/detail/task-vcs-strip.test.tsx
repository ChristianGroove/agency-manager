import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TaskVcsStrip } from "./task-vcs-strip"
import { TaskItem, TaskProject } from "../../types"
import { TaskVcsLink } from "../../types/vcs"

const mocks = vi.hoisted(() => ({
  getTaskVcsLinksAction: vi.fn(),
}))

vi.mock("../../actions/task-vcs-actions", () => ({
  getTaskVcsLinksAction: mocks.getTaskVcsLinksAction,
}))

describe("TaskVcsStrip Component", () => {
  const baseTask: TaskItem = {
    id: "task-100",
    ticket_code: "PIX-100",
    title: "Setup OAuth Authentication",
    status: "in_progress",
    progress_percentage: 25,
    vcs_links: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as TaskItem

  const mockProject: TaskProject = {
    id: "proj-1",
    name: "Core Platform",
    settings: {
      vcs: {
        enabled: true,
        repository: "pixy-agency/core-platform",
      },
    },
  } as unknown as TaskProject

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTaskVcsLinksAction.mockResolvedValue([])
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders repository tag and suggested branch command when no links exist", () => {
    render(<TaskVcsStrip task={baseTask} project={mockProject} />)

    // Displays repository tag
    expect(screen.getByText("pixy-agency/core-platform")).toBeDefined()
    expect(screen.getByText("Control de Versiones (Git)")).toBeDefined()

    // Displays canonical branch suggestion
    expect(screen.getByText("feature/pix-100-setup-oauth-authentication")).toBeDefined()
    expect(screen.getByRole("button", { name: /Copiar Rama/i })).toBeDefined()
  })

  it("copies branch checkout command to clipboard upon button click", async () => {
    render(<TaskVcsStrip task={baseTask} project={mockProject} />)

    const copyBtn = screen.getByRole("button", { name: /Copiar Rama/i })
    fireEvent.click(copyBtn)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "git checkout -b feature/pix-100-setup-oauth-authentication"
    )

    await waitFor(() => {
      expect(screen.getByText("Copiado")).toBeDefined()
    })
  })

  it("renders active branch pills with copy button and external link", () => {
    const activeBranchLink: TaskVcsLink = {
      id: "link-branch-1",
      organization_id: "org-1",
      task_id: "task-100",
      provider: "bitbucket",
      resource_type: "branch",
      external_id: "feature/pix-100-auth",
      repository_name: "pixy-agency/core-platform",
      title: "feature/pix-100-auth",
      url: "https://bitbucket.org/pixy-agency/core-platform/branch/feature/pix-100-auth",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const taskWithBranch = {
      ...baseTask,
      vcs_links: [activeBranchLink],
    }

    render(<TaskVcsStrip task={taskWithBranch} project={mockProject} />)

    expect(screen.getByText("feature/pix-100-auth")).toBeDefined()
    const links = screen.getAllByRole("link")
    const branchLink = links.find((l) => l.getAttribute("href")?.includes("/branch/"))
    expect(branchLink?.getAttribute("href")).toBe(
      "https://bitbucket.org/pixy-agency/core-platform/branch/feature/pix-100-auth"
    )
  })

  it("renders deleted branch with line-through and 'Eliminada' badge without copy button", () => {
    const deletedBranchLink: TaskVcsLink = {
      id: "link-branch-deleted",
      organization_id: "org-1",
      task_id: "task-100",
      provider: "bitbucket",
      resource_type: "branch",
      external_id: "feature/pix-100-old-branch",
      repository_name: "pixy-agency/core-platform",
      title: "feature/pix-100-old-branch",
      status: "DELETED",
      url: "https://bitbucket.org/pixy-agency/core-platform/branch/feature/pix-100-old-branch",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const taskWithDeletedBranch = {
      ...baseTask,
      vcs_links: [deletedBranchLink],
    }

    render(<TaskVcsStrip task={taskWithDeletedBranch} project={mockProject} />)

    expect(screen.getByText("feature/pix-100-old-branch")).toBeDefined()
    expect(screen.getByText("Eliminada")).toBeDefined()

    // Since there are no active branches, it also shows the suggested branch checkout option
    expect(screen.getByText("feature/pix-100-setup-oauth-authentication")).toBeDefined()
  })

  it("renders pull requests with status badges for OPEN, MERGED, and DECLINED states", () => {
    const prMerged: TaskVcsLink = {
      id: "link-pr-1",
      organization_id: "org-1",
      task_id: "task-100",
      provider: "bitbucket",
      resource_type: "pull_request",
      external_id: "42",
      repository_name: "pixy-agency/core-platform",
      title: "Add OAuth flow",
      url: "https://bitbucket.org/pixy-agency/core-platform/pull-requests/42",
      status: "MERGED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const prDeclined: TaskVcsLink = {
      id: "link-pr-2",
      organization_id: "org-1",
      task_id: "task-100",
      provider: "bitbucket",
      resource_type: "pull_request",
      external_id: "43",
      repository_name: "pixy-agency/core-platform",
      title: "Discarded attempt",
      url: "https://bitbucket.org/pixy-agency/core-platform/pull-requests/43",
      status: "DECLINED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const taskWithPrs = {
      ...baseTask,
      vcs_links: [prMerged, prDeclined],
    }

    render(<TaskVcsStrip task={taskWithPrs} project={mockProject} />)

    expect(screen.getByText(/PR #42: Add OAuth flow/)).toBeDefined()
    expect(screen.getByText("MERGED")).toBeDefined()

    expect(screen.getByText(/PR #43: Discarded attempt/)).toBeDefined()
    expect(screen.getByText("DECLINED")).toBeDefined()
  })

  it("renders commit count badge when commit links are attached", () => {
    const commitLinks: TaskVcsLink[] = [
      {
        id: "link-c1",
        organization_id: "org-1",
        task_id: "task-100",
        provider: "bitbucket",
        resource_type: "commit",
        external_id: "hash111",
        repository_name: "pixy-agency/core-platform",
        title: "Initial commit",
        url: "https://bitbucket.org/pixy-agency/core-platform/commits/hash111",
        status: "COMMITTED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "link-c2",
        organization_id: "org-1",
        task_id: "task-100",
        provider: "bitbucket",
        resource_type: "commit",
        external_id: "hash222",
        repository_name: "pixy-agency/core-platform",
        title: "Fix tests",
        url: "https://bitbucket.org/pixy-agency/core-platform/commits/hash222",
        status: "COMMITTED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const taskWithCommits = {
      ...baseTask,
      vcs_links: commitLinks,
    }

    render(<TaskVcsStrip task={taskWithCommits} project={mockProject} />)

    expect(screen.getByText("2")).toBeDefined()
    expect(screen.getByText("commits")).toBeDefined()
  })

  it("renders CI/CD status badges when ci_status metadata is present", () => {
    const linkWithCiSuccess: TaskVcsLink = {
      id: "link-ci-pass",
      organization_id: "org-1",
      task_id: "task-100",
      provider: "bitbucket",
      resource_type: "commit",
      external_id: "hash123",
      repository_name: "pixy-agency/core-platform",
      title: "Commit with CI",
      url: "https://bitbucket.org/...",
      metadata: {
        ci_status: "SUCCESSFUL",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const taskWithCi = {
      ...baseTask,
      vcs_links: [linkWithCiSuccess],
    }

    render(<TaskVcsStrip task={taskWithCi} project={mockProject} />)

    expect(screen.getByText("CI Pasó")).toBeDefined()
  })

  it("asynchronously fetches VCS links via action if task.vcs_links is empty", async () => {
    const fetchedLinks: TaskVcsLink[] = [
      {
        id: "remote-link-1",
        organization_id: "org-1",
        task_id: "task-100",
        provider: "bitbucket",
        resource_type: "branch",
        external_id: "feature/pix-100-remote",
        repository_name: "pixy-agency/core-platform",
        title: "feature/pix-100-remote",
        status: "ACTIVE",
        url: "https://bitbucket.org/...",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    mocks.getTaskVcsLinksAction.mockResolvedValue(fetchedLinks)

    render(<TaskVcsStrip task={baseTask} project={mockProject} />)

    expect(mocks.getTaskVcsLinksAction).toHaveBeenCalledWith("task-100")

    await waitFor(() => {
      expect(screen.getByText("feature/pix-100-remote")).toBeDefined()
    })
  })

  describe("Deep-Link 1-Click Crear Pull Request en Bitbucket", () => {
    const activeBranchLink: TaskVcsLink = {
      id: "link-b-1",
      organization_id: "org-1",
      task_id: "task-100",
      provider: "bitbucket",
      resource_type: "branch",
      external_id: "feature/pix-100-auth-flow",
      repository_name: "pixy-agency/core-platform",
      title: "feature/pix-100-auth-flow",
      url: "https://bitbucket.org/pixy-agency/core-platform/branch/feature/pix-100-auth-flow",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it("renders [ 🚀 Crear Pull Request ] when active branch exists and has no open or merged PR", () => {
      const taskWithActiveBranch = {
        ...baseTask,
        vcs_links: [activeBranchLink],
      }

      render(<TaskVcsStrip task={taskWithActiveBranch} project={mockProject} />)

      const prBtn = screen.getByTestId("open-bitbucket-pr-btn")
      expect(prBtn).toBeDefined()
      expect(prBtn.textContent).toContain("Crear Pull Request")

      const href = prBtn.getAttribute("href")
      expect(href).toContain("https://bitbucket.org/pixy-agency/core-platform/pull-requests/new")
      expect(href).toContain("source=feature%2Fpix-100-auth-flow")
      expect(href).toContain("dest=main")
      expect(href).toContain("title=PIX-100%3A%20Setup%20OAuth%20Authentication")
    })

    it("does NOT render [ 🚀 Abrir PR en Bitbucket ] when an open PR already exists", () => {
      const openPrLink: TaskVcsLink = {
        id: "link-pr-1",
        organization_id: "org-1",
        task_id: "task-100",
        provider: "bitbucket",
        resource_type: "pull_request",
        external_id: "42",
        repository_name: "pixy-agency/core-platform",
        title: "PR #42: Setup OAuth",
        url: "https://bitbucket.org/pixy-agency/core-platform/pull-requests/42",
        status: "OPEN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const taskWithBranchAndPr = {
        ...baseTask,
        vcs_links: [activeBranchLink, openPrLink],
      }

      render(<TaskVcsStrip task={taskWithBranchAndPr} project={mockProject} />)

      expect(screen.queryByTestId("open-bitbucket-pr-btn")).toBeNull()
      expect(screen.getByText("PR #42: Setup OAuth")).toBeDefined()
    })

    it("does NOT render [ 🚀 Abrir PR en Bitbucket ] when PR is already MERGED", () => {
      const mergedPrLink: TaskVcsLink = {
        id: "link-pr-merged",
        organization_id: "org-1",
        task_id: "task-100",
        provider: "bitbucket",
        resource_type: "pull_request",
        external_id: "42",
        repository_name: "pixy-agency/core-platform",
        title: "PR #42: Setup OAuth",
        url: "https://bitbucket.org/pixy-agency/core-platform/pull-requests/42",
        status: "MERGED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const taskWithMergedPr = {
        ...baseTask,
        vcs_links: [activeBranchLink, mergedPrLink],
      }

      render(<TaskVcsStrip task={taskWithMergedPr} project={mockProject} />)

      expect(screen.queryByTestId("open-bitbucket-pr-btn")).toBeNull()
      expect(screen.getByText("MERGED")).toBeDefined()
    })

    it("renders [ 🚀 Abrir PR en Bitbucket ] with clean URL when repo is inherited from workspace or has .git/https prefix", () => {
      const projectWithWorkspaceInheritance = {
        id: "proj-ws-inherit",
        name: "Inherited Project",
        settings: {},
        workspace: {
          id: "ws-parent",
          settings: {
            vcs: {
              enabled: true,
              repositories: ["https://bitbucket.org/pixy-agency/inherited-core.git"],
              default_branch: "master",
            },
          },
        },
      } as any

      const activeBranchWithoutRepoName: TaskVcsLink = {
        ...activeBranchLink,
        repository_name: "",
      }

      const taskWithInheritedRepo = {
        ...baseTask,
        vcs_links: [activeBranchWithoutRepoName],
      }

      render(<TaskVcsStrip task={taskWithInheritedRepo} project={projectWithWorkspaceInheritance} />)

      const prBtn = screen.getByTestId("open-bitbucket-pr-btn")
      expect(prBtn).toBeDefined()
      const href = prBtn.getAttribute("href")
      // Must NOT contain double https://bitbucket.org or .git
      expect(href).toContain("https://bitbucket.org/pixy-agency/inherited-core/pull-requests/new")
      expect(href).toContain("dest=master")
      expect(href).not.toContain(".git")
    })

    it("renders canonical GitHub compare PR URL when active branch provider is github", () => {
      const githubBranchLink: TaskVcsLink = {
        id: "link-gh-1",
        organization_id: "org-1",
        task_id: "task-100",
        provider: "github",
        resource_type: "branch",
        external_id: "feature/pix-100-gh-flow",
        repository_name: "pixy-agency/github-repo",
        title: "feature/pix-100-gh-flow",
        url: "https://github.com/pixy-agency/github-repo/tree/feature/pix-100-gh-flow",
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const taskWithGithubBranch = {
        ...baseTask,
        vcs_links: [githubBranchLink],
      }

      render(<TaskVcsStrip task={taskWithGithubBranch} project={mockProject} />)

      const prBtn = screen.getByTestId("open-bitbucket-pr-btn")
      expect(prBtn).toBeDefined()
      const href = prBtn.getAttribute("href")
      expect(href).toContain("https://github.com/pixy-agency/github-repo/compare/main...feature%2Fpix-100-gh-flow")
      expect(href).toContain("expand=1")
      expect(href).toContain("title=PIX-100%3A%20Setup%20OAuth%20Authentication")
    })
  })
})

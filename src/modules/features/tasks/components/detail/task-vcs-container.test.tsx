import React from "react"
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { TaskVcsContainer } from "./task-vcs-container"
import { TaskItem, TaskProject } from "../../types"

// Mock Next.js dynamic import to render a predictable test component
vi.mock("next/dynamic", () => ({
  default: () => {
    return function DynamicMock(props: any) {
      return (
        <div
          data-testid="task-vcs-strip"
          data-task-id={props.task?.id}
          data-repo={props.project?.settings?.vcs?.repository}
        >
          Mocked TaskVcsStrip
        </div>
      )
    }
  }
}))

describe("TaskVcsContainer", () => {
  const baseTask: TaskItem = {
    id: "task-abc-123",
    ticket_code: "PIX-101",
    title: "Implement VCS tests",
    status: "in_progress",
    progress_percentage: 50,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as TaskItem

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Zero-render behavior for non-technical projects", () => {
    it("returns null when project is null and task has no VCS links", () => {
      const { container } = render(
        <TaskVcsContainer task={baseTask} project={null} />
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })

    it("returns null when project is undefined and task has empty VCS links", () => {
      const taskWithEmptyLinks = { ...baseTask, vcs_links: [] }
      const { container } = render(
        <TaskVcsContainer task={taskWithEmptyLinks} project={undefined} />
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })

    it("returns null for non-technical projects (Marketing, Design) with no VCS settings", () => {
      const marketingProject: TaskProject = {
        id: "proj-mkt-1",
        name: "Marketing & Growth Q4",
        settings: {
          category: "marketing",
        },
      } as unknown as TaskProject

      const { container } = render(
        <TaskVcsContainer task={baseTask} project={marketingProject} />
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })

    it("returns null when project explicitly has vcs.enabled = false and no repository", () => {
      const disabledVcsProject = {
        id: "proj-ops-2",
        name: "Operations & Logistics",
        settings: {
          vcs: {
            enabled: false,
            repository: "",
          },
        },
      }

      const { container } = render(
        <TaskVcsContainer task={baseTask} project={disabledVcsProject} />
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })

    it("returns null when project has vcs.enabled = false even if repository name is configured and task has no links", () => {
      const disabledVcsProjectWithRepo = {
        id: "proj-ops-3",
        name: "Operations & Logistics With Stale Repo",
        settings: {
          vcs: {
            enabled: false,
            repository: "acme-corp/stale-backend",
          },
        },
      }

      const { container } = render(
        <TaskVcsContainer task={baseTask} project={disabledVcsProjectWithRepo} />
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })
  })

  describe("Rendering behavior for VCS-enabled projects or tasks with links", () => {
    it("renders VCS strip when project has vcs.enabled = true", () => {
      const devProject = {
        id: "proj-dev-1",
        name: "Backend Core",
        settings: {
          vcs: {
            enabled: true,
          },
        },
      }

      render(<TaskVcsContainer task={baseTask} project={devProject} />)

      const strip = screen.getByTestId("task-vcs-strip")
      expect(strip).toBeDefined()
      expect(strip.getAttribute("data-task-id")).toBe("task-abc-123")
    })

    it("renders VCS strip when project has a repository configured", () => {
      const devProjectWithRepo = {
        id: "proj-dev-2",
        name: "Frontend App",
        settings: {
          vcs: {
            repository: "pixy-agency/frontend-client",
          },
        },
      }

      render(<TaskVcsContainer task={baseTask} project={devProjectWithRepo} />)

      const strip = screen.getByTestId("task-vcs-strip")
      expect(strip).toBeDefined()
      expect(strip.getAttribute("data-repo")).toBe("pixy-agency/frontend-client")
    })

    it("renders VCS strip when task already has VCS links, even if project is non-technical or null", () => {
      const taskWithLinks: TaskItem = {
        ...baseTask,
        vcs_links: [
          {
            id: "link-1",
            organization_id: "org-1",
            task_id: "task-abc-123",
            provider: "bitbucket",
            resource_type: "branch",
            external_id: "feature/PIX-101",
            repository_name: "acme/repo",
            title: "feature/PIX-101",
            url: "https://bitbucket.org/acme/repo/branch/feature/PIX-101",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      } as unknown as TaskItem

      render(<TaskVcsContainer task={taskWithLinks} project={null} />)

      const strip = screen.getByTestId("task-vcs-strip")
      expect(strip).toBeDefined()
      expect(strip.getAttribute("data-task-id")).toBe("task-abc-123")
    })

    it("renders VCS strip when task has links even if project explicitly disabled VCS", () => {
      const taskWithLinks: TaskItem = {
        ...baseTask,
        vcs_links: [
          {
            id: "link-2",
            organization_id: "org-1",
            task_id: "task-abc-123",
            provider: "bitbucket",
            resource_type: "commit",
            external_id: "abcdef123",
            repository_name: "acme/repo",
            title: "fix login",
            url: "https://bitbucket.org/acme/repo/commits/abcdef123",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      } as unknown as TaskItem

      const disabledProject = {
        id: "proj-legacy",
        settings: { vcs: { enabled: false } },
      }

      render(<TaskVcsContainer task={taskWithLinks} project={disabledProject} />)

      expect(screen.getByTestId("task-vcs-strip")).toBeDefined()
    })

    it("renders VCS strip when project has multi-repo array configured", () => {
      const multiRepoProject = {
        id: "proj-multi",
        name: "Microservices Platform",
        settings: {
          vcs: {
            enabled: true,
            repositories: ["acme/backend-api", "acme/frontend-spa"],
          },
        },
      }

      render(<TaskVcsContainer task={baseTask} project={multiRepoProject} />)

      expect(screen.getByTestId("task-vcs-strip")).toBeDefined()
    })

    it("renders VCS strip when project has no direct VCS settings but inherits from its parent workspace", () => {
      const projectWithWorkspaceVcs = {
        id: "proj-inherited",
        name: "Inherited App",
        settings: {},
        workspace: {
          id: "ws-parent",
          name: "Main Workspace",
          settings: {
            vcs: {
              enabled: true,
              repositories: ["org/inherited-repo"],
            },
          },
        },
      } as any

      render(<TaskVcsContainer task={baseTask} project={projectWithWorkspaceVcs} />)

      expect(screen.getByTestId("task-vcs-strip")).toBeDefined()
    })
  })

  describe("Collaborator Capabilities RBAC Guard", () => {
    const devProject = {
      id: "proj-dev-1",
      settings: { vcs: { enabled: true, repository: "pixy/app" } },
    }

    it("returns null when currentUserCapabilities has vcs_code = false", () => {
      const { container } = render(
        <TaskVcsContainer
          task={baseTask}
          project={devProject}
          currentUserCapabilities={{ vcs_code: false }}
        />
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })

    it("returns null for designer collaborator (default vcs_code: false)", () => {
      const designerCollaborator = {
        id: "collab-designer-1",
        role: "Diseñadora UI/UX",
        task_role: "designer" as const,
      } as any

      const { container } = render(
        <TaskVcsContainer
          task={baseTask}
          project={devProject}
          currentCollaborator={designerCollaborator}
        />
      )

      expect(container.firstChild).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })

    it("renders VCS strip for developer collaborator (default vcs_code: true)", () => {
      const devCollaborator = {
        id: "collab-dev-1",
        role: "Fullstack Dev",
        task_role: "developer" as const,
      } as any

      render(
        <TaskVcsContainer
          task={baseTask}
          project={devProject}
          currentCollaborator={devCollaborator}
        />
      )

      expect(screen.getByTestId("task-vcs-strip")).toBeDefined()
    })

    it("renders VCS strip when designer has custom override vcs_code: true in settings", () => {
      const designerWithOverride = {
        id: "collab-designer-tech",
        role: "Design System Engineer",
        task_role: "designer" as const,
        settings: {
          capabilities: {
            vcs_code: true,
          },
        },
      } as any

      render(
        <TaskVcsContainer
          task={baseTask}
          project={devProject}
          currentCollaborator={designerWithOverride}
        />
      )

      expect(screen.getByTestId("task-vcs-strip")).toBeDefined()
    })
  })
})

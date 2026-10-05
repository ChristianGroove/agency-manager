import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { TaskDetailModal } from "./task-detail-modal"
import { TaskPortalDetailModal } from "../portal/task-portal-detail-modal"
import type { TaskItem, TaskProject, TaskCollaborator } from "../../types"

// Global mocks for Radix UI and Browser APIs
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: vi.fn(),
  },
  writable: true,
})

// Mock Next.js dynamic for TaskVcsContainer
vi.mock("next/dynamic", () => ({
  default: () => {
    return function DynamicMock(props: any) {
      return (
        <div data-testid="task-vcs-strip" data-task-id={props.task?.id}>
          Mocked TaskVcsStrip
        </div>
      )
    }
  },
}))

// Mock server actions
vi.mock("../../actions/task-actions", () => ({
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTaskComments: vi.fn().mockResolvedValue([]),
  addTaskComment: vi.fn(),
  uploadTaskAttachment: vi.fn(),
  updateChecklistItemAssignee: vi.fn(),
  toggleChecklistItem: vi.fn(),
}))

vi.mock("../../actions/collaborator-portal-actions", () => ({
  portalCreateTask: vi.fn(),
  portalUpdateTask: vi.fn(),
  portalDeleteTask: vi.fn(),
  portalGetTaskComments: vi.fn().mockResolvedValue([]),
  portalAddTaskComment: vi.fn(),
  portalUploadTaskAttachment: vi.fn(),
}))

vi.mock("../../actions/task-tag-actions", () => ({
  getTenantTaskTags: vi.fn().mockResolvedValue([]),
  createTaskTag: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("Role-Based Privacy & VCS Leakage Prevention Audit", () => {
  const vcsProject: TaskProject = {
    id: "proj-tech",
    organization_id: "org-1",
    name: "Core Backend API",
    slug: "core-backend-api",
    color: "#6366f1",
    icon: "FolderKanban",
    status: "active",
    settings: {
      vcs: {
        enabled: true,
        repositories: ["pixy-agency/core-api"],
      },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const nonVcsProject: TaskProject = {
    id: "proj-mkt",
    organization_id: "org-1",
    name: "Marketing Q4",
    slug: "marketing-q4",
    color: "#f59e0b",
    icon: "FolderKanban",
    status: "active",
    settings: {
      vcs: {
        enabled: false,
      },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const vcsTask: TaskItem = {
    id: "task-101",
    organization_id: "org-1",
    project_id: vcsProject.id,
    project: vcsProject,
    ticket_code: "API-101",
    title: "Implement OAuth2 Token Revocation",
    description: "Ensure JWT tokens can be revoked immediately",
    status: "in_progress",
    priority: "high",
    type: "feature",
    progress_percentage: 50,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    vcs_links: [
      {
        id: "vcs-1",
        organization_id: "org-1",
        task_id: "task-101",
        provider: "bitbucket",
        resource_type: "branch",
        external_id: "feature/api-101-token-revocation",
        repository_name: "pixy-agency/core-api",
        title: "feature/api-101-token-revocation",
        url: "https://bitbucket.org/pixy-agency/core-api/branch/feature/api-101-token-revocation",
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  } as unknown as TaskItem

  const developerCollab: TaskCollaborator = {
    id: "staff-dev-1",
    organization_id: "org-1",
    first_name: "Carlos",
    last_name: "Dev",
    role: "Senior Fullstack Developer",
    task_role: "developer",
    access_token: "token-dev-1",
    is_active: true,
  }

  const designerCollab: TaskCollaborator = {
    id: "staff-des-1",
    organization_id: "org-1",
    first_name: "Elena",
    last_name: "Design",
    role: "UX/UI Designer",
    task_role: "designer",
    access_token: "token-des-1",
    is_active: true,
  }

  const pmDefaultCollab: TaskCollaborator = {
    id: "staff-pm-1",
    organization_id: "org-1",
    first_name: "Laura",
    last_name: "Manager",
    role: "Technical Project Manager",
    task_role: "pm",
    access_token: "token-pm-1",
    is_active: true,
  }

  const pmRestrictedCollab: TaskCollaborator = {
    id: "staff-pm-restricted",
    organization_id: "org-1",
    first_name: "Roberto",
    last_name: "NonTech Lead",
    role: "Operations PM",
    task_role: "pm",
    settings: {
      capabilities: {
        vcs_code: false, // Explicit enterprise exception: This PM must NOT see git repos
      },
    },
    access_token: "token-pm-2",
    is_active: true,
  }

  const supportCollab: TaskCollaborator = {
    id: "staff-sup-1",
    organization_id: "org-1",
    first_name: "Mario",
    last_name: "Support",
    role: "Customer Support Agent",
    task_role: "support",
    access_token: "token-sup-1",
    is_active: true,
  }

  const allCollabs = [
    developerCollab,
    designerCollab,
    pmDefaultCollab,
    pmRestrictedCollab,
    supportCollab,
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("TaskDetailModal - Role Isolation & Privacy", () => {
    it("DEVELOPER: Renders 'Rama Git' button and VCS container", () => {
      render(
        <TaskDetailModal
          task={vcsTask}
          isOpen={true}
          onClose={vi.fn()}
          collaborators={allCollabs}
          currentStaffId={developerCollab.id}
          isLeadOrPm={false}
        />
      )

      expect(screen.getByText("Rama Git")).toBeDefined()
      expect(screen.getByTestId("task-vcs-strip")).toBeDefined()
    })

    it("DESIGNER: Does NOT render 'Rama Git' button or VCS container (Zero Leakage)", () => {
      render(
        <TaskDetailModal
          task={vcsTask}
          isOpen={true}
          onClose={vi.fn()}
          collaborators={allCollabs}
          currentStaffId={designerCollab.id}
          isLeadOrPm={false}
        />
      )

      expect(screen.queryByText("Rama Git")).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })

    it("PM (Default): Renders 'Rama Git' button and VCS container", () => {
      render(
        <TaskDetailModal
          task={vcsTask}
          isOpen={true}
          onClose={vi.fn()}
          collaborators={allCollabs}
          currentStaffId={pmDefaultCollab.id}
          isLeadOrPm={true}
        />
      )

      expect(screen.getByText("Rama Git")).toBeDefined()
      expect(screen.getByTestId("task-vcs-strip")).toBeDefined()
    })

    it("PM (Restricted with vcs_code: false override): Does NOT render Git controls", () => {
      render(
        <TaskDetailModal
          task={vcsTask}
          isOpen={true}
          onClose={vi.fn()}
          collaborators={allCollabs}
          currentStaffId={pmRestrictedCollab.id}
          isLeadOrPm={true}
        />
      )

      // Even though isLeadOrPm is true, the explicit collaborator capability override blocks git visibility
      expect(screen.queryByText("Rama Git")).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })

    it("SUPPORT: Does NOT render 'Rama Git' button or VCS container", () => {
      render(
        <TaskDetailModal
          task={vcsTask}
          isOpen={true}
          onClose={vi.fn()}
          collaborators={allCollabs}
          currentStaffId={supportCollab.id}
          isLeadOrPm={false}
        />
      )

      expect(screen.queryByText("Rama Git")).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })

    it("NON-TECHNICAL PROJECT: Does NOT render Git controls even for Developer", () => {
      const nonVcsTask = {
        ...vcsTask,
        project_id: nonVcsProject.id,
        project: nonVcsProject,
        vcs_links: [],
      }

      render(
        <TaskDetailModal
          task={nonVcsTask}
          isOpen={true}
          onClose={vi.fn()}
          collaborators={allCollabs}
          currentStaffId={developerCollab.id}
          isLeadOrPm={false}
        />
      )

      expect(screen.queryByText("Rama Git")).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })
  })

  describe("TaskPortalDetailModal - Portal & Client Vault Privacy", () => {
    it("PORTAL DEVELOPER: Renders 'Rama Git' button and VCS container", () => {
      render(
        <TaskPortalDetailModal
          task={vcsTask}
          isOpen={true}
          onClose={vi.fn()}
          token="token-dev-1"
          isLeadOrPm={false}
          teamMembers={allCollabs as any}
          currentStaffId={developerCollab.id}
          projects={[vcsProject]}
        />
      )

      expect(screen.getByText("Rama Git")).toBeDefined()
      expect(screen.getByTestId("task-vcs-strip")).toBeDefined()
    })

    it("PORTAL DESIGNER: Does NOT render 'Rama Git' button or VCS container", () => {
      render(
        <TaskPortalDetailModal
          task={vcsTask}
          isOpen={true}
          onClose={vi.fn()}
          token="token-des-1"
          isLeadOrPm={false}
          teamMembers={allCollabs as any}
          currentStaffId={designerCollab.id}
          projects={[vcsProject]}
        />
      )

      expect(screen.queryByText("Rama Git")).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })

    it("EXTERNAL CLIENT / GUEST (No staff ID, viewing via PIN/Token): Client Vault shields all VCS data", () => {
      render(
        <TaskPortalDetailModal
          task={vcsTask}
          isOpen={true}
          onClose={vi.fn()}
          token="client-public-token"
          isLeadOrPm={false}
          teamMembers={allCollabs as any}
          currentStaffId={undefined} // Client has no staff ID
          projects={[vcsProject]}
        />
      )

      // Strict guarantee: External clients see ZERO git commands, ZERO repo URLs, ZERO vcs strip
      expect(screen.queryByText("Rama Git")).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })

    it("PORTAL RESTRICTED PM: Does NOT render Git controls when vcs_code is revoked", () => {
      render(
        <TaskPortalDetailModal
          task={vcsTask}
          isOpen={true}
          onClose={vi.fn()}
          token="token-pm-2"
          isLeadOrPm={true}
          teamMembers={allCollabs as any}
          currentStaffId={pmRestrictedCollab.id}
          projects={[vcsProject]}
        />
      )

      expect(screen.queryByText("Rama Git")).toBeNull()
      expect(screen.queryByTestId("task-vcs-strip")).toBeNull()
    })
  })
})

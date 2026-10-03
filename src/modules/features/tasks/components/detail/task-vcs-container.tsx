"use client"

import React from "react"
import dynamic from "next/dynamic"
import {
  TaskItem,
  TaskProject,
  TaskCollaborator,
  CollaboratorCapabilities,
  resolveCollaboratorCapabilities,
} from "../../types"

// Dynamic lazy import: Only downloaded if project is technical or has VCS links
const TaskVcsStripDynamic = dynamic(
  () => import("./task-vcs-strip").then((mod) => mod.TaskVcsStrip),
  {
    ssr: false,
    loading: () => null
  }
)

export interface TaskVcsContainerProps {
  task: TaskItem
  project?: { id?: string; name?: string; color?: string; settings?: any } | TaskProject | null
  currentCollaborator?: TaskCollaborator | null
  currentUserCapabilities?: CollaboratorCapabilities | null
}

/**
 * Conditional lazy container for VCS/Git integration
 * Guaranteed 0 bundle weight and 0 DOM nodes for non-technical projects
 * Enforces collaborator capability RBAC guard: if vcs_code is explicitly false, returns null
 */
export function TaskVcsContainer({
  task,
  project,
  currentCollaborator,
  currentUserCapabilities,
}: TaskVcsContainerProps) {
  // Permission guard: If user capabilities or currentCollaborator provided
  const capabilities =
    currentUserCapabilities ??
    (currentCollaborator ? resolveCollaboratorCapabilities(currentCollaborator) : null)

  if (capabilities && capabilities.vcs_code === false) {
    return null
  }

  // Check if VCS is relevant for this task/project or inherited from workspace
  const hasExistingLinks = Boolean(task.vcs_links && task.vcs_links.length > 0)

  const workspaceVcs = (project as any)?.workspace?.settings?.vcs
  const isWorkspaceVcsEnabled =
    workspaceVcs?.enabled !== false &&
    Boolean(
      workspaceVcs?.repository ||
      (Array.isArray(workspaceVcs?.repositories) && workspaceVcs.repositories.length > 0)
    )

  const isProjectVcsExplicitlyDisabled = project?.settings?.vcs?.enabled === false

  const isProjectVcsEnabled =
    !isProjectVcsExplicitlyDisabled &&
    Boolean(
      project?.settings?.vcs?.enabled ||
      project?.settings?.vcs?.repository ||
      (Array.isArray(project?.settings?.vcs?.repositories) && project.settings.vcs.repositories.length > 0) ||
      isWorkspaceVcsEnabled
    )

  // Zero intrusion: return null for Marketing, Design, Legal, or Operations projects
  if (!hasExistingLinks && !isProjectVcsEnabled) {
    return null
  }

  return <TaskVcsStripDynamic task={task} project={project} />
}

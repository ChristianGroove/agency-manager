"use client"

import React from "react"
import type { TaskMetrics, TaskItem, TaskCollaborator, TaskProject, TaskSprint } from "../../types"
import { TaskPmOperationsDashboard } from "../portal/task-pm-operations-dashboard"

interface TaskMetricsViewProps {
  metrics?: TaskMetrics
  tasks?: TaskItem[]
  collaborators?: TaskCollaborator[]
  projects?: TaskProject[]
  brandColor?: string
  sprints?: TaskSprint[]
  activeSprint?: TaskSprint | null
  onSprintCreated?: (sprint: TaskSprint) => void
  onSprintUpdated?: (sprint: TaskSprint) => void
  onSprintCompleted?: (completedSprintId: string, nextSprint?: TaskSprint) => void
  onSprintDeleted?: (deletedSprintId: string) => void
  onSelectTask?: (task: TaskItem) => void
  onSwitchToGeneral?: () => void
  onCreateTask?: () => void
  onCreateProject?: () => void
  onCreateSprint?: () => void
}

export function TaskMetricsView({
  metrics,
  tasks = [],
  collaborators = [],
  projects = [],
  brandColor = "#8ec045",
  sprints = [],
  activeSprint,
  onSprintCreated,
  onSprintUpdated,
  onSprintCompleted,
  onSprintDeleted,
  onSelectTask,
  onSwitchToGeneral,
  onCreateTask,
  onCreateProject,
  onCreateSprint,
}: TaskMetricsViewProps) {
  return (
    <div className="pt-1">
      <TaskPmOperationsDashboard
        tasks={tasks}
        teamMembers={collaborators}
        projects={projects}
        organization={{ name: "Plataforma" }}
        brandColor={brandColor}
        sprints={sprints}
        activeSprint={activeSprint}
        onSprintCreated={onSprintCreated}
        onSprintUpdated={onSprintUpdated}
        onSprintCompleted={onSprintCompleted}
        onSprintDeleted={onSprintDeleted}
        onSwitchToGestion={onSwitchToGeneral || (() => {})}
        onSelectTask={onSelectTask}
        onCreateTask={onCreateTask}
        onCreateProject={onCreateProject}
        onCreateSprint={onCreateSprint}
      />
    </div>
  )
}

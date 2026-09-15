import { Metadata } from "next"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import {
  getProjects,
  getTasks,
  getCollaborators,
  getTaskMetrics
} from "@/modules/features/tasks/actions/task-actions"
import { TaskManagerView } from "@/modules/features/tasks/components/task-manager-view"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Proyectos & Tareas | Pixy",
  description: "Gestión ágil colaborativa de tareas, proyectos y portales de colaboradores.",
}

export default async function TasksPage() {
  const orgId = await getCurrentOrganizationId()
  if (!orgId) {
    redirect("/dashboard")
  }

  const [projects, tasks, collaborators, metrics] = await Promise.all([
    getProjects(orgId),
    getTasks({ orgId }),
    getCollaborators(orgId),
    getTaskMetrics(orgId)
  ])

  return (
    <div className="flex-1 w-full">
      <TaskManagerView
        initialProjects={projects}
        initialTasks={tasks}
        initialCollaborators={collaborators}
        initialMetrics={metrics}
        organizationId={orgId}
      />
    </div>
  )
}

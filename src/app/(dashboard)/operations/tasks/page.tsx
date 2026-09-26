import { Metadata } from "next"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import {
  getWorkspaces,
  getProjects,
  getTasks,
  getCollaborators
} from "@/modules/features/tasks/actions/task-actions"
import { getSprints } from "@/modules/features/tasks/actions/task-sprint-actions"
import { getOrganizationBranding } from "@/modules/core/settings/actions/branding"
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

  const [tasks, collaborators, branding, sprints] = await Promise.all([
    getTasks({ orgId }),
    getCollaborators(orgId),
    getOrganizationBranding(),
    getSprints({ orgId })
  ])

  const tasksSummary = tasks.map((t) => ({ project_id: t.project_id, status: t.status }))

  const [workspaces, projects] = await Promise.all([
    getWorkspaces(orgId, tasksSummary),
    getProjects(orgId, undefined, tasksSummary)
  ])

  return (
    <div className="flex-1 w-full">
      <TaskManagerView
        initialWorkspaces={workspaces}
        initialProjects={projects}
        initialTasks={tasks}
        initialCollaborators={collaborators}
        initialSprints={sprints}
        organizationId={orgId}
        tenantBranding={{
          name: branding?.portal_title || branding?.agency_name,
          logoUrl: branding?.portal_logo_url,
          isotypeUrl: branding?.isotipo_url,
          primaryColor: branding?.portal_primary_color
        }}
      />
    </div>
  )
}

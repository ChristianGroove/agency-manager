import { Metadata } from "next"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import {
  getWorkspaces,
  getProjects,
  getTasks,
  getCollaborators
} from "@/modules/features/tasks/actions/task-actions"
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

  const [workspaces, projects, tasks, collaborators, branding] = await Promise.all([
    getWorkspaces(orgId),
    getProjects(orgId),
    getTasks({ orgId }),
    getCollaborators(orgId),
    getOrganizationBranding()
  ])

  return (
    <div className="flex-1 w-full">
      <TaskManagerView
        initialWorkspaces={workspaces}
        initialProjects={projects}
        initialTasks={tasks}
        initialCollaborators={collaborators}
        organizationId={orgId}
        tenantBranding={{
          name: branding?.portal_title,
          logoUrl: branding?.portal_logo_url,
          isotypeUrl: branding?.isotipo_url,
          primaryColor: branding?.portal_primary_color
        }}
      />
    </div>
  )
}

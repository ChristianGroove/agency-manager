"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import {
  TaskSprint,
  TaskSprintStatus,
  TaskItem,
  isStaffLeadOrPmRole
} from "../types"

/**
 * Resolve organization ID and permissions for sprint operations
 */
async function resolveOrgAndAuthority(providedOrgId?: string, portalToken?: string) {
  if (portalToken) {
    const { data: staff, error } = await supabaseAdmin
      .from("organization_staff")
      .select("id, role, task_role, organization_id, is_active, first_name, last_name")
      .eq("access_token", portalToken)
      .eq("is_active", true)
      .maybeSingle()

    if (error || !staff) {
      throw new Error("Acceso no autorizado o token inválido")
    }

    const isLeadOrPm = isStaffLeadOrPmRole(staff.role, (staff as any).task_role)

    return {
      organizationId: staff.organization_id,
      canManageSprints: isLeadOrPm,
      staffId: staff.id,
      staffName: `${staff.first_name} ${staff.last_name}`.trim(),
      isPortal: true
    }
  }

  // Platform context: verify session and membership
  const currentOrgId = await getCurrentOrganizationId()
  let orgId = currentOrgId

  if (providedOrgId && providedOrgId !== currentOrgId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("No autorizado")

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", providedOrgId)
      .eq("user_id", user.id)
      .maybeSingle()

    const { isSuperAdmin } = await import("@/modules/core/iam/services/platform-roles")
    if (!membership && !(await isSuperAdmin(user.id))) {
      throw new Error("No tienes acceso a la organización especificada")
    }
    orgId = providedOrgId
  }

  if (!orgId) {
    throw new Error("No se pudo resolver la organización activa en plataforma")
  }

  return {
    organizationId: orgId,
    canManageSprints: true,
    staffId: null,
    staffName: "Administrador",
    isPortal: false
  }
}

/**
 * Helper to log sprint audit comments on affected tasks
 */
async function logSprintAuditComment(
  orgId: string,
  taskId: string,
  content: string,
  authorName = "Sistema"
) {
  try {
    await supabaseAdmin.from("task_comments").insert({
      organization_id: orgId,
      task_id: taskId,
      author_type: "system",
      author_id: "system",
      author_name: authorName,
      author_avatar: null,
      content,
      mentions: []
    })
  } catch (err) {
    console.error("Error inserting sprint audit comment:", err)
  }
}

/**
 * Safely trigger revalidatePath without throwing when invoked outside Next.js request context
 */
function safeRevalidatePath(path = "/portal/tasks") {
  try {
    revalidatePath(path)
    revalidatePath("/operations/tasks")
  } catch {
    // Silently ignore in non-request contexts (scripts, crons, unit tests)
  }
}

/**
 * Get all sprints for the organization with live task completion counts
 */
export async function getSprints(options?: {
  orgId?: string
  token?: string
  workspaceId?: string
  projectId?: string
  status?: TaskSprintStatus
}): Promise<TaskSprint[]> {
  try {
    const { organizationId } = await resolveOrgAndAuthority(options?.orgId, options?.token)

    let query = supabaseAdmin
      .from("task_sprints")
      .select("*")
      .eq("organization_id", organizationId)
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (options?.workspaceId) {
      query = query.eq("workspace_id", options.workspaceId)
    }
    if (options?.projectId) {
      query = query.eq("project_id", options.projectId)
    }
    if (options?.status) {
      query = query.eq("status", options.status)
    }

    const { data: sprints, error } = await query
    if (error || !sprints) return []

    // Fetch task metrics for all fetched sprints
    const sprintIds = sprints.map((s) => s.id)
    if (sprintIds.length === 0) return []

    const { data: tasksData } = await supabaseAdmin
      .from("task_items")
      .select("id, sprint_id, status, estimated_hours, actual_hours")
      .in("sprint_id", sprintIds)

    const tasksBySprint: Record<string, typeof tasksData> = {}
    ;(tasksData || []).forEach((t) => {
      if (t.sprint_id) {
        if (!tasksBySprint[t.sprint_id]) tasksBySprint[t.sprint_id] = []
        tasksBySprint[t.sprint_id]!.push(t)
      }
    })

    return sprints.map((s): TaskSprint => {
      const sTasks = tasksBySprint[s.id] || []
      const total_tasks = sTasks.length
      const completed_tasks = sTasks.filter((t) => t.status === "done").length
      const total_hours = sTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0)
      const completed_hours = sTasks
        .filter((t) => t.status === "done")
        .reduce((sum, t) => sum + (Number(t.actual_hours) || Number(t.estimated_hours) || 0), 0)
      const progress_percentage = total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0

      return {
        ...s,
        total_tasks,
        completed_tasks,
        total_hours,
        completed_hours,
        progress_percentage
      }
    })
  } catch (err) {
    console.error("Error in getSprints:", err)
    return []
  }
}

/**
 * Get the currently active sprint (or check auto-rollover if cycle expired)
 */
export async function getActiveSprint(options?: {
  orgId?: string
  token?: string
  workspaceId?: string
  projectId?: string
}): Promise<TaskSprint | null> {
  try {
    const { organizationId, canManageSprints, staffName } = await resolveOrgAndAuthority(options?.orgId, options?.token)

    let query = supabaseAdmin
      .from("task_sprints")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)

    if (options?.workspaceId) {
      query = query.eq("workspace_id", options.workspaceId)
    }
    if (options?.projectId) {
      query = query.eq("project_id", options.projectId)
    }

    const { data: sprint, error } = await query.maybeSingle()
    if (error || !sprint) return null

    // Flag overdue status cleanly without triggering side-effect mutations during read
    const todayStr = new Date().toISOString().slice(0, 10)
    const isOverdue = Boolean(sprint.end_date && sprint.end_date < todayStr)

    // Compute live stats
    const { data: sTasks } = await supabaseAdmin
      .from("task_items")
      .select("id, status, estimated_hours, actual_hours")
      .eq("sprint_id", sprint.id)

    const tasksList = sTasks || []
    const total_tasks = tasksList.length
    const completed_tasks = tasksList.filter((t) => t.status === "done").length
    const total_hours = tasksList.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0)
    const completed_hours = tasksList
      .filter((t) => t.status === "done")
      .reduce((sum, t) => sum + (Number(t.actual_hours) || Number(t.estimated_hours) || 0), 0)
    const progress_percentage = total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0

    return {
      ...sprint,
      total_tasks,
      completed_tasks,
      total_hours,
      completed_hours,
      progress_percentage,
      isOverdue
    }
  } catch (err) {
    console.error("Error in getActiveSprint:", err)
    return null
  }
}

/**
 * Create a new Sprint
 */
export async function createSprint(params: {
  name: string
  goal?: string | null
  start_date: string
  end_date: string
  duration_days?: number
  auto_rollover?: boolean
  workspace_id?: string | null
  project_id?: string | null
  start_immediately?: boolean
  orgId?: string
  token?: string
}): Promise<{ success: boolean; sprint?: TaskSprint; error?: string }> {
  try {
    const auth = await resolveOrgAndAuthority(params.orgId, params.token)
    if (!auth.canManageSprints) {
      return { success: false, error: "No tienes permisos de PM/Líder para crear sprints" }
    }

    const duration_days = params.duration_days || 14
    let status: TaskSprintStatus = params.start_immediately ? "active" : "planning"

    // If starting immediately, mark any current active sprint as completed or keep it as planning
    if (status === "active") {
      await supabaseAdmin
        .from("task_sprints")
        .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("organization_id", auth.organizationId)
        .eq("status", "active")
    }

    const { data: newSprint, error } = await supabaseAdmin
      .from("task_sprints")
      .insert({
        organization_id: auth.organizationId,
        workspace_id: params.workspace_id || null,
        project_id: params.project_id || null,
        name: params.name.trim(),
        goal: params.goal?.trim() || null,
        start_date: params.start_date,
        end_date: params.end_date,
        duration_days,
        auto_rollover: Boolean(params.auto_rollover),
        status,
        created_by_staff_id: auth.staffId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select("*")
      .single()

    if (error || !newSprint) {
      console.error("Error creating sprint:", error)
      return { success: false, error: error?.message || "Error al crear el sprint" }
    }

    safeRevalidatePath("/portal/tasks")
    return {
      success: true,
      sprint: {
        ...newSprint,
        total_tasks: 0,
        completed_tasks: 0,
        total_hours: 0,
        completed_hours: 0,
        progress_percentage: 0
      }
    }
  } catch (err: any) {
    console.error("Error in createSprint:", err)
    return { success: false, error: err?.message || "Error inesperado" }
  }
}

/**
 * Start a planning sprint
 */
export async function startSprint(params: {
  sprintId: string
  orgId?: string
  token?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await resolveOrgAndAuthority(params.orgId, params.token)
    if (!auth.canManageSprints) {
      return { success: false, error: "No tienes permisos de PM/Líder para iniciar sprints" }
    }

    // 1. Fetch target sprint to determine its workspace_id
    const { data: targetSprint, error: fetchErr } = await supabaseAdmin
      .from("task_sprints")
      .select("id, workspace_id, organization_id")
      .eq("id", params.sprintId)
      .eq("organization_id", auth.organizationId)
      .single()

    if (fetchErr || !targetSprint) {
      return { success: false, error: "Sprint no encontrado" }
    }

    // 2. Complete any currently active sprint IN THIS WORKSPACE ONLY (A6 fix)
    let closeQuery = supabaseAdmin
      .from("task_sprints")
      .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("organization_id", auth.organizationId)
      .eq("status", "active")

    if (targetSprint.workspace_id) {
      closeQuery = closeQuery.eq("workspace_id", targetSprint.workspace_id)
    }

    await closeQuery

    const { error } = await supabaseAdmin
      .from("task_sprints")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", params.sprintId)
      .eq("organization_id", auth.organizationId)

    if (error) {
      return { success: false, error: error.message }
    }

    safeRevalidatePath("/portal/tasks")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Error inesperado" }
  }
}

/**
 * Complete a sprint and handle rollover (move to next sprint vs return to backlog)
 */
export async function completeSprint(params: {
  sprintId: string
  rolloverAction: "next_sprint" | "backlog"
  targetSprintId?: string | null
  createNewSprint?: boolean
  nextSprintName?: string
  orgId?: string
  token?: string
}): Promise<{
  success: boolean
  nextSprint?: TaskSprint
  movedTasksCount?: number
  error?: string
}> {
  try {
    const auth = await resolveOrgAndAuthority(params.orgId, params.token)
    if (!auth.canManageSprints) {
      return { success: false, error: "No tienes permisos de PM/Líder para completar sprints" }
    }

    // 1. Fetch current sprint
    const { data: currentSprint, error: sprintErr } = await supabaseAdmin
      .from("task_sprints")
      .select("*")
      .eq("id", params.sprintId)
      .eq("organization_id", auth.organizationId)
      .single()

    if (sprintErr || !currentSprint) {
      return { success: false, error: "Sprint no encontrado" }
    }

    // 2. Fetch all tasks in this sprint
    const { data: sprintTasks } = await supabaseAdmin
      .from("task_items")
      .select("id, ticket_code, title, status")
      .eq("sprint_id", params.sprintId)

    const allTasks = sprintTasks || []
    const incompleteTasks = allTasks.filter((t) => t.status !== "done")
    let targetSprint: TaskSprint | null = null

    // 3. Handle Rollover if there are incomplete tasks
    if (incompleteTasks.length > 0) {
      const incompleteIds = incompleteTasks.map((t) => t.id)

      if (params.rolloverAction === "next_sprint") {
        if (params.targetSprintId) {
          // Use specified target sprint
          const { data: target } = await supabaseAdmin
            .from("task_sprints")
            .select("*")
            .eq("id", params.targetSprintId)
            .eq("organization_id", auth.organizationId)
            .single()
          targetSprint = target as TaskSprint
        } else if (params.createNewSprint || !params.targetSprintId) {
          // Auto-generate next sprint name & dates
          const currentName = currentSprint.name
          const numMatch = currentName.match(/\d+/)
          const nextNum = numMatch ? parseInt(numMatch[0], 10) + 1 : 2
          const nextName = params.nextSprintName?.trim() || `Sprint ${nextNum}`

          const startDateObj = new Date(currentSprint.end_date)
          startDateObj.setDate(startDateObj.getDate() + 1)
          const endDateObj = new Date(startDateObj)
          endDateObj.setDate(endDateObj.getDate() + (currentSprint.duration_days || 14) - 1)

          const nextStartStr = startDateObj.toISOString().slice(0, 10)
          const nextEndStr = endDateObj.toISOString().slice(0, 10)

          const { data: created, error: createErr } = await supabaseAdmin
            .from("task_sprints")
            .insert({
              organization_id: auth.organizationId,
              workspace_id: currentSprint.workspace_id,
              project_id: currentSprint.project_id,
              name: nextName,
              goal: currentSprint.goal ? `Continuación de: ${currentSprint.goal}` : null,
              start_date: nextStartStr,
              end_date: nextEndStr,
              duration_days: currentSprint.duration_days || 14,
              auto_rollover: currentSprint.auto_rollover,
              status: "active",
              created_by_staff_id: auth.staffId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select("*")
            .single()

          if (!createErr && created) {
            targetSprint = created as TaskSprint
          }
        }

        if (targetSprint) {
          // Move incomplete tasks to next sprint
          await supabaseAdmin
            .from("task_items")
            .update({ sprint_id: targetSprint.id, updated_at: new Date().toISOString() })
            .in("id", incompleteIds)

          for (const t of incompleteTasks) {
            await logSprintAuditComment(
              auth.organizationId,
              t.id,
              `Rollover de Sprint: Movida de "${currentSprint.name}" hacia "${targetSprint.name}".`,
              auth.staffName
            )
          }
        }
      } else {
        // Return incomplete tasks to Backlog
        await supabaseAdmin
          .from("task_items")
          .update({ sprint_id: null, updated_at: new Date().toISOString() })
          .in("id", incompleteIds)
          .eq("organization_id", auth.organizationId)

        for (const t of incompleteTasks) {
          await logSprintAuditComment(
            auth.organizationId,
            t.id,
            `Cierre de Sprint "${currentSprint.name}": Tarea devuelta al Backlog general.`,
            auth.staffName
          )
        }
      }
    }

    // 4. Mark current sprint completed
    await supabaseAdmin
      .from("task_sprints")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", params.sprintId)
      .eq("organization_id", auth.organizationId)

    safeRevalidatePath("/portal/tasks")
    return {
      success: true,
      nextSprint: targetSprint || undefined,
      movedTasksCount: incompleteTasks.length
    }
  } catch (err: any) {
    console.error("Error in completeSprint:", err)
    return { success: false, error: err?.message || "Error al completar sprint" }
  }
}

/**
 * Assign or unassign tasks to a sprint (e.g. from backlog)
 */
export async function assignTasksToSprint(params: {
  sprintId: string | null
  taskIds: string[]
  orgId?: string
  token?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await resolveOrgAndAuthority(params.orgId, params.token)
    if (!auth.canManageSprints) {
      return { success: false, error: "No tienes permisos de PM/Líder para asignar tareas a sprints" }
    }

    if (!params.taskIds || params.taskIds.length === 0) {
      return { success: true }
    }

    let sprintName = "Backlog"
    if (params.sprintId) {
      const { data: s } = await supabaseAdmin
        .from("task_sprints")
        .select("name")
        .eq("id", params.sprintId)
        .eq("organization_id", auth.organizationId)
        .single()
      if (s) sprintName = s.name
    }

    const { error } = await supabaseAdmin
      .from("task_items")
      .update({
        sprint_id: params.sprintId,
        updated_at: new Date().toISOString()
      })
      .in("id", params.taskIds)
      .eq("organization_id", auth.organizationId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Log audit comments
    const auditText = params.sprintId
      ? `Asignada al sprint "${sprintName}".`
      : `Retirada del sprint al Backlog.`

    for (const tid of params.taskIds) {
      await logSprintAuditComment(auth.organizationId, tid, auditText, auth.staffName)
    }

    safeRevalidatePath("/portal/tasks")
    return { success: true }
  } catch (err: any) {
    console.error("Error in assignTasksToSprint:", err)
    return { success: false, error: err?.message || "Error al asignar tareas" }
  }
}

/**
 * Update sprint details (name, goal, dates, auto_rollover)
 */
export async function updateSprint(params: {
  sprintId: string
  updates: Partial<TaskSprint>
  orgId?: string
  token?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await resolveOrgAndAuthority(params.orgId, params.token)
    if (!auth.canManageSprints) {
      return { success: false, error: "No tienes permisos de PM/Líder" }
    }

    const allowedUpdates: any = {}
    if (params.updates.name !== undefined) allowedUpdates.name = params.updates.name.trim()
    if (params.updates.goal !== undefined) allowedUpdates.goal = params.updates.goal?.trim() || null
    if (params.updates.start_date !== undefined) allowedUpdates.start_date = params.updates.start_date
    if (params.updates.end_date !== undefined) allowedUpdates.end_date = params.updates.end_date
    if (params.updates.auto_rollover !== undefined) allowedUpdates.auto_rollover = Boolean(params.updates.auto_rollover)
    if (params.updates.status !== undefined) allowedUpdates.status = params.updates.status
    allowedUpdates.updated_at = new Date().toISOString()

    const { error } = await supabaseAdmin
      .from("task_sprints")
      .update(allowedUpdates)
      .eq("id", params.sprintId)
      .eq("organization_id", auth.organizationId)

    if (error) {
      return { success: false, error: error.message }
    }

    safeRevalidatePath("/portal/tasks")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Error al actualizar sprint" }
  }
}

/**
 * Delete a sprint and release its tasks back to backlog
 */
export async function deleteSprint(params: {
  sprintId: string
  orgId?: string
  token?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await resolveOrgAndAuthority(params.orgId, params.token)
    if (!auth.canManageSprints) {
      return { success: false, error: "No tienes permisos de PM/Líder" }
    }

    // 1. Unassign all tasks
    await supabaseAdmin
      .from("task_items")
      .update({ sprint_id: null, updated_at: new Date().toISOString() })
      .eq("sprint_id", params.sprintId)
      .eq("organization_id", auth.organizationId)

    // 2. Delete sprint
    const { error } = await supabaseAdmin
      .from("task_sprints")
      .delete()
      .eq("id", params.sprintId)
      .eq("organization_id", auth.organizationId)

    if (error) {
      return { success: false, error: error.message }
    }

    safeRevalidatePath("/portal/tasks")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Error al eliminar sprint" }
  }
}
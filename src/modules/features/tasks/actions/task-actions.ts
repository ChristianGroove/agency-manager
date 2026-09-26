"use server"

import { createClient } from "@/modules/core/database/supabase-server";
import { supabaseAdmin } from "@/modules/core/database/supabase-admin";
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions";
import { revalidatePath } from "next/cache";
import type {
  TaskWorkspace,
  TaskProject,
  TaskItem,
  TaskComment,
  TaskCollaborator,
  TaskMetrics,
  TaskStatus,
  TaskPriority,
  TaskType,
  CollaboratorRole,
  TaskChecklistItem,
  TaskAttachment,
  TaskMeetingAttendee,
  TaskMeetingAttendanceStatus,
  TaskMeetingCheckinMethod
} from "../types";
import {
  normalizeTask,
  parseTaskChecklist,
  inferTaskRole,
  isStaffLeadOrPmRole,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  getMeetingAttendanceWindowStatus
} from "../types";
import { calculateNextRecurrence } from "../utils/recurrence-utils";

/**
 * Helper to get current organization ID safely with authenticated session validation
 */
async function resolveOrgId(providedOrgId?: string): Promise<string> {
  const currentOrgId = await getCurrentOrganizationId();
  let orgId = currentOrgId;

  if (providedOrgId && providedOrgId !== currentOrgId) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autorizado");

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", providedOrgId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { isSuperAdmin } = await import("@/modules/core/iam/services/platform-roles");
    if (!membership && !(await isSuperAdmin(user.id))) {
      throw new Error("No tienes acceso a la organización especificada");
    }
    orgId = providedOrgId;
  }

  if (!orgId) throw new Error("No se pudo resolver la organización activa");
  return orgId;
}

/**
 * Helper to log single-line system audit notes into task_comments with @mentions indexing
 */
async function logTaskAuditComment(
  orgId: string,
  taskId: string,
  content: string,
  authorName: string = "Sistema",
  explicitMentions?: string[]
) {
  try {
    const extracted = explicitMentions && explicitMentions.length > 0
      ? explicitMentions
      : Array.from(content.matchAll(/@([a-zA-Z0-9_\.\u00C0-\u017F]+)/g)).map((m) => m[1]);

    await supabaseAdmin.from("task_comments").insert({
      organization_id: orgId,
      task_id: taskId,
      author_type: "system",
      author_id: "system",
      author_name: authorName,
      author_avatar: null,
      content,
      mentions: Array.from(new Set(extracted.filter(Boolean)))
    });
  } catch (err) {
    console.error("Error inserting task audit comment:", err);
  }
}

/**
 * Automatic unblocker: When a task is marked done, notify and unblock dependent tasks
 */
async function handleTaskUnblocking(completedTaskId: string, ticketCode: string, title: string): Promise<TaskItem[]> {
  try {
    const { data: blockedTasks } = await supabaseAdmin
      .from("task_items")
      .select("id, ticket_code, title, status, progress_percentage, organization_id, assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(first_name)")
      .eq("blocked_by_task_id", completedTaskId);

    if (!blockedTasks || blockedTasks.length === 0) return [];

    const unblockedIds: string[] = [];
    for (const bt of blockedTasks) {
      const mentionTag = (bt as any)?.assigned_staff?.first_name ? ` @${(bt as any).assigned_staff.first_name}` : "";
      await logTaskAuditComment(
        bt.organization_id,
        bt.id,
        `Desbloqueo: El ticket predecesor #${ticketCode} (${title}) fue completado. Tarea lista para avanzar.${mentionTag}`
      );

      if (bt.status === "blocked") {
        const restoredStatus = ((bt as any)?.progress_percentage || 0) > 0 ? "in_progress" : "todo";
        await supabaseAdmin
          .from("task_items")
          .update({ status: restoredStatus, blocked_reason: null, updated_at: new Date().toISOString() })
          .eq("id", bt.id);
        unblockedIds.push(bt.id);
      }
    }

    if (unblockedIds.length > 0) {
      const { data: updatedList } = await supabaseAdmin
        .from("task_items")
        .select(`
          *,
          assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(
            id, first_name, last_name, photo_url, role, email
          ),
          qa_staff:organization_staff!task_items_qa_staff_id_fkey(
            id, first_name, last_name, photo_url, role
          ),
          project:task_projects!task_items_project_id_fkey(
            id, name, color
          ),
          blocked_by:blocked_by_task_id(
            id, ticket_code, title, status
          )
        `)
        .in("id", unblockedIds);

      return (updatedList || []).map(normalizeTask);
    }

    return [];
  } catch (err) {
    console.error("Error running task unblocking:", err);
    return [];
  }
}

/**
 * Universal stakeholder notifier for key task lifecycle transitions (Task Actions):
 * - in_review: notifies active PMs/leads and assigned QA specialist
 * - done: notifies active PMs/leads and original ticket creator
 * - blocked: notifies active PMs/leads with reason
 * - in_progress (when previously blocked): notifies assigned staff and PMs
 */
async function notifyStakeholdersOnStatusChange(
  orgId: string,
  taskId: string,
  newStatus: TaskStatus,
  prevStatus: TaskStatus,
  authorName: string = "Sistema",
  currentActorStaffId?: string,
  blockedReason?: string | null
) {
  if (newStatus === prevStatus) return;

  try {
    const { data: task } = await supabaseAdmin
      .from("task_items")
      .select(`
        id, ticket_code, title, assigned_staff_id, qa_staff_id, created_by_staff_id,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(id, first_name, last_name, role),
        qa_staff:organization_staff!task_items_qa_staff_id_fkey(id, first_name, last_name, role),
        creator_staff:organization_staff!task_items_created_by_staff_id_fkey(id, first_name, last_name, role)
      `)
      .eq("id", taskId)
      .maybeSingle();

    if (!task) return;

    const { data: pmStaffList } = await supabaseAdmin
      .from("organization_staff")
      .select("id, first_name, last_name, role")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .or("role.ilike.%gestor%,role.ilike.%pm%,role.ilike.%lead%,role.ilike.%lider%,role.ilike.%líder%");

    const targetStaff: { id: string; first_name: string; roleDesc: string }[] = [];

    const addRecipient = (member?: { id: string; first_name: string; role?: string | null } | null, roleDesc: string = "") => {
      if (!member || !member.first_name) return;
      if (currentActorStaffId && member.id === currentActorStaffId) return;
      if (!targetStaff.some((s) => s.id === member.id)) {
        targetStaff.push({ id: member.id, first_name: member.first_name, roleDesc });
      }
    };

    if (newStatus === "in_review") {
      (pmStaffList || []).forEach((pm) => addRecipient(pm, "Gestor de Proyecto"));
      if ((task as any).qa_staff) addRecipient((task as any).qa_staff, "QA");
      if ((task as any).creator_staff) addRecipient((task as any).creator_staff, "Creador");
    } else if (newStatus === "done") {
      (pmStaffList || []).forEach((pm) => addRecipient(pm, "Gestor de Proyecto"));
      if ((task as any).creator_staff) addRecipient((task as any).creator_staff, "Creador");
    } else if (newStatus === "blocked") {
      (pmStaffList || []).forEach((pm) => addRecipient(pm, "Gestor de Proyecto"));
    } else if (newStatus === "in_progress" && prevStatus === "blocked") {
      (pmStaffList || []).forEach((pm) => addRecipient(pm, "Gestor de Proyecto"));
      if ((task as any).assigned_staff) addRecipient((task as any).assigned_staff, "Responsable");
    }

    const newLabel = TASK_STATUS_LABELS[newStatus] || newStatus;
    const oldLabel = TASK_STATUS_LABELS[prevStatus] || prevStatus;

    let actionDesc = `Estado actualizado a "${newLabel}" (anterior: "${oldLabel}")`;

    if (newStatus === "in_review") {
      actionDesc = `Requerimiento enviado a Revisión / QA por ${authorName}`;
    } else if (newStatus === "done") {
      actionDesc = `Tarea completada exitosamente por ${authorName}`;
    } else if (newStatus === "blocked") {
      const reasonText = blockedReason && blockedReason.trim() ? `: "${blockedReason.trim()}"` : "";
      actionDesc = `Tarea bloqueada${reasonText}`;
    } else if (newStatus === "in_progress" && prevStatus === "blocked") {
      actionDesc = `Tarea desbloqueada y en progreso`;
    }

    const auditContent = actionDesc;
    const explicitNames = targetStaff.map((s) => s.first_name);

    await logTaskAuditComment(
      orgId,
      taskId,
      auditContent,
      authorName,
      explicitNames
    );
  } catch (err) {
    console.error("Error notifying stakeholders on status change:", err);
  }
}

/**
 * Fetch all workspaces for an organization
 */
export async function getWorkspaces(
  orgId?: string,
  preloadedTasks?: { project_id: string }[]
): Promise<TaskWorkspace[]> {
  const activeOrgId = await resolveOrgId(orgId);

  const { data: workspaces, error } = await supabaseAdmin
    .from("task_workspaces")
    .select(`
      *,
      lead_staff:organization_staff!task_workspaces_lead_staff_id_fkey(
        id, first_name, last_name, photo_url, role
      )
    `)
    .eq("organization_id", activeOrgId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching task workspaces:", error);
    return [];
  }

  // Count projects and tasks per workspace
  const { data: projects } = await supabaseAdmin
    .from("task_projects")
    .select("id, workspace_id")
    .eq("organization_id", activeOrgId);

  let taskList = preloadedTasks;
  if (!taskList) {
    const { data: tasks } = await supabaseAdmin
      .from("task_items")
      .select("project_id")
      .eq("organization_id", activeOrgId);
    taskList = tasks || [];
  }

  const projectWorkspaceMap = new Map<string, string>();
  const workspaceProjectCount = new Map<string, number>();
  (projects || []).forEach((p) => {
    if (p.workspace_id) {
      projectWorkspaceMap.set(p.id, p.workspace_id);
      workspaceProjectCount.set(p.workspace_id, (workspaceProjectCount.get(p.workspace_id) || 0) + 1);
    }
  });

  const workspaceTaskCount = new Map<string, number>();
  (taskList || []).forEach((t) => {
    const wsId = projectWorkspaceMap.get(t.project_id);
    if (wsId) {
      workspaceTaskCount.set(wsId, (workspaceTaskCount.get(wsId) || 0) + 1);
    }
  });

  return (workspaces || []).map((w: any) => ({
    ...w,
    project_count: workspaceProjectCount.get(w.id) || 0,
    task_count: workspaceTaskCount.get(w.id) || 0,
  }));
}

/**
 * Create a new workspace (parent space)
 */
export async function createWorkspace(data: {
  name: string;
  key_prefix: string;
  description?: string;
  color?: string;
  icon?: string;
  lead_staff_id?: string | null;
  organization_id?: string;
  parallel_team_enabled?: boolean;
  support_config?: Record<string, any>;
}): Promise<{ success: boolean; workspace?: TaskWorkspace; error?: string }> {
  try {
    const orgId = await resolveOrgId(data.organization_id);
    const slug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || `ws-${Date.now()}`;

    const keyPrefix = (data.key_prefix || "WEB").toUpperCase().trim().replace(/[^A-Z0-9]/g, "");

    const { data: newWorkspace, error } = await supabaseAdmin
      .from("task_workspaces")
      .insert({
        organization_id: orgId,
        name: data.name,
        slug: `${slug}-${Math.floor(1000 + Math.random() * 9000)}`,
        key_prefix: keyPrefix,
        description: data.description || null,
        color: data.color || "#0284c7",
        icon: data.icon || "Globe",
        lead_staff_id: data.lead_staff_id || null,
        parallel_team_enabled: data.parallel_team_enabled ?? false,
        support_config: data.support_config ?? {},
      })
      .select(`
        *,
        lead_staff:organization_staff!task_workspaces_lead_staff_id_fkey(
          id, first_name, last_name, photo_url, role
        )
      `)
      .single();

    if (error) throw error;
    revalidatePath("/operations/tasks");
    return { success: true, workspace: newWorkspace as TaskWorkspace };
  } catch (err: any) {
    console.error("Error creating workspace:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing workspace
 */
export async function updateWorkspace(
  workspaceId: string,
  data: Partial<TaskWorkspace>,
  orgId?: string
): Promise<{ success: boolean; workspace?: TaskWorkspace; error?: string }> {
  try {
    const activeOrgId = await resolveOrgId(orgId);
    const updateData: any = { ...data, updated_at: new Date().toISOString() };
    delete updateData.lead_staff;
    delete updateData.project_count;
    delete updateData.task_count;

    const { data: updated, error } = await supabaseAdmin
      .from("task_workspaces")
      .update(updateData)
      .eq("id", workspaceId)
      .eq("organization_id", activeOrgId)
      .select(`
        *,
        lead_staff:organization_staff!task_workspaces_lead_staff_id_fkey(
          id, first_name, last_name, photo_url, role
        )
      `)
      .single();

    if (error) throw error;
    revalidatePath("/operations/tasks");
    return { success: true, workspace: updated as TaskWorkspace };
  } catch (err: any) {
    console.error("Error updating workspace:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(workspaceId: string, orgId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const activeOrgId = await resolveOrgId(orgId);
    const { error } = await supabaseAdmin
      .from("task_workspaces")
      .delete()
      .eq("id", workspaceId)
      .eq("organization_id", activeOrgId);

    if (error) throw error;
    revalidatePath("/operations/tasks");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting workspace:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all projects for an organization
 */
export async function getProjects(
  orgId?: string,
  workspaceId?: string,
  preloadedTasks?: { project_id: string; status: string }[]
): Promise<TaskProject[]> {
  const activeOrgId = await resolveOrgId(orgId);

  let query = supabaseAdmin
    .from("task_projects")
    .select(`
      *,
      workspace:task_workspaces!task_projects_workspace_id_fkey(
        id, name, slug, key_prefix, color, icon
      ),
      lead_staff:organization_staff!task_projects_lead_staff_id_fkey(
        id, first_name, last_name, photo_url, role
      )
    `)
    .eq("organization_id", activeOrgId)
    .order("created_at", { ascending: false });

  if (workspaceId && workspaceId !== "all") {
    query = query.eq("workspace_id", workspaceId);
  }

  const { data: projects, error } = await query;

  if (error) {
    console.error("Error fetching task projects:", error);
    return [];
  }

  // Fetch task counts per project
  let taskCounts = preloadedTasks;
  if (!taskCounts) {
    const { data } = await supabaseAdmin
      .from("task_items")
      .select("project_id, status")
      .eq("organization_id", activeOrgId);
    taskCounts = data || [];
  }

  const countsMap = new Map<string, { total: number; done: number }>();
  (taskCounts || []).forEach((t) => {
    const current = countsMap.get(t.project_id) || { total: 0, done: 0 };
    current.total += 1;
    if (t.status === "done") current.done += 1;
    countsMap.set(t.project_id, current);
  });

  return (projects || []).map((p) => {
    const counts = countsMap.get(p.id) || { total: 0, done: 0 };
    const progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
    return {
      ...p,
      task_count: counts.total,
      completed_count: counts.done,
      progress_percentage: progress
    };
  });
}

/**
 * Create a new task project
 */
export async function createProject(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  workspace_id?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  lead_staff_id?: string | null;
  organization_id?: string;
}): Promise<{ success: boolean; project?: TaskProject; error?: string }> {
  try {
    const orgId = await resolveOrgId(data.organization_id);
    const slug = data.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || `project-${Date.now()}`;

    // Ensure unique slug within organization
    const finalSlug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: newProject, error } = await supabaseAdmin
      .from("task_projects")
      .insert({
        organization_id: orgId,
        workspace_id: data.workspace_id || null,
        name: data.name,
        slug: finalSlug,
        description: data.description || null,
        color: data.color || "#6366f1",
        icon: data.icon || "FolderKanban",
        lead_staff_id: data.lead_staff_id || null,
        start_date: data.start_date || null,
        target_date: data.target_date || null,
        status: "active"
      })
      .select(`
        *,
        workspace:task_workspaces!task_projects_workspace_id_fkey(
          id, name, slug, key_prefix, color, icon
        ),
        lead_staff:organization_staff!task_projects_lead_staff_id_fkey(
          id, first_name, last_name, photo_url, role
        )
      `)
      .single();

    if (error) throw error;

    revalidatePath("/operations/tasks");
    return { success: true, project: newProject };
  } catch (err: any) {
    console.error("Error creating project:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing project
 */
export async function updateProject(
  projectId: string,
  data: Partial<TaskProject>,
  orgId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const activeOrgId = await resolveOrgId(orgId);
    const updateData: any = { ...data, updated_at: new Date().toISOString() };
    delete updateData.lead_staff;
    delete updateData.task_count;
    delete updateData.completed_count;
    delete updateData.progress_percentage;

    const { error } = await supabaseAdmin
      .from("task_projects")
      .update(updateData)
      .eq("id", projectId)
      .eq("organization_id", activeOrgId);

    if (error) throw error;
    revalidatePath("/operations/tasks");
    return { success: true };
  } catch (err: any) {
    console.error("Error updating project:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string, orgId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const activeOrgId = await resolveOrgId(orgId);
    const { error } = await supabaseAdmin
      .from("task_projects")
      .delete()
      .eq("id", projectId)
      .eq("organization_id", activeOrgId);

    if (error) throw error;
    revalidatePath("/operations/tasks");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting project:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch tasks with optional filters
 */
export async function getTasks(params?: {
  orgId?: string;
  workspaceId?: string;
  projectId?: string;
  status?: TaskStatus;
  assignedStaffId?: string;
  originType?: 'internal' | 'support' | 'all';
}): Promise<TaskItem[]> {
  const activeOrgId = await resolveOrgId(params?.orgId);

  let query = supabaseAdmin
    .from("task_items")
    .select(`
      *,
      assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(
        id, first_name, last_name, photo_url, role, email
      ),
      qa_staff:organization_staff!task_items_qa_staff_id_fkey(
        id, first_name, last_name, photo_url, role
      ),
      project:task_projects!task_items_project_id_fkey(
        id, name, color
      ),
      blocked_by:blocked_by_task_id(
        id, ticket_code, title, status
      )
    `)
    .eq("organization_id", activeOrgId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  // Filter by origin_type: default to internal tasks to isolate support from standard operations
  if (!params?.originType || params.originType === 'internal') {
    query = query.or("origin_type.neq.support,origin_type.is.null");
  } else if (params.originType === 'support') {
    query = query.eq("origin_type", "support");
  }

  if (params?.projectId && params.projectId !== "all") {
    query = query.eq("project_id", params.projectId);
  } else if (params?.workspaceId && params.workspaceId !== "all") {
    // If workspace is selected without specific project, filter to projects in that workspace
    const { data: wsProjects } = await supabaseAdmin
      .from("task_projects")
      .select("id")
      .eq("workspace_id", params.workspaceId);

    const projectIds = (wsProjects || []).map((p) => p.id);
    if (projectIds.length > 0) {
      query = query.in("project_id", projectIds);
    } else {
      return [];
    }
  }

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  if (params?.assignedStaffId) {
    query = query.eq("assigned_staff_id", params.assignedStaffId);
  }

  const { data, error } = await query;
  const rawTasks = data || [];

  // Auto-cierre no bloqueante en base de datos para reuniones cuyo tiempo programado ya transcurrió
  const expiredMeetingIds = rawTasks
    .filter((t: any) => {
      if (t.type !== "meeting" || t.status === "done" || !t.meeting_start_at) return false;
      const startMs = new Date(t.meeting_start_at).getTime();
      if (isNaN(startMs)) return false;
      const durationMinutes = t.meeting_duration_minutes != null ? Number(t.meeting_duration_minutes) : 30;
      return Date.now() > (startMs + durationMinutes * 60 * 1000);
    })
    .map((t: any) => t.id);

  if (expiredMeetingIds.length > 0) {
    Promise.resolve(
      supabaseAdmin
        .from("task_items")
        .update({ status: "done", progress_percentage: 100, updated_at: new Date().toISOString() })
        .in("id", expiredMeetingIds)
    )
      .then(({ error }: any) => {
        if (error) console.error("Error al auto-cerrar reuniones expiradas en BD:", error);
      })
      .catch((err: any) => {
        console.error("Error en auto-cierre en segundo plano de reuniones:", err);
      });
  }

  return rawTasks.map(normalizeTask);
}

/**
 * Calculate the next sequential ticket code for an organization and project
 * Reads the latest ticket codes matching the workspace key prefix to ensure correct integer sequence
 */
export async function generateNextTicketCode(
  orgId: string,
  projectId?: string | null,
  customPrefix?: string
): Promise<string> {
  let prefix = (customPrefix || "").toUpperCase().trim().replace(/[^A-Z0-9]/g, "");

  if (!prefix && projectId) {
    const { data: projectData } = await supabaseAdmin
      .from("task_projects")
      .select("workspace:task_workspaces!task_projects_workspace_id_fkey(key_prefix)")
      .eq("id", projectId)
      .maybeSingle();

    if ((projectData as any)?.workspace?.key_prefix) {
      prefix = (projectData as any).workspace.key_prefix;
    }
  }

  if (!prefix) {
    prefix = "TK";
  }

  const { data: latestItems } = await supabaseAdmin
    .from("task_items")
    .select("ticket_code")
    .eq("organization_id", orgId)
    .ilike("ticket_code", `${prefix}-%`)
    .order("created_at", { ascending: false })
    .limit(20);

  let maxNum = 100;
  if (latestItems && latestItems.length > 0) {
    for (const item of latestItems) {
      if (!item.ticket_code) continue;
      const match = item.ticket_code.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  return `${prefix}-${maxNum + 1}`;
}

/**
 * Create a new task item
 */
export async function createTask(
  data: Partial<TaskItem> & { organization_id?: string; project_id: string; title: string }
): Promise<{ success: boolean; task?: TaskItem; error?: string }> {
  try {
    const orgId = await resolveOrgId(data.organization_id);

    let ticketCode = data.ticket_code;

    if (!ticketCode) {
      const customPrefix = data.type === "meeting" ? "MTG" : undefined;
      ticketCode = await generateNextTicketCode(orgId, data.project_id, customPrefix);
    }

    const { data: newTask, error } = await supabaseAdmin
      .from("task_items")
      .insert({
        organization_id: orgId,
        project_id: data.project_id,
        ticket_code: ticketCode,
        title: data.title,
        description: data.description || null,
        status: data.status || "todo",
        priority: data.priority || "medium",
        type: data.type || "task",
        progress_percentage: data.progress_percentage ?? 0,
        assigned_staff_id: data.assigned_staff_id || null,
        created_by_staff_id: data.created_by_staff_id || null,
        qa_staff_id: data.qa_staff_id || null,
        due_date: data.due_date || null,
        estimated_hours: data.estimated_hours || 0,
        actual_hours: data.actual_hours || 0,
        checklist: data.checklist || [],
        tags: data.tags || [],
        attachments: data.attachments || [],
        order_index: data.order_index ?? 0,
        sprint_id: data.sprint_id || null,
        blocked_by_task_id: data.blocked_by_task_id || null,
        blocked_reason: data.status === "blocked" ? (data.blocked_reason || null) : null,
        is_recurring: data.is_recurring ?? false,
        recurrence_interval: data.recurrence_interval || null,
        recurrence_day: data.recurrence_day || 1,
        recurrence_days: data.recurrence_days || null,
        parent_recurring_id: data.parent_recurring_id || null,
        next_recurrence_at: data.next_recurrence_at || (data.is_recurring && data.recurrence_interval ? calculateNextRecurrence(data.recurrence_interval, new Date(), data.recurrence_day || 1, data.recurrence_days).toISOString() : null),
        origin_type: data.origin_type || "internal",
        promoted_from_id: data.promoted_from_id || null,
        meeting_modality: data.meeting_modality || (data.type === "meeting" ? "virtual" : null),
        meeting_url: data.meeting_url || null,
        meeting_location: data.meeting_location || null,
        meeting_start_at: data.meeting_start_at || null,
        meeting_duration_minutes: data.meeting_duration_minutes !== undefined && data.meeting_duration_minutes !== null ? Number(data.meeting_duration_minutes) : (data.type === "meeting" ? 30 : null),
        meeting_attendees: Array.isArray(data.meeting_attendees) ? data.meeting_attendees : [],
      })
      .select(`
        *,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(
          id, first_name, last_name, photo_url, role, email
        ),
        qa_staff:organization_staff!task_items_qa_staff_id_fkey(
          id, first_name, last_name, photo_url, role
        ),
        project:task_projects!task_items_project_id_fkey(
          id, name, color
        ),
        blocked_by:blocked_by_task_id(
          id, ticket_code, title, status
        )
      `)
      .single();

    if (error) throw error;

    // Log audit notes for assignments upon creation
    if (data.assigned_staff_id) {
      const { data: mainStaff } = await supabaseAdmin
        .from("organization_staff")
        .select("first_name, last_name")
        .eq("id", data.assigned_staff_id)
        .maybeSingle();
      if (mainStaff) {
        await logTaskAuditComment(
          orgId,
          newTask.id,
          `Asignado a @${mainStaff.first_name} (${mainStaff.first_name} ${mainStaff.last_name})`
        );
      }
    }

    if (data.checklist && Array.isArray(data.checklist)) {
      for (const item of data.checklist) {
        if (item.assigned_staff_id) {
          const { data: assignedStaff } = await supabaseAdmin
            .from("organization_staff")
            .select("first_name, last_name")
            .eq("id", item.assigned_staff_id)
            .maybeSingle();
          if (assignedStaff) {
            const itemTitle = item.title ? `"${item.title}"` : "subtarea";
            await logTaskAuditComment(
              orgId,
              newTask.id,
              `Subtarea ${itemTitle} asignada a @${assignedStaff.first_name} (${assignedStaff.first_name} ${assignedStaff.last_name})`
            );
          }
        }
      }
    }

    revalidatePath("/operations/tasks");
    return { success: true, task: normalizeTask(newTask) };
  } catch (err: any) {
    console.error("Error creating task:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Promote a support ticket to an operational work ticket
 */
export async function promoteSupportTicketToTask(params: {
  supportTicketId: string;
  projectId: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  type?: TaskType;
  assignedStaffId?: string | null;
  sprintId?: string | null;
  dueDate?: string | null;
  estimatedHours?: number;
  promotedByStaffId?: string | null;
  checklist?: TaskChecklistItem[];
  tags?: string[];
  attachments?: TaskAttachment[];
}): Promise<{ success: boolean; task?: TaskItem; error?: string }> {
  try {
    // 1. Fetch support ticket
    const { data: supportTicket, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("*, project:task_projects!task_items_project_id_fkey(name, workspace_id)")
      .eq("id", params.supportTicketId)
      .single();

    if (fetchErr || !supportTicket) {
      throw new Error("No se encontro el ticket de soporte a promover");
    }

    // 2. Create internal work task
    const createRes = await createTask({
      organization_id: supportTicket.organization_id,
      project_id: params.projectId,
      title: params.title?.trim() || supportTicket.title,
      description: params.description !== undefined ? params.description : supportTicket.description,
      priority: params.priority || supportTicket.priority || "medium",
      type: params.type || "task",
      status: "todo",
      assigned_staff_id: params.assignedStaffId || null,
      sprint_id: params.sprintId || null,
      due_date: params.dueDate || null,
      estimated_hours: params.estimatedHours || 0,
      tags: params.tags !== undefined ? params.tags : (supportTicket.tags || []),
      attachments: params.attachments !== undefined ? params.attachments : (supportTicket.attachments || []),
      checklist: params.checklist !== undefined ? params.checklist : (supportTicket.checklist || []),
      origin_type: "internal",
      promoted_from_id: supportTicket.id,
      created_by_staff_id: params.promotedByStaffId || null,
    });

    if (!createRes.success || !createRes.task) {
      throw new Error(createRes.error || "Error al crear ticket de trabajo");
    }

    const newTask = createRes.task;

    // 3. Mark support ticket as in_progress (En Atencion tecnica)
    await supabaseAdmin
      .from("task_items")
      .update({
        status: "in_progress",
        progress_percentage: 20,
        updated_at: new Date().toISOString(),
      })
      .eq("id", supportTicket.id);

    // 4. Log audit comments on both tickets
    await logTaskAuditComment(
      supportTicket.organization_id,
      supportTicket.id,
      `Ticket promovido a tarea de desarrollo #${newTask.ticket_code} (${newTask.title}). En atencion tecnica.`
    );

    await logTaskAuditComment(
      supportTicket.organization_id,
      newTask.id,
      `Tarea originada desde el ticket de soporte #${supportTicket.ticket_code}`
    );

    revalidatePath("/operations/tasks");
    return { success: true, task: newTask };
  } catch (err: any) {
    console.error("Error promoting support ticket:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing task item
 */
export async function updateTask(
  taskId: string,
  data: Partial<TaskItem> & { loggedHours?: number; note?: string }
): Promise<{ success: boolean; task?: TaskItem; unblockedTasks?: TaskItem[]; error?: string }> {
  try {
    const updateData: any = { ...data, updated_at: new Date().toISOString() };
    delete updateData.assigned_staff;
    delete updateData.qa_staff;
    delete updateData.project;
    delete updateData.comments_count;
    delete updateData.blocked_by;
    const loggedHours = updateData.loggedHours ? Number(updateData.loggedHours) : 0;
    const note = updateData.note;
    delete updateData.loggedHours;
    delete updateData.note;

    // Fetch previous state for audit comparison
    const { data: prevTask } = await supabaseAdmin
      .from("task_items")
      .select(`
        status, priority, due_date, assigned_staff_id, created_by_staff_id, blocked_by_task_id, blocked_reason, ticket_code, title, organization_id, checklist, actual_hours,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(id, first_name),
        creator_staff:organization_staff!task_items_created_by_staff_id_fkey(id, first_name)
      `)
      .eq("id", taskId)
      .single();

    // If unblocking status, clear blocked_reason automatically if not explicitly provided
    if (prevTask?.status === "blocked" && updateData.status && updateData.status !== "blocked") {
      if (updateData.blocked_reason === undefined) {
        updateData.blocked_reason = null;
      }
    }

    // Fetch checklist to check if all deliverables are completed
    let checklist = updateData.checklist !== undefined ? parseTaskChecklist(updateData.checklist) : parseTaskChecklist(prevTask?.checklist);
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c: any) => !c.completed);

    // Validate dependency blocking rule: cannot complete or reach 100% if blocker is unfinished
    const effectiveBlockerId = updateData.blocked_by_task_id !== undefined
      ? (updateData.blocked_by_task_id || null)
      : prevTask?.blocked_by_task_id;

    if ((updateData.status === "done" || updateData.status === "in_review" || updateData.progress_percentage === 100) && effectiveBlockerId) {
      const { data: blocker } = await supabaseAdmin
        .from("task_items")
        .select("id, ticket_code, title, status")
        .eq("id", effectiveBlockerId)
        .maybeSingle();

      if (blocker && blocker.status !== "done") {
        const actionLabel = updateData.status === "in_review" ? "enviar a revisión / QA" : "completar";
        return {
          success: false,
          error: `No se puede ${actionLabel} el ticket porque depende de #${blocker.ticket_code} (${blocker.title}), el cual aún está pendiente (${TASK_STATUS_LABELS[blocker.status as TaskStatus] || blocker.status}).`
        };
      }
    }

    if (hasUnfinishedDeliverables) {
      if (updateData.progress_percentage !== undefined && updateData.progress_percentage > 95) {
        updateData.progress_percentage = 95;
      }
      if (updateData.status === "done") {
        updateData.status = "in_review";
        if (updateData.progress_percentage === undefined || updateData.progress_percentage > 95) {
          updateData.progress_percentage = 95;
        }
      }
    } else {
      if (updateData.status === "done") {
        updateData.progress_percentage = 100;
      }
    }

    if (updateData.is_recurring !== undefined) {
      if (updateData.is_recurring) {
        const interval = updateData.recurrence_interval;
        const day = updateData.recurrence_day || 1;
        const days = updateData.recurrence_days;
        if (interval && !updateData.next_recurrence_at) {
          updateData.next_recurrence_at = calculateNextRecurrence(interval, new Date(), day, days).toISOString();
        }
      } else {
        updateData.next_recurrence_at = null;
      }
    } else if (updateData.recurrence_interval || updateData.recurrence_day || updateData.recurrence_days) {
      const { data: currRTask } = await supabaseAdmin
        .from("task_items")
        .select("is_recurring, recurrence_interval, recurrence_day, recurrence_days")
        .eq("id", taskId)
        .single();
      if (currRTask?.is_recurring) {
        const interval = updateData.recurrence_interval || currRTask.recurrence_interval;
        const day = updateData.recurrence_day || currRTask.recurrence_day || 1;
        const days = updateData.recurrence_days !== undefined ? updateData.recurrence_days : currRTask.recurrence_days;
        if (interval) {
          updateData.next_recurrence_at = calculateNextRecurrence(interval, new Date(), day, days).toISOString();
        }
      }
    }

    let updateQuery = supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId);

    if (prevTask?.organization_id) {
      updateQuery = updateQuery.eq("organization_id", prevTask.organization_id);
    }

    const { data: updatedTask, error } = await updateQuery
      .select(`
        *,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(
          id, first_name, last_name, photo_url, role, email
        ),
        qa_staff:organization_staff!task_items_qa_staff_id_fkey(
          id, first_name, last_name, photo_url, role
        ),
        project:task_projects!task_items_project_id_fkey(
          id, name, color
        ),
        blocked_by:blocked_by_task_id(
          id, ticket_code, title, status
        )
      `)
      .single();

    if (error) throw error;

    let unblockedTasks: TaskItem[] = [];

    // Log audit events if fields changed
    if (prevTask) {
      const orgId = prevTask.organization_id;

      // Status change audit and stakeholder notification
      if (updateData.status && updateData.status !== prevTask.status) {
        await notifyStakeholdersOnStatusChange(
          orgId,
          taskId,
          updateData.status,
          prevTask.status as TaskStatus,
          "Gestor de Proyecto",
          undefined,
          updateData.blocked_reason || prevTask.blocked_reason
        );

        if (updateData.status === "done") {
          unblockedTasks = await handleTaskUnblocking(taskId, prevTask.ticket_code, prevTask.title);
        }
      }

      // Priority change audit
      if (updateData.priority && updateData.priority !== prevTask.priority) {
        const oldP = TASK_PRIORITY_LABELS[prevTask.priority as TaskPriority] || prevTask.priority;
        const newP = TASK_PRIORITY_LABELS[updateData.priority as TaskPriority] || updateData.priority;
        await logTaskAuditComment(orgId, taskId, `Prioridad cambiada a ${newP} (anterior: ${oldP})`);
      }

      // Work hours logged audit
      if (loggedHours > 0) {
        const noteStr = note && note.trim() ? ` — "${note.trim()}"` : "";
        await logTaskAuditComment(
          orgId,
          taskId,
          `Registro de trabajo: +${loggedHours}h (Total: ${updateData.actual_hours ?? prevTask.actual_hours ?? 0}h)${noteStr}`
        );
      }

      // Due date audit
      if (updateData.due_date !== undefined && updateData.due_date !== prevTask.due_date) {
        if (updateData.due_date) {
          const dateFormatted = new Date(updateData.due_date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
          await logTaskAuditComment(orgId, taskId, `Fecha límite establecida para el ${dateFormatted}`);
        } else {
          await logTaskAuditComment(orgId, taskId, `Fecha límite eliminada`);
        }
      }

      // Assignment audit
      if (updateData.assigned_staff_id !== undefined && updateData.assigned_staff_id !== prevTask.assigned_staff_id) {
        if (updateData.assigned_staff_id) {
          const { data: staffMember } = await supabaseAdmin
            .from("organization_staff")
            .select("first_name, last_name")
            .eq("id", updateData.assigned_staff_id)
            .single();
          const staffTag = staffMember ? `@${staffMember.first_name}` : "colaborador";
          const staffName = staffMember ? `${staffMember.first_name} ${staffMember.last_name}`.trim() : "colaborador";
          await logTaskAuditComment(orgId, taskId, `Asignado a ${staffTag} (${staffName})`);
        } else {
          await logTaskAuditComment(orgId, taskId, `Asignación de tarea removida`);
        }
      }

      // Blocker dependency audit
      if (updateData.blocked_by_task_id !== undefined && updateData.blocked_by_task_id !== prevTask.blocked_by_task_id) {
        if (updateData.blocked_by_task_id) {
          const { data: blockerTask } = await supabaseAdmin
            .from("task_items")
            .select("ticket_code, title")
            .eq("id", updateData.blocked_by_task_id)
            .single();
          const blkCode = blockerTask ? `#${blockerTask.ticket_code}` : "ticket predecesor";
          const blkTitle = blockerTask?.title ? ` (${blockerTask.title})` : "";
          await logTaskAuditComment(orgId, taskId, `Bloqueado por ${blkCode}${blkTitle}`);
        } else {
          await logTaskAuditComment(orgId, taskId, `Bloqueo removido manualmente`);
        }
      }

      // Blocker reason audit
      if (updateData.blocked_reason !== undefined && updateData.blocked_reason !== prevTask.blocked_reason) {
        if (updateData.blocked_reason && updateData.blocked_reason.trim()) {
          await logTaskAuditComment(orgId, taskId, `Motivo del bloqueo: ${updateData.blocked_reason.trim()}`);
        } else if (prevTask.blocked_reason) {
          await logTaskAuditComment(orgId, taskId, `Motivo del bloqueo removido`);
        }
      }

      // Subtask resolution and assignment audit loop
      if (updateData.checklist && Array.isArray(updateData.checklist)) {
        const prevChecklist = parseTaskChecklist(prevTask.checklist);
        const newChecklist = parseTaskChecklist(updateData.checklist);

        // Resolve stakeholder mention tags
        const assignedFirstName = (prevTask as any)?.assigned_staff?.first_name;
        const creatorFirstName = (prevTask as any)?.creator_staff?.first_name;
        const notifyStaffNames: string[] = [];
        if (assignedFirstName) {
          notifyStaffNames.push(assignedFirstName);
        }
        if (creatorFirstName && creatorFirstName !== assignedFirstName) {
          notifyStaffNames.push(creatorFirstName);
        }

        for (const item of newChecklist) {
          const prevItem = prevChecklist.find((p) => p.id === item.id);
          const itemTitle = item.title ? `"${item.title}"` : "subtarea";

          // 1. Completion / Reactivation detection
          if (prevItem && !prevItem.completed && item.completed) {
            await logTaskAuditComment(
              orgId,
              taskId,
              `Subtarea completada: ${itemTitle}`,
              "Sistema",
              notifyStaffNames
            );
          } else if (prevItem && prevItem.completed && !item.completed) {
            await logTaskAuditComment(
              orgId,
              taskId,
              `Subtarea reactivada: ${itemTitle}`
            );
          }

          // 2. Assignment / Reassignment detection
          if (item.assigned_staff_id) {
            const isNewlyAssigned = !prevItem || prevItem.assigned_staff_id !== item.assigned_staff_id;
            if (isNewlyAssigned) {
              const { data: assignedStaff } = await supabaseAdmin
                .from("organization_staff")
                .select("first_name, last_name")
                .eq("id", item.assigned_staff_id)
                .maybeSingle();

              if (assignedStaff) {
                await logTaskAuditComment(
                  orgId,
                  taskId,
                  `Subtarea ${itemTitle} asignada a @${assignedStaff.first_name} (${assignedStaff.first_name} ${assignedStaff.last_name})`
                );
              }
            }
          }
        }
      }
    }

    revalidatePath("/operations/tasks");
    return { success: true, task: normalizeTask(updatedTask), unblockedTasks };
  } catch (err: any) {
    console.error("Error updating task:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update task status with optional progress
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  progress?: number,
  blockedReason?: string | null,
  loggedHours?: number,
  note?: string
): Promise<{
  success: boolean;
  unblockedTasks?: TaskItem[];
  effectiveStatus?: TaskStatus;
  effectiveProgress?: number;
  downgraded?: boolean;
  downgradeReason?: string;
  error?: string;
}> {
  try {
    const { data: currentTask } = await supabaseAdmin
      .from("task_items")
      .select("progress_percentage, status, checklist, ticket_code, title, organization_id, blocked_by_task_id, blocked_reason, actual_hours, type")
      .eq("id", taskId)
      .single();

    if (currentTask?.type === "meeting") {
      return {
        success: false,
        error: "Las reuniones sincronizadas no forman parte del flujo de etapas técnicas de desarrollo."
      };
    }

    if ((status === "done" || status === "in_review" || progress === 100) && currentTask?.blocked_by_task_id) {
      const { data: blocker } = await supabaseAdmin
        .from("task_items")
        .select("id, ticket_code, title, status")
        .eq("id", currentTask.blocked_by_task_id)
        .maybeSingle();

      if (blocker && blocker.status !== "done") {
        const actionLabel = status === "in_review" ? "enviar a revisión / QA" : "completar";
        return {
          success: false,
          error: `No se puede ${actionLabel} el ticket porque depende de #${blocker.ticket_code} (${blocker.title}), el cual aún está pendiente (${TASK_STATUS_LABELS[blocker.status as TaskStatus] || blocker.status}).`
        };
      }
    }

    const checklist = parseTaskChecklist(currentTask?.checklist);
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c: any) => !c.completed);

    let effectiveStatus = status;
    let effectiveProgress = progress;

    if (effectiveStatus === "done" && hasUnfinishedDeliverables) {
      effectiveStatus = "in_review";
      effectiveProgress = 95;
    }

    const updateData: any = {
      status: effectiveStatus,
      updated_at: new Date().toISOString()
    };

    if (loggedHours !== undefined && loggedHours > 0) {
      const prevActual = Number(currentTask?.actual_hours) || 0;
      updateData.actual_hours = Math.round((prevActual + loggedHours) * 100) / 100;
    }

    if (effectiveStatus === "blocked" && blockedReason !== undefined) {
      updateData.blocked_reason = blockedReason;
    } else if (effectiveStatus !== "blocked" && currentTask?.status === "blocked") {
      updateData.blocked_reason = null;
    }

    if (effectiveProgress !== undefined) {
      updateData.progress_percentage = hasUnfinishedDeliverables && effectiveProgress > 95 ? 95 : effectiveProgress;
    } else if (effectiveStatus === "done") {
      updateData.progress_percentage = 100;
    } else if (effectiveStatus === "todo" || effectiveStatus === "backlog") {
      updateData.progress_percentage = 0;
    } else if (effectiveStatus === "in_review") {
      const currProg = currentTask?.progress_percentage ?? 0;
      updateData.progress_percentage = currProg === 100 || currProg === 0 ? 85 : currProg;
    } else if (effectiveStatus === "in_progress") {
      const currProg = currentTask?.progress_percentage ?? 0;
      updateData.progress_percentage = currProg === 100 ? 50 : currProg === 0 ? 25 : currProg;
    }

    const { error } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId);

    if (error) throw error;

    if (loggedHours !== undefined && loggedHours > 0 && currentTask?.organization_id) {
      const noteStr = note && note.trim() ? ` — "${note.trim()}"` : "";
      await logTaskAuditComment(
        currentTask.organization_id,
        taskId,
        `⏱️ Registro de trabajo: +${loggedHours}h (Total: ${updateData.actual_hours}h)${noteStr}`
      );
    }

    let unblockedTasks: TaskItem[] = [];
    if (currentTask && currentTask.status !== effectiveStatus) {
      await notifyStakeholdersOnStatusChange(
        currentTask.organization_id,
        taskId,
        effectiveStatus as TaskStatus,
        currentTask.status as TaskStatus,
        "Gestor de Proyecto",
        undefined,
        blockedReason
      );

      if (effectiveStatus === "done") {
        unblockedTasks = await handleTaskUnblocking(taskId, currentTask.ticket_code, currentTask.title);
      }
    }

    const downgraded = effectiveStatus !== status;
    const downgradeReason = downgraded
      ? "La tarea tiene entregables pendientes en el checklist y fue movida a revisión (95%)."
      : undefined;

    revalidatePath("/operations/tasks");
    return {
      success: true,
      unblockedTasks,
      effectiveStatus,
      effectiveProgress: updateData.progress_percentage ?? currentTask?.progress_percentage,
      downgraded,
      downgradeReason
    };
  } catch (err: any) {
    console.error("Error updating task status:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update task progress percentage (0 - 100)
 */
export async function updateTaskProgress(
  taskId: string,
  progress: number
): Promise<{
  success: boolean;
  unblockedTasks?: TaskItem[];
  effectiveProgress?: number;
  effectiveStatus?: TaskStatus;
  capped?: boolean;
  capReason?: string;
  error?: string;
}> {
  try {
    const { data: current } = await supabaseAdmin
      .from("task_items")
      .select("status, checklist, ticket_code, title, organization_id, blocked_by_task_id")
      .eq("id", taskId)
      .single();

    let clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

    if (clampedProgress === 100 && current?.blocked_by_task_id) {
      const { data: blocker } = await supabaseAdmin
        .from("task_items")
        .select("id, ticket_code, title, status")
        .eq("id", current.blocked_by_task_id)
        .maybeSingle();

      if (blocker && blocker.status !== "done") {
        return {
          success: false,
          error: `No se puede completar el ticket porque depende de #${blocker.ticket_code} (${blocker.title}), el cual aún está pendiente (${TASK_STATUS_LABELS[blocker.status as TaskStatus] || blocker.status}).`
        };
      }
    }

    const checklist = parseTaskChecklist(current?.checklist);
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c: any) => !c.completed);

    if (hasUnfinishedDeliverables && clampedProgress > 95) {
      clampedProgress = 95;
    }

    const updateData: any = {
      progress_percentage: clampedProgress,
      updated_at: new Date().toISOString()
    };

    if (clampedProgress === 100) {
      updateData.status = "done";
    } else if (clampedProgress > 0 && clampedProgress < 100) {
      // If was todo/backlog, automatically shift to in_progress
      if (current && (current.status === "todo" || current.status === "backlog")) {
        updateData.status = "in_progress";
      }
    }

    const { error } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId);

    if (error) throw error;

    if (updateData.status && current && updateData.status !== current.status) {
      await notifyStakeholdersOnStatusChange(
        current.organization_id,
        taskId,
        updateData.status,
        current.status as TaskStatus,
        "Gestor de Proyecto"
      );
    }

    let unblockedTasks: TaskItem[] = [];
    if (clampedProgress === 100 && current && current.status !== "done") {
      unblockedTasks = await handleTaskUnblocking(taskId, current.ticket_code, current.title);
    }

    const capped = hasUnfinishedDeliverables && clampedProgress === 95 && progress > 95;
    const capReason = capped
      ? "El progreso fue limitado a 95% porque existen entregables pendientes en el checklist."
      : undefined;

    revalidatePath("/operations/tasks");
    return {
      success: true,
      unblockedTasks,
      effectiveProgress: clampedProgress,
      effectiveStatus: updateData.status || current?.status,
      capped,
      capReason
    };
  } catch (err: any) {
    console.error("Error updating task progress:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Toggle a checklist item and recompute progress
 */
export async function toggleChecklistItem(
  taskId: string,
  checklistItemId: string,
  completed: boolean
): Promise<{ success: boolean; checklist?: TaskChecklistItem[]; progress?: number; task?: TaskItem; error?: string }> {
  try {
    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("checklist, progress_percentage, status, organization_id")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) throw fetchErr || new Error("Task not found");

    const checklist: TaskChecklistItem[] = parseTaskChecklist(task.checklist).map((item: TaskChecklistItem) => {
      if (item.id === checklistItemId) {
        return {
          ...item,
          completed,
          completed_at: completed ? new Date().toISOString() : undefined
        };
      }
      return item;
    });

    // Recompute progress based on checklist
    const completedCount = checklist.filter((i) => i.completed).length;
    const progress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : task.progress_percentage;

    const updateData: any = {
      checklist,
      progress_percentage: progress,
      updated_at: new Date().toISOString()
    };

    // Note: Checklist progress updates do not automatically force status to 'done'.
    // Changing the task status to completed must be an intentional user or PM decision.

    const { data: updatedTask, error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId)
      .select(`
        *,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(
          id, first_name, last_name, photo_url, role, email
        ),
        qa_staff:organization_staff!task_items_qa_staff_id_fkey(
          id, first_name, last_name, photo_url, role
        ),
        project:task_projects!task_items_project_id_fkey(
          id, name, color
        ),
        blocked_by:blocked_by_task_id(
          id, ticket_code, title, status
        )
      `)
      .single();

    if (updateErr) throw updateErr;

    // Log audit note for subtask completion
    const toggledItem = checklist.find((i) => i.id === checklistItemId);
    if (toggledItem && task.organization_id) {
      const itemTitle = toggledItem.title ? `"${toggledItem.title}"` : "subtarea";
      const auditMsg = completed
        ? `Subtarea completada: ${itemTitle}`
        : `Subtarea reactivada: ${itemTitle}`;
      await logTaskAuditComment(task.organization_id, taskId, auditMsg);
    }

    revalidatePath("/operations/tasks");
    return { success: true, checklist, progress, task: updatedTask ? normalizeTask(updatedTask) : undefined };
  } catch (err: any) {
    console.error("Error toggling checklist item:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Assign or reassign a specific deliverable / subtask to a collaborator
 */
export async function updateChecklistItemAssignee(
  taskId: string,
  checklistItemId: string,
  assignedStaffId: string | null
): Promise<{ success: boolean; checklist?: TaskChecklistItem[]; error?: string }> {
  try {
    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("checklist, organization_id")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) throw fetchErr || new Error("Task not found");

    const checklist: TaskChecklistItem[] = parseTaskChecklist(task.checklist).map((item: TaskChecklistItem) => {
      if (item.id === checklistItemId) {
        return {
          ...item,
          assigned_staff_id: assignedStaffId || null
        };
      }
      return item;
    });

    const { error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update({
        checklist,
        updated_at: new Date().toISOString()
      })
      .eq("id", taskId);

    if (updateErr) throw updateErr;

    // Log audit note for subtask assignment
    if (assignedStaffId && task.organization_id) {
      const { data: staffMember } = await supabaseAdmin
        .from("organization_staff")
        .select("first_name, last_name")
        .eq("id", assignedStaffId)
        .single();
      const item = checklist.find((i) => i.id === checklistItemId);
      if (staffMember && item) {
        const itemTitle = item.title ? `"${item.title}"` : "subtarea";
        await logTaskAuditComment(
          task.organization_id,
          taskId,
          `Subtarea ${itemTitle} asignada a @${staffMember.first_name} (${staffMember.first_name} ${staffMember.last_name})`
        );
      }
    }

    revalidatePath("/operations/tasks");
    return { success: true, checklist };
  } catch (err: any) {
    console.error("Error updating checklist item assignee:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update estimated or actual hours on a specific checklist deliverable / subtask
 */
export async function updateChecklistItemHours(
  taskId: string,
  checklistItemId: string,
  hours: { estimated_hours?: number | null; actual_hours?: number | null }
): Promise<{ success: boolean; checklist?: TaskChecklistItem[]; task?: TaskItem; error?: string }> {
  try {
    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("checklist, organization_id, estimated_hours, actual_hours")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) throw fetchErr || new Error("Task not found");

    const checklist: TaskChecklistItem[] = parseTaskChecklist(task.checklist).map((item: TaskChecklistItem) => {
      if (item.id === checklistItemId) {
        return {
          ...item,
          ...(hours.estimated_hours !== undefined ? { estimated_hours: hours.estimated_hours } : {}),
          ...(hours.actual_hours !== undefined ? { actual_hours: hours.actual_hours } : {}),
        };
      }
      return item;
    });

    const totalSubEstimated = checklist.reduce((sum, i) => sum + (Number(i.estimated_hours) || 0), 0);
    const totalSubActual = checklist.reduce((sum, i) => sum + (Number(i.actual_hours) || 0), 0);

    const updateData: any = {
      checklist,
      updated_at: new Date().toISOString(),
    };

    if (totalSubEstimated > 0) {
      updateData.estimated_hours = totalSubEstimated;
    }
    if (totalSubActual > 0) {
      updateData.actual_hours = totalSubActual;
    }

    const { data: updatedTask, error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId)
      .select("*")
      .single();

    if (updateErr) throw updateErr;

    revalidatePath("/operations/tasks");
    return { success: true, checklist, task: updatedTask ? normalizeTask(updatedTask) : undefined };
  } catch (err: any) {
    console.error("Error updating checklist item hours:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a task
 */
export async function deleteTask(
  taskId: string,
  orgId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const activeOrgId = await resolveOrgId(orgId);

    const { error } = await supabaseAdmin
      .from("task_items")
      .delete()
      .eq("organization_id", activeOrgId)
      .eq("id", taskId);

    if (error) throw error;
    revalidatePath("/operations/tasks");
    return { success: true };
  } catch (err: any) {
    console.error("Error deleting task:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Bulk delete tasks
 */
export async function deleteTasks(
  taskIds: string[],
  orgId?: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    if (!taskIds || taskIds.length === 0) {
      return { success: true, count: 0 };
    }

    const activeOrgId = await resolveOrgId(orgId);

    // Delete in chunks of 100 to avoid query length limits
    const CHUNK_SIZE = 100;
    let totalDeleted = 0;

    for (let i = 0; i < taskIds.length; i += CHUNK_SIZE) {
      const chunk = taskIds.slice(i, i + CHUNK_SIZE);
      const { error, count } = await supabaseAdmin
        .from("task_items")
        .delete({ count: "exact" })
        .eq("organization_id", activeOrgId)
        .in("id", chunk);

      if (error) throw error;
      totalDeleted += (count ?? chunk.length);
    }

    revalidatePath("/operations/tasks");
    return { success: true, count: totalDeleted };
  } catch (err: any) {
    console.error("Error bulk deleting tasks:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get comments for a task
 */
export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabaseAdmin
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching task comments:", error);
    return [];
  }

  return (data || []) as TaskComment[];
}

/**
 * Add a comment to a task with @mentions support
 */
export async function addTaskComment(data: {
  taskId: string;
  content: string;
  authorType?: "owner" | "staff" | "system";
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  mentions?: string[];
  organizationId?: string;
}): Promise<{ success: boolean; comment?: TaskComment; error?: string }> {
  try {
    // Resolve organization ID from task if not provided
    let orgId = data.organizationId;
    if (!orgId) {
      const { data: task } = await supabaseAdmin
        .from("task_items")
        .select("organization_id")
        .eq("id", data.taskId)
        .single();
      orgId = task?.organization_id;
    }
    if (!orgId) orgId = await resolveOrgId();

    // Extract @mentions from text if not provided
    let mentions = data.mentions || [];
    if (mentions.length === 0) {
      const matched = data.content.matchAll(/@([a-zA-Z0-9_\.\u00C0-\u017F]+)/g);
      mentions = Array.from(matched).map((m) => m[1]);
    }

    let authorName = data.authorName;
    let authorAvatar = data.authorAvatar;
    let authorId = data.authorId;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        authorId = authorId || user.id;
        authorName = authorName || user.user_metadata?.full_name || user.email?.split("@")[0] || "Administrador";
        authorAvatar = authorAvatar || user.user_metadata?.avatar_url || null;
      }
    } catch (_) {}
    authorName = authorName || "Administrador";

    const { data: newComment, error } = await supabaseAdmin
      .from("task_comments")
      .insert({
        organization_id: orgId,
        task_id: data.taskId,
        author_type: data.authorType || "owner",
        author_id: authorId || "admin",
        author_name: authorName,
        author_avatar: authorAvatar || null,
        content: data.content,
        mentions
      })
      .select("*")
      .single();

    if (error) throw error;

    revalidatePath("/operations/tasks");
    return { success: true, comment: newComment as TaskComment };
  } catch (err: any) {
    console.error("Error adding task comment:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch collaborators for the task system
 */
export async function getCollaborators(orgId?: string): Promise<TaskCollaborator[]> {
  const activeOrgId = await resolveOrgId(orgId);

  const { data: staffList, error } = await supabaseAdmin
    .from("organization_staff")
    .select("*")
    .eq("organization_id", activeOrgId)
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching staff for tasks:", error);
    return [];
  }

  // Fetch workspace memberships
  const { data: memberships } = await supabaseAdmin
    .from("task_workspace_members")
    .select("workspace_id, staff_id")
    .eq("organization_id", activeOrgId);

  const staffWorkspaces = new Map<string, string[]>();
  (memberships || []).forEach((m) => {
    const list = staffWorkspaces.get(m.staff_id) || [];
    list.push(m.workspace_id);
    staffWorkspaces.set(m.staff_id, list);
  });

  // Count assigned tasks
  const { data: tasks } = await supabaseAdmin
    .from("task_items")
    .select("assigned_staff_id, status")
    .eq("organization_id", activeOrgId);

  const taskCounts = new Map<string, { total: number; done: number }>();
  (tasks || []).forEach((t) => {
    if (!t.assigned_staff_id) return;
    const current = taskCounts.get(t.assigned_staff_id) || { total: 0, done: 0 };
    current.total += 1;
    if (t.status === "done") current.done += 1;
    taskCounts.set(t.assigned_staff_id, current);
  });

  return (staffList || []).map((s) => {
    const counts = taskCounts.get(s.id) || { total: 0, done: 0 };
    return {
      id: s.id,
      organization_id: s.organization_id,
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      task_role: inferTaskRole(s.role),
      access_token: s.access_token,
      is_active: s.is_active,
      photo_url: s.photo_url,
      portal_url: `/portal/tasks/${s.access_token}`,
      has_global_workspace_access: s.has_global_workspace_access ?? true,
      workspace_ids: staffWorkspaces.get(s.id) || [],
      assigned_tasks_count: counts.total,
      completed_tasks_count: counts.done,
      can_bulk_delete_tasks: s.can_bulk_delete_tasks ?? (inferTaskRole(s.role) === "pm"),
    };
  });
}

/**
 * Upload Collaborator Avatar to Storage
 */
export async function uploadCollaboratorAvatar(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No se ha seleccionado ningún archivo" };

    const orgId = await resolveOrgId();
    const fileExt = file.name.split(".").pop() || "webp";
    const fileName = `collaborators/${orgId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const bucket = "public_assets";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type || "image/webp",
        upsert: true
      });

    if (uploadError) {
      // Fallback to 'branding' bucket
      const { error: bError } = await supabaseAdmin.storage
        .from("branding")
        .upload(fileName, buffer, {
          contentType: file.type || "image/webp",
          upsert: true
        });

      if (bError) {
        console.error("Storage upload failed on both buckets:", bError);
        return { success: false, error: "Error al subir la imagen a almacenamiento" };
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from("branding").getPublicUrl(fileName);
      return { success: true, url: publicUrlData.publicUrl };
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName);
    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: any) {
    console.error("Error uploading collaborator avatar:", err);
    return { success: false, error: err.message || "Error al subir imagen" };
  }
}

/**
 * Upload Task Attachment to Storage
 */
export async function uploadTaskAttachment(
  formData: FormData
): Promise<{ success: boolean; attachment?: TaskAttachment; error?: string }> {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No se ha seleccionado ningún archivo" };

    const orgId = await resolveOrgId();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `tasks/${orgId}/${Date.now()}_${sanitizedName}`;

    const candidateBuckets = ["public-assets", "branding", "catalog", "public_assets"];
    let publicUrl: string | null = null;
    let lastError: any = null;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    for (const bucket of candidateBuckets) {
      try {
        const { error: uploadErr } = await supabaseAdmin.storage
          .from(bucket)
          .upload(filePath, buffer, {
            contentType: file.type || "application/octet-stream",
            upsert: true
          });

        if (!uploadErr) {
          const { data: urlData } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(filePath);
          publicUrl = urlData?.publicUrl || null;
          break;
        } else {
          lastError = uploadErr;
        }
      } catch (bErr) {
        lastError = bErr;
      }
    }

    if (!publicUrl) {
      throw lastError || new Error("Error al guardar archivo en almacenamiento.");
    }

    let attType = "file";
    const mime = file.type || "";
    if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)) {
      attType = "image";
    } else if (mime.includes("pdf") || /\.pdf$/i.test(file.name)) {
      attType = "pdf";
    } else if (mime.includes("sheet") || mime.includes("excel") || /\.(xlsx?|csv)$/i.test(file.name)) {
      attType = "sheet";
    } else if (mime.includes("word") || /\.(docx?|txt|md)$/i.test(file.name)) {
      attType = "doc";
    } else if (/\.(zip|rar|7z|tar\.gz)$/i.test(file.name)) {
      attType = "archive";
    }

    const attachment: TaskAttachment = {
      id: `att-${Date.now()}`,
      name: file.name,
      url: publicUrl,
      size: file.size,
      type: attType,
      created_at: new Date().toISOString(),
    };

    return { success: true, attachment };
  } catch (err: any) {
    console.error("Error uploading task attachment:", err);
    return { success: false, error: err.message || "Error al subir archivo" };
  }
}


/**
 * Create a new collaborator in organization_staff
 */
export async function createCollaborator(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  taskRole?: CollaboratorRole;
  photoUrl?: string | null;
  workspaceIds?: string[];
  hasGlobalWorkspaceAccess?: boolean;
  canBulkDeleteTasks?: boolean;
  orgId?: string;
}): Promise<{ success: boolean; collaborator?: TaskCollaborator; error?: string }> {
  try {
    const activeOrgId = await resolveOrgId(data.orgId);
    const hasGlobal = data.hasGlobalWorkspaceAccess ?? (data.workspaceIds && data.workspaceIds.length > 0 ? false : true);

    const { data: newStaff, error } = await supabaseAdmin
      .from("organization_staff")
      .insert({
        organization_id: activeOrgId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        role: data.role || data.taskRole || "developer",
        task_role: data.taskRole || inferTaskRole(data.role),
        photo_url: data.photoUrl || null,
        has_global_workspace_access: hasGlobal,
        is_active: true,
        can_bulk_delete_tasks: data.canBulkDeleteTasks ?? (data.taskRole === "pm")
      })
      .select("*")
      .single();

    if (error) throw error;

    // Sync workspace memberships
    if (data.workspaceIds && data.workspaceIds.length > 0) {
      const isLead = data.taskRole === 'pm' || (data.role && data.role.toLowerCase().includes('gestor'));
      const membersToInsert = data.workspaceIds.map((wsId) => ({
        organization_id: activeOrgId,
        workspace_id: wsId,
        staff_id: newStaff.id,
        role: isLead ? 'lead' : 'member'
      }));
      await supabaseAdmin.from("task_workspace_members").insert(membersToInsert);
    }

    revalidatePath("/operations/tasks");
    return {
      success: true,
      collaborator: {
        id: newStaff.id,
        organization_id: newStaff.organization_id,
        first_name: newStaff.first_name,
        last_name: newStaff.last_name,
        email: newStaff.email,
        phone: newStaff.phone,
        role: newStaff.role,
        task_role: inferTaskRole(newStaff.role),
        access_token: newStaff.access_token,
        is_active: newStaff.is_active,
        photo_url: newStaff.photo_url,
        portal_url: `/portal/tasks/${newStaff.access_token}`,
        has_global_workspace_access: hasGlobal,
        workspace_ids: data.workspaceIds || [],
        assigned_tasks_count: 0,
        completed_tasks_count: 0,
        can_bulk_delete_tasks: data.canBulkDeleteTasks ?? (data.taskRole === 'pm' || inferTaskRole(newStaff.role) === 'pm')
      }
    };
  } catch (err: any) {
    console.error("Error creating collaborator:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing collaborator in organization_staff
 */
export async function updateCollaborator(data: {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  taskRole?: CollaboratorRole;
  photoUrl?: string | null;
  isActive?: boolean;
  workspaceIds?: string[];
  hasGlobalWorkspaceAccess?: boolean;
  canBulkDeleteTasks?: boolean;
  orgId?: string;
}): Promise<{ success: boolean; collaborator?: TaskCollaborator; error?: string }> {
  try {
    const activeOrgId = await resolveOrgId(data.orgId);

    const updatePayload: Record<string, any> = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      role: data.role || data.taskRole || "developer",
    };

    if (data.taskRole !== undefined) {
      updatePayload.task_role = data.taskRole;
    }

    if (data.photoUrl !== undefined) {
      updatePayload.photo_url = data.photoUrl;
    }
    if (data.isActive !== undefined) {
      updatePayload.is_active = data.isActive;
    }
    if (data.hasGlobalWorkspaceAccess !== undefined) {
      updatePayload.has_global_workspace_access = data.hasGlobalWorkspaceAccess;
    }
    if (data.canBulkDeleteTasks !== undefined) {
      updatePayload.can_bulk_delete_tasks = data.canBulkDeleteTasks;
    }

    const { data: updatedStaff, error } = await supabaseAdmin
      .from("organization_staff")
      .update(updatePayload)
      .eq("id", data.id)
      .eq("organization_id", activeOrgId)
      .select("*")
      .single();

    if (error) throw error;

    // Sync task_workspace_members
    if (data.workspaceIds !== undefined) {
      await supabaseAdmin
        .from("task_workspace_members")
        .delete()
        .eq("staff_id", data.id)
        .eq("organization_id", activeOrgId);

      if (data.workspaceIds.length > 0) {
        const isLead = data.taskRole === 'pm' || (data.role && data.role.toLowerCase().includes('gestor'));
        const membersToInsert = data.workspaceIds.map((wsId) => ({
          organization_id: activeOrgId,
          workspace_id: wsId,
          staff_id: data.id,
          role: isLead ? 'lead' : 'member'
        }));
        await supabaseAdmin.from("task_workspace_members").insert(membersToInsert);
      }
    }

    // Fetch current workspace_ids for the response
    const { data: currentMemberships } = await supabaseAdmin
      .from("task_workspace_members")
      .select("workspace_id")
      .eq("staff_id", data.id)
      .eq("organization_id", activeOrgId);

    const currentWsIds = (currentMemberships || []).map((m) => m.workspace_id);

    revalidatePath("/operations/tasks");
    return {
      success: true,
      collaborator: {
        id: updatedStaff.id,
        organization_id: updatedStaff.organization_id,
        first_name: updatedStaff.first_name,
        last_name: updatedStaff.last_name,
        email: updatedStaff.email,
        phone: updatedStaff.phone,
        role: updatedStaff.role,
        task_role: inferTaskRole(updatedStaff.role),
        access_token: updatedStaff.access_token,
        is_active: updatedStaff.is_active,
        photo_url: updatedStaff.photo_url,
        portal_url: `/portal/tasks/${updatedStaff.access_token}`,
        has_global_workspace_access: updatedStaff.has_global_workspace_access ?? true,
        workspace_ids: currentWsIds,
        assigned_tasks_count: 0,
        completed_tasks_count: 0,
        can_bulk_delete_tasks: data.canBulkDeleteTasks !== undefined ? data.canBulkDeleteTasks : (updatedStaff.can_bulk_delete_tasks ?? (inferTaskRole(updatedStaff.role) === 'pm'))
      }
    };
  } catch (err: any) {
    console.error("Error updating collaborator:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a collaborator and safely handle their assigned tasks, QA assignments and lead roles
 */
export async function deleteCollaborator(params: {
  collaboratorId: string;
  reassignToStaffId?: string | null; // if null, unassign (set to null)
  orgId?: string;
}): Promise<{ success: boolean; reassignedCount?: number; error?: string }> {
  try {
    const activeOrgId = await resolveOrgId(params.orgId);
    const { collaboratorId, reassignToStaffId } = params;

    // 1. Check tasks assigned to this collaborator
    const { data: assignedTasks } = await supabaseAdmin
      .from("task_items")
      .select("id")
      .eq("organization_id", activeOrgId)
      .eq("assigned_staff_id", collaboratorId);

    const taskCount = assignedTasks?.length || 0;

    // 2. Handle assigned tasks: either reassign or unassign
    if (taskCount > 0) {
      const { error: taskUpdateErr } = await supabaseAdmin
        .from("task_items")
        .update({
          assigned_staff_id: reassignToStaffId || null,
          updated_at: new Date().toISOString()
        })
        .eq("organization_id", activeOrgId)
        .eq("assigned_staff_id", collaboratorId);

      if (taskUpdateErr) throw taskUpdateErr;
    }

    // 3. Handle QA reviewer references (if this staff was set as qa_staff_id)
    await supabaseAdmin
      .from("task_items")
      .update({ qa_staff_id: reassignToStaffId || null })
      .eq("organization_id", activeOrgId)
      .eq("qa_staff_id", collaboratorId);

    // 4. Handle project lead references (if this staff was project lead)
    await supabaseAdmin
      .from("task_projects")
      .update({ lead_staff_id: reassignToStaffId || null })
      .eq("organization_id", activeOrgId)
      .eq("lead_staff_id", collaboratorId);

    // 5. Handle workspace lead references (if this staff was workspace lead)
    await supabaseAdmin
      .from("task_workspaces")
      .update({ lead_staff_id: reassignToStaffId || null })
      .eq("organization_id", activeOrgId)
      .eq("lead_staff_id", collaboratorId);

    // 5.b Handle JSONB references in checklist and meeting_attendees (B3)
    const { data: tasksWithJsonb } = await supabaseAdmin
      .from("task_items")
      .select("id, checklist, meeting_attendees")
      .eq("organization_id", activeOrgId);

    if (tasksWithJsonb && tasksWithJsonb.length > 0) {
      for (const t of tasksWithJsonb) {
        let changed = false;
        let newChecklist = t.checklist;
        let newAttendees = t.meeting_attendees;

        if (Array.isArray(newChecklist) && newChecklist.length > 0) {
          const updatedChecklist = newChecklist.map((item: any) => {
            if (item && item.assigned_staff_id === collaboratorId) {
              changed = true;
              return {
                ...item,
                assigned_staff_id: reassignToStaffId || null,
                assigned_staff: null,
              };
            }
            return item;
          });
          if (changed) newChecklist = updatedChecklist;
        }

        if (Array.isArray(newAttendees) && newAttendees.length > 0) {
          const updatedAttendees = newAttendees.map((att: any) => {
            if (att && att.staff_id === collaboratorId) {
              changed = true;
              return {
                ...att,
                staff_id: reassignToStaffId || null,
              };
            }
            return att;
          });
          if (changed) newAttendees = updatedAttendees;
        }

        if (changed) {
          await supabaseAdmin
            .from("task_items")
            .update({
              checklist: newChecklist,
              meeting_attendees: newAttendees,
              updated_at: new Date().toISOString(),
            })
            .eq("id", t.id)
            .eq("organization_id", activeOrgId);
        }
      }
    }

    // 6. Delete the collaborator from organization_staff
    const { error: deleteErr } = await supabaseAdmin
      .from("organization_staff")
      .delete()
      .eq("id", collaboratorId)
      .eq("organization_id", activeOrgId);

    if (deleteErr) throw deleteErr;

    revalidatePath("/operations/tasks");
    return { success: true, reassignedCount: taskCount };
  } catch (err: any) {
    console.error("Error deleting collaborator:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get aggregated metrics for projects and tasks
 */
export async function getTaskMetrics(orgId?: string, projectId?: string, workspaceId?: string): Promise<TaskMetrics> {
  const activeOrgId = await resolveOrgId(orgId);

  let query = supabaseAdmin
    .from("task_items")
    .select(`
      id, status, priority, estimated_hours, actual_hours, assigned_staff_id,
      assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(
        id, first_name, last_name, photo_url, role
      )
    `)
    .eq("organization_id", activeOrgId);

  if (projectId && projectId !== "all") {
    query = query.eq("project_id", projectId);
  } else if (workspaceId && workspaceId !== "all") {
    const { data: wsProjects } = await supabaseAdmin
      .from("task_projects")
      .select("id")
      .eq("workspace_id", workspaceId);

    const projectIds = (wsProjects || []).map((p) => p.id);
    if (projectIds.length > 0) {
      query = query.in("project_id", projectIds);
    } else {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        inReviewTasks: 0,
        blockedTasks: 0,
        todoTasks: 0,
        completionRate: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0,
        tasksByPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
        collaboratorWorkload: []
      };
    }
  }

  const { data: tasks, error } = await query;
  if (error || !tasks) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      inReviewTasks: 0,
      blockedTasks: 0,
      todoTasks: 0,
      completionRate: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0,
      tasksByPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
      collaboratorWorkload: []
    };
  }

  const total = tasks.length;
  let done = 0;
  let inProgress = 0;
  let inReview = 0;
  let blocked = 0;
  let todo = 0;
  let estHours = 0;
  let actHours = 0;

  const priorities = { urgent: 0, high: 0, medium: 0, low: 0 };
  const workloadMap = new Map<
    string,
    { staffId: string; name: string; avatar?: string | null; role: string; totalTasks: number; completedTasks: number; inProgressTasks: number; hours: number }
  >();

  tasks.forEach((t: any) => {
    if (t.status === "done") done++;
    else if (t.status === "in_progress") inProgress++;
    else if (t.status === "in_review") inReview++;
    else if (t.status === "blocked") blocked++;
    else todo++;

    estHours += Number(t.estimated_hours || 0);
    actHours += Number(t.actual_hours || 0);

    const prio = t.priority as keyof typeof priorities;
    if (priorities[prio] !== undefined) priorities[prio]++;

    if (t.assigned_staff) {
      const staff = t.assigned_staff;
      const current = workloadMap.get(staff.id) || {
        staffId: staff.id,
        name: `${staff.first_name} ${staff.last_name}`.trim(),
        avatar: staff.photo_url,
        role: staff.role || "Colaborador",
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        hours: 0
      };
      current.totalTasks++;
      if (t.status === "done") current.completedTasks++;
      if (t.status === "in_progress") current.inProgressTasks++;
      current.hours += Number(t.actual_hours || t.estimated_hours || 0);
      workloadMap.set(staff.id, current);
    }
  });

  return {
    totalTasks: total,
    completedTasks: done,
    inProgressTasks: inProgress,
    inReviewTasks: inReview,
    blockedTasks: blocked,
    todoTasks: todo,
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    totalEstimatedHours: Math.round(estHours * 10) / 10,
    totalActualHours: Math.round(actHours * 10) / 10,
    tasksByPriority: priorities,
    collaboratorWorkload: Array.from(workloadMap.values()).sort((a, b) => b.totalTasks - a.totalTasks)
  };
}

/**
 * Save or override a weekly pacing progress snapshot for a specific week (1, 2, 3, or 4)
 */
export async function saveTaskWeeklySnapshot(
  taskId: string,
  week: 1 | 2 | 3 | 4,
  progress: number
): Promise<{ success: boolean; weekly_snapshots?: any; error?: string }> {
  try {
    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("id, weekly_snapshots")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) throw fetchErr || new Error("Tarea no encontrada");

    const currentSnapshots = task.weekly_snapshots && typeof task.weekly_snapshots === "object"
      ? task.weekly_snapshots
      : {};

    const weekKey = `s${week}`;
    const nextSnapshots = {
      ...currentSnapshots,
      [weekKey]: Math.max(0, Math.min(100, Math.round(progress))),
    };

    const { error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update({
        weekly_snapshots: nextSnapshots,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (updateErr) throw updateErr;

    revalidatePath("/operations/tasks");
    return { success: true, weekly_snapshots: nextSnapshots };
  } catch (err: any) {
    console.error("Error saving task weekly snapshot:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Register meeting attendance for a collaborator with automated time release.
 * Validates check-in window (opens 15m before start, closes 15m after duration).
 * PM / Admin can override window restrictions.
 */
export async function registerMeetingAttendance(params: {
  taskId: string;
  staffId: string;
  method?: TaskMeetingCheckinMethod;
  isPmOverride?: boolean;
  token?: string;
}): Promise<{ success: boolean; task?: TaskItem; error?: string }> {
  try {
    const { taskId, staffId, method = "manual_checkin", isPmOverride = false, token } = params;

    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("*, assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(id, first_name, last_name)")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) {
      return { success: false, error: "Actividad o reunión no encontrada" };
    }

    if (task.type !== "meeting") {
      return { success: false, error: "Esta acción solo es aplicable a tareas de tipo reunión" };
    }

    // Authenticate caller (Portal token or Platform session)
    if (token) {
      const { data: callerStaff } = await supabaseAdmin
        .from("organization_staff")
        .select("id, role, task_role, organization_id")
        .eq("access_token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (!callerStaff || callerStaff.organization_id !== task.organization_id) {
        return { success: false, error: "Acceso no autorizado o token inválido" };
      }

      const isCallerPm = isStaffLeadOrPmRole(callerStaff.role, callerStaff.task_role);
      if (isPmOverride && !isCallerPm) {
        return { success: false, error: "Solo un Gestor de Proyecto puede certificar asistencia fuera de ventana" };
      }
      if (!isCallerPm && callerStaff.id !== staffId) {
        return { success: false, error: "Solo puedes registrar tu propia asistencia" };
      }
    } else {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "No autorizado. Inicie sesión en la plataforma" };
      }

      const { data: member } = await supabase
        .from("organization_members")
        .select("role, organization_id")
        .eq("organization_id", task.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

      const { isSuperAdmin } = await import("@/modules/core/iam/services/platform-roles");
      if (!member && !(await isSuperAdmin(user.id))) {
        return { success: false, error: "No tienes acceso a esta organización" };
      }
    }

    // Validate attendance window:
    // Self-checkin before the window opens (-5m) is strictly blocked for everyone
    // to prevent premature crediting of hours before the meeting actually begins.
    const windowCheck = getMeetingAttendanceWindowStatus(
      task.meeting_start_at,
      task.meeting_duration_minutes || 30
    );

    if (windowCheck.isBefore) {
      return { success: false, error: windowCheck.message };
    }

    // If window is closed (after meeting end + 15m grace), only PM override can certify presence
    if (windowCheck.isAfter && !isPmOverride) {
      return { success: false, error: windowCheck.message };
    }

    // Retrieve staff info for audit comment
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, first_name, last_name, role")
      .eq("id", staffId)
      .maybeSingle();

    const staffName = staff ? `${staff.first_name} ${staff.last_name}` : "Colaborador";
    const durationHours = task.meeting_duration_minutes ? Number(task.meeting_duration_minutes) / 60 : 0.5;

    // Clone or initialize attendees list
    const currentAttendees: TaskMeetingAttendee[] = Array.isArray(task.meeting_attendees)
      ? [...task.meeting_attendees]
      : [];

    const existingIndex = currentAttendees.findIndex((a) => a.staff_id === staffId);
    const nowIso = new Date().toISOString();

    if (existingIndex >= 0) {
      // If already attended, do not duplicate
      if (currentAttendees[existingIndex].status === "attended") {
        return {
          success: true,
          task: normalizeTask(task),
        };
      }
      currentAttendees[existingIndex] = {
        ...currentAttendees[existingIndex],
        status: "attended",
        attended_at: nowIso,
        check_in_method: method,
        hours_allocated: durationHours,
      };
    } else {
      currentAttendees.push({
        staff_id: staffId,
        status: "attended",
        attended_at: nowIso,
        check_in_method: method,
        hours_allocated: durationHours,
        notes: null,
      });
    }

    // Recalculate total meeting actual_hours (sum of attended participants)
    const totalActualHours = currentAttendees
      .filter((a) => a.status === "attended")
      .reduce((sum, a) => sum + (Number(a.hours_allocated) || durationHours), 0);

    const { data: updatedTask, error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update({
        meeting_attendees: currentAttendees,
        actual_hours: totalActualHours,
        updated_at: nowIso,
      })
      .eq("id", taskId)
      .select(`
        *,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(
          id, first_name, last_name, photo_url, role, email
        ),
        qa_staff:organization_staff!task_items_qa_staff_id_fkey(
          id, first_name, last_name, photo_url, role
        ),
        project:task_projects!task_items_project_id_fkey(
          id, name, color
        ),
        blocked_by:blocked_by_task_id(
          id, ticket_code, title, status
        )
      `)
      .single();

    if (updateErr) throw updateErr;

    const methodLabel = method === "link_click" ? "enlace virtual" : isPmOverride ? "verificación PM" : "check-in directo";
    await logTaskAuditComment(
      task.organization_id,
      taskId,
      `Asistencia confirmada para @${staff?.first_name || staffName} (${durationHours}h acreditadas vía ${methodLabel})`
    );

    revalidatePath("/operations/tasks");
    return { success: true, task: normalizeTask(updatedTask) };
  } catch (err: any) {
    console.error("Error registering meeting attendance:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Roll-call update for PMs to modify any attendee status ('attended', 'excused', 'absent', 'pending')
 */
export async function updateMeetingAttendeeStatus(params: {
  taskId: string;
  staffId: string;
  status: TaskMeetingAttendanceStatus;
  notes?: string;
  token?: string;
}): Promise<{ success: boolean; task?: TaskItem; error?: string }> {
  try {
    const { taskId, staffId, status, notes, token } = params;

    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("*, assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(id, first_name, last_name)")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) {
      return { success: false, error: "Actividad o reunión no encontrada" };
    }

    if (task.type !== "meeting") {
      return { success: false, error: "Esta acción solo es aplicable a tareas de tipo reunión" };
    }

    // Authenticate caller: PM/Lead role required to alter roll-call
    if (token) {
      const { data: callerStaff } = await supabaseAdmin
        .from("organization_staff")
        .select("id, role, task_role, organization_id")
        .eq("access_token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (!callerStaff || callerStaff.organization_id !== task.organization_id) {
        return { success: false, error: "Acceso no autorizado o token inválido" };
      }

      const isCallerPm = isStaffLeadOrPmRole(callerStaff.role, callerStaff.task_role);
      if (!isCallerPm) {
        return { success: false, error: "Solo un Gestor de Proyecto puede modificar el pase de lista" };
      }
    } else {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "No autorizado. Inicie sesión en la plataforma" };
      }

      const { data: member } = await supabase
        .from("organization_members")
        .select("role, organization_id")
        .eq("organization_id", task.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

      const { isSuperAdmin } = await import("@/modules/core/iam/services/platform-roles");
      if (!member && !(await isSuperAdmin(user.id))) {
        return { success: false, error: "No tienes acceso a esta organización" };
      }
    }

    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, first_name, last_name")
      .eq("id", staffId)
      .maybeSingle();

    const durationHours = task.meeting_duration_minutes ? Number(task.meeting_duration_minutes) / 60 : 0.5;
    const currentAttendees: TaskMeetingAttendee[] = Array.isArray(task.meeting_attendees)
      ? [...task.meeting_attendees]
      : [];

    const existingIndex = currentAttendees.findIndex((a) => a.staff_id === staffId);
    const nowIso = new Date().toISOString();

    if (existingIndex >= 0) {
      currentAttendees[existingIndex] = {
        ...currentAttendees[existingIndex],
        status,
        attended_at: status === "attended" ? (currentAttendees[existingIndex].attended_at || nowIso) : null,
        check_in_method: status === "attended" ? "pm_verified" : currentAttendees[existingIndex].check_in_method,
        hours_allocated: status === "attended" ? durationHours : 0,
        notes: notes !== undefined ? notes : currentAttendees[existingIndex].notes,
      };
    } else {
      currentAttendees.push({
        staff_id: staffId,
        status,
        attended_at: status === "attended" ? nowIso : null,
        check_in_method: status === "attended" ? "pm_verified" : null,
        hours_allocated: status === "attended" ? durationHours : 0,
        notes: notes || null,
      });
    }

    const totalActualHours = currentAttendees
      .filter((a) => a.status === "attended")
      .reduce((sum, a) => sum + (Number(a.hours_allocated) || durationHours), 0);

    const { data: updatedTask, error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update({
        meeting_attendees: currentAttendees,
        actual_hours: totalActualHours,
        updated_at: nowIso,
      })
      .eq("id", taskId)
      .select(`
        *,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(
          id, first_name, last_name, photo_url, role, email
        ),
        qa_staff:organization_staff!task_items_qa_staff_id_fkey(
          id, first_name, last_name, photo_url, role
        ),
        project:task_projects!task_items_project_id_fkey(
          id, name, color
        ),
        blocked_by:blocked_by_task_id(
          id, ticket_code, title, status
        )
      `)
      .single();

    if (updateErr) throw updateErr;

    const statusLabels: Record<TaskMeetingAttendanceStatus, string> = {
      attended: `Presente (${durationHours}h acreditadas)`,
      excused: "Justificado (ausencia justificada)",
      absent: "Ausente",
      pending: "Pendiente",
    };

    await logTaskAuditComment(
      task.organization_id,
      taskId,
      `Pase de lista: @${staff?.first_name || "Colaborador"} marcado como ${statusLabels[status]}`
    );

    revalidatePath("/operations/tasks");
    return { success: true, task: normalizeTask(updatedTask) };
  } catch (err: any) {
    console.error("Error updating meeting attendee status:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Conclude / finalize a meeting session.
 * Marks task status as 'done', sets progress to 100%, consolidates attendance, and logs audit comment.
 */
export async function completeMeetingSession(params: {
  taskId: string;
  concludedByStaffId?: string;
  token?: string;
}): Promise<{ success: boolean; task?: TaskItem; error?: string }> {
  try {
    const { taskId, concludedByStaffId, token } = params;

    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("*, assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(id, first_name, last_name)")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) {
      return { success: false, error: "Actividad o reunión no encontrada" };
    }

    if (token) {
      const { data: callerStaff } = await supabaseAdmin
        .from("organization_staff")
        .select("id, role, task_role, organization_id")
        .eq("access_token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (!callerStaff || callerStaff.organization_id !== task.organization_id) {
        return { success: false, error: "Acceso no autorizado o token inválido" };
      }

      const isCallerPm = isStaffLeadOrPmRole(callerStaff.role, callerStaff.task_role);
      if (!isCallerPm) {
        return { success: false, error: "Solo un Gestor de Proyecto puede concluir formalmente la sesión" };
      }
    } else {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "No autorizado. Inicie sesión en la plataforma" };
      }

      const { data: member } = await supabase
        .from("organization_members")
        .select("role, organization_id")
        .eq("organization_id", task.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

      const { isSuperAdmin } = await import("@/modules/core/iam/services/platform-roles");
      if (!member && !(await isSuperAdmin(user.id))) {
        return { success: false, error: "No tienes acceso a esta organización" };
      }
    }

    let authorName = "Gestor de Proyecto";
    if (concludedByStaffId) {
      const { data: staff } = await supabaseAdmin
        .from("organization_staff")
        .select("first_name, last_name")
        .eq("id", concludedByStaffId)
        .maybeSingle();
      if (staff) {
        authorName = `${staff.first_name} ${staff.last_name}`;
      }
    }

    const nowIso = new Date().toISOString();
    const { data: updatedTask, error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update({
        status: "done",
        progress_percentage: 100,
        updated_at: nowIso,
      })
      .eq("id", taskId)
      .select(`
        *,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(
          id, first_name, last_name, photo_url, role, email
        ),
        qa_staff:organization_staff!task_items_qa_staff_id_fkey(
          id, first_name, last_name, photo_url, role
        ),
        project:task_projects!task_items_project_id_fkey(
          id, name, color
        ),
        blocked_by:blocked_by_task_id(
          id, ticket_code, title, status
        )
      `)
      .single();

    if (updateErr) throw updateErr;

    await logTaskAuditComment(
      task.organization_id,
      taskId,
      `Sesión concluida por @${authorName}. Ticket marcado como completado.`
    );

    revalidatePath("/operations/tasks");
    return { success: true, task: normalizeTask(updatedTask) };
  } catch (err: any) {
    console.error("Error completing meeting session:", err);
    return { success: false, error: err.message };
  }
}



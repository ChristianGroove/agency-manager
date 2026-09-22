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
  CollaboratorRole,
  TaskChecklistItem,
  TaskAttachment
} from "../types";
import {
  normalizeTask,
  parseTaskChecklist,
  inferTaskRole,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS
} from "../types";
import { calculateNextRecurrence } from "../utils/recurrence-utils";

/**
 * Helper to get current organization ID safely
 */
async function resolveOrgId(providedOrgId?: string): Promise<string> {
  if (providedOrgId) return providedOrgId;
  const orgId = await getCurrentOrganizationId();
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
        `🔓 Desbloqueo: El ticket predecesor #${ticketCode} (${title}) fue completado. Tarea lista para avanzar.${mentionTag}`
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

    let icon = "🔄";
    let actionDesc = `Estado actualizado a "${newLabel}" (anterior: "${oldLabel}")`;

    if (newStatus === "in_review") {
      icon = "🔍";
      actionDesc = `Requerimiento enviado a Revisión / QA por ${authorName}`;
    } else if (newStatus === "done") {
      icon = "✅";
      actionDesc = `Tarea completada exitosamente por ${authorName}`;
    } else if (newStatus === "blocked") {
      icon = "🚫";
      const reasonText = blockedReason && blockedReason.trim() ? `: "${blockedReason.trim()}"` : "";
      actionDesc = `Tarea bloqueada${reasonText}`;
    } else if (newStatus === "in_progress" && prevStatus === "blocked") {
      icon = "🔓";
      actionDesc = `Tarea desbloqueada y en progreso`;
    }

    const auditContent = `${icon} ${actionDesc}`;
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
export async function getWorkspaces(orgId?: string): Promise<TaskWorkspace[]> {
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

  const { data: tasks } = await supabaseAdmin
    .from("task_items")
    .select("project_id")
    .eq("organization_id", activeOrgId);

  const projectWorkspaceMap = new Map<string, string>();
  const workspaceProjectCount = new Map<string, number>();
  (projects || []).forEach((p) => {
    if (p.workspace_id) {
      projectWorkspaceMap.set(p.id, p.workspace_id);
      workspaceProjectCount.set(p.workspace_id, (workspaceProjectCount.get(p.workspace_id) || 0) + 1);
    }
  });

  const workspaceTaskCount = new Map<string, number>();
  (tasks || []).forEach((t) => {
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
  data: Partial<TaskWorkspace>
): Promise<{ success: boolean; workspace?: TaskWorkspace; error?: string }> {
  try {
    const updateData: any = { ...data, updated_at: new Date().toISOString() };
    delete updateData.lead_staff;
    delete updateData.project_count;
    delete updateData.task_count;

    const { data: updated, error } = await supabaseAdmin
      .from("task_workspaces")
      .update(updateData)
      .eq("id", workspaceId)
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
export async function deleteWorkspace(workspaceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("task_workspaces")
      .delete()
      .eq("id", workspaceId);

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
export async function getProjects(orgId?: string, workspaceId?: string): Promise<TaskProject[]> {
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
  const { data: taskCounts } = await supabaseAdmin
    .from("task_items")
    .select("project_id, status")
    .eq("organization_id", activeOrgId);

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
  data: Partial<TaskProject>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { ...data, updated_at: new Date().toISOString() };
    delete updateData.lead_staff;
    delete updateData.task_count;
    delete updateData.completed_count;
    delete updateData.progress_percentage;

    const { error } = await supabaseAdmin
      .from("task_projects")
      .update(updateData)
      .eq("id", projectId);

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
export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("task_projects")
      .delete()
      .eq("id", projectId);

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
  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  return (data || []).map(normalizeTask);
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
      // Determine prefix based on project's workspace if available
      let prefix = "TK";
      const { data: projectData } = await supabaseAdmin
        .from("task_projects")
        .select("workspace:task_workspaces!task_projects_workspace_id_fkey(key_prefix)")
        .eq("id", data.project_id)
        .single();

      if ((projectData as any)?.workspace?.key_prefix) {
        prefix = (projectData as any).workspace.key_prefix;
      }

      // Calculate sequential ticket code based on existing items with this prefix
      const { data: latest } = await supabaseAdmin
        .from("task_items")
        .select("ticket_code")
        .eq("organization_id", orgId)
        .ilike("ticket_code", `${prefix}-%`)
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNum = 101;
      if (latest && latest.length > 0 && latest[0].ticket_code) {
        const match = latest[0].ticket_code.match(/(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      ticketCode = `${prefix}-${nextNum}`;
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
        blocked_by_task_id: data.blocked_by_task_id || null,
        is_recurring: data.is_recurring ?? false,
        recurrence_interval: data.recurrence_interval || null,
        recurrence_day: data.recurrence_day || 1,
        parent_recurring_id: data.parent_recurring_id || null,
        next_recurrence_at: data.next_recurrence_at || (data.is_recurring && data.recurrence_interval ? calculateNextRecurrence(data.recurrence_interval, new Date(), data.recurrence_day || 1).toISOString() : null)
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
          `👤 Asignado a @${mainStaff.first_name} (${mainStaff.first_name} ${mainStaff.last_name})`
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
              `👤 Subtarea ${itemTitle} asignada a @${assignedStaff.first_name} (${assignedStaff.first_name} ${assignedStaff.last_name})`
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
        if (interval && !updateData.next_recurrence_at) {
          updateData.next_recurrence_at = calculateNextRecurrence(interval, new Date(), day).toISOString();
        }
      } else {
        updateData.next_recurrence_at = null;
      }
    } else if (updateData.recurrence_interval || updateData.recurrence_day) {
      const { data: currRTask } = await supabaseAdmin
        .from("task_items")
        .select("is_recurring, recurrence_interval, recurrence_day")
        .eq("id", taskId)
        .single();
      if (currRTask?.is_recurring) {
        const interval = updateData.recurrence_interval || currRTask.recurrence_interval;
        const day = updateData.recurrence_day || currRTask.recurrence_day || 1;
        if (interval) {
          updateData.next_recurrence_at = calculateNextRecurrence(interval, new Date(), day).toISOString();
        }
      }
    }

    const { data: updatedTask, error } = await supabaseAdmin
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
        await logTaskAuditComment(orgId, taskId, `⚡ Prioridad cambiada a ${newP} (anterior: ${oldP})`);
      }

      // Work hours logged audit
      if (loggedHours > 0) {
        const noteStr = note && note.trim() ? ` — "${note.trim()}"` : "";
        await logTaskAuditComment(
          orgId,
          taskId,
          `⏱️ Registro de trabajo: +${loggedHours}h (Total: ${updateData.actual_hours ?? prevTask.actual_hours ?? 0}h)${noteStr}`
        );
      }

      // Due date audit
      if (updateData.due_date !== undefined && updateData.due_date !== prevTask.due_date) {
        if (updateData.due_date) {
          const dateFormatted = new Date(updateData.due_date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
          await logTaskAuditComment(orgId, taskId, `📅 Fecha límite establecida para el ${dateFormatted}`);
        } else {
          await logTaskAuditComment(orgId, taskId, `📅 Fecha límite eliminada`);
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
          await logTaskAuditComment(orgId, taskId, `👤 Asignado a ${staffTag} (${staffName})`);
        } else {
          await logTaskAuditComment(orgId, taskId, `👤 Asignación de tarea removida`);
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
          await logTaskAuditComment(orgId, taskId, `🚫 Bloqueado por ${blkCode}${blkTitle}`);
        } else {
          await logTaskAuditComment(orgId, taskId, `🔓 Bloqueo removido manualmente`);
        }
      }

      // Blocker reason audit
      if (updateData.blocked_reason !== undefined && updateData.blocked_reason !== prevTask.blocked_reason) {
        if (updateData.blocked_reason && updateData.blocked_reason.trim()) {
          await logTaskAuditComment(orgId, taskId, `🚫 Motivo del bloqueo: ${updateData.blocked_reason.trim()}`);
        } else if (prevTask.blocked_reason) {
          await logTaskAuditComment(orgId, taskId, `🔓 Motivo del bloqueo removido`);
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
              `☑️ Subtarea completada: ${itemTitle}`,
              "Sistema",
              notifyStaffNames
            );
          } else if (prevItem && prevItem.completed && !item.completed) {
            await logTaskAuditComment(
              orgId,
              taskId,
              `⬜ Subtarea reactivada: ${itemTitle}`
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
                  `👤 Subtarea ${itemTitle} asignada a @${assignedStaff.first_name} (${assignedStaff.first_name} ${assignedStaff.last_name})`
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
): Promise<{ success: boolean; unblockedTasks?: TaskItem[]; error?: string }> {
  try {
    const { data: currentTask } = await supabaseAdmin
      .from("task_items")
      .select("progress_percentage, status, checklist, ticket_code, title, organization_id, blocked_by_task_id, blocked_reason, actual_hours")
      .eq("id", taskId)
      .single();

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

    revalidatePath("/operations/tasks");
    return { success: true, unblockedTasks };
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
): Promise<{ success: boolean; unblockedTasks?: TaskItem[]; error?: string }> {
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

    revalidatePath("/operations/tasks");
    return { success: true, unblockedTasks };
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
        ? `☑️ Subtarea completada: ${itemTitle}`
        : `⬜ Subtarea reactivada: ${itemTitle}`;
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
          `👤 Subtarea ${itemTitle} asignada a @${staffMember.first_name} (${staffMember.first_name} ${staffMember.last_name})`
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
export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("task_items")
      .delete()
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
      const matched = data.content.match(/@(\w+)/g);
      if (matched) {
        mentions = matched.map((m) => m.substring(1));
      }
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

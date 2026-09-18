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
  CollaboratorRole,
  TaskChecklistItem,
  TaskAttachment
} from "../types";
import { normalizeTask, parseTaskChecklist, inferTaskRole } from "../types";
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
        )
      `)
      .single();

    if (error) throw error;

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
  data: Partial<TaskItem>
): Promise<{ success: boolean; task?: TaskItem; error?: string }> {
  try {
    const updateData: any = { ...data, updated_at: new Date().toISOString() };
    delete updateData.assigned_staff;
    delete updateData.qa_staff;
    delete updateData.project;
    delete updateData.comments_count;

    // Fetch checklist to check if all deliverables are completed
    let checklist = updateData.checklist !== undefined ? parseTaskChecklist(updateData.checklist) : null;
    if (!checklist) {
      const { data: currTask } = await supabaseAdmin
        .from("task_items")
        .select("checklist")
        .eq("id", taskId)
        .single();
      checklist = parseTaskChecklist(currTask?.checklist);
    }
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c: any) => !c.completed);

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
        )
      `)
      .single();

    if (error) throw error;

    revalidatePath("/operations/tasks");
    return { success: true, task: normalizeTask(updatedTask) };
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
  progress?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: currentTask } = await supabaseAdmin
      .from("task_items")
      .select("progress_percentage, status, checklist")
      .eq("id", taskId)
      .single();

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
    revalidatePath("/operations/tasks");
    return { success: true };
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
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: current } = await supabaseAdmin
      .from("task_items")
      .select("status, checklist")
      .eq("id", taskId)
      .single();

    const checklist = parseTaskChecklist(current?.checklist);
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c: any) => !c.completed);

    let clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
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
    revalidatePath("/operations/tasks");
    return { success: true };
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
): Promise<{ success: boolean; checklist?: TaskChecklistItem[]; progress?: number; error?: string }> {
  try {
    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("checklist, progress_percentage, status")
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

    const { error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId);

    if (updateErr) throw updateErr;

    revalidatePath("/operations/tasks");
    return { success: true, checklist, progress };
  } catch (err: any) {
    console.error("Error toggling checklist item:", err);
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
      completed_tasks_count: counts.done
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
        is_active: true
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
        completed_tasks_count: 0
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
        completed_tasks_count: 0
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

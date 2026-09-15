"use server"

import { supabaseAdmin } from "@/modules/core/database/supabase-admin";
import type { TaskItem, TaskProject, TaskStatus, TaskPriority, TaskType, TaskAttachment, TaskComment, TaskChecklistItem } from "../types";
import { normalizeTask, parseTaskChecklist } from "../types";

export interface CollaboratorPortalData {
  staff: {
    id: string;
    organization_id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    role: string;
    photo_url?: string | null;
    access_token: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    logo_dark_url?: string | null;
    logo_light_url?: string | null;
    isotipo_url?: string | null;
    primary_color: string;
    secondary_color: string;
  };
  projects: TaskProject[];
  tasks: TaskItem[];
  allTeamTasks?: TaskItem[]; // For PMs or QA Leads
  teamMembers?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    role: string;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    inReviewTasks: number;
    hours?: number;
    completionPercentage: number;
  }[];
  recentMentions?: {
    id: string;
    task_id: string;
    ticket_code: string;
    task_title: string;
    author_name: string;
    author_avatar?: string | null;
    content: string;
    created_at: string;
  }[];
  isLeadOrPm: boolean;
  isQa: boolean;
  metrics: {
    totalAssigned: number;
    completed: number;
    inProgress: number;
    inReview: number;
    completionPercentage: number;
  };
}

/**
 * Validate token and return full collaborator portal session data
 */
export async function getCollaboratorPortalData(token: string): Promise<CollaboratorPortalData | null> {
  if (!token) return null;

  // 1. Verify staff by token
  const { data: staff, error: staffErr } = await supabaseAdmin
    .from("organization_staff")
    .select("*")
    .eq("access_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (staffErr || !staff) {
    console.error("Collaborator token validation failed:", staffErr);
    return null;
  }

  // 2. Resolve organization & branding
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("id, name, slug, logo_url")
    .eq("id", staff.organization_id)
    .single();

  const { data: settings } = await supabaseAdmin
    .from("organization_settings")
    .select("agency_name, portal_logo_url, main_logo_light_url, main_logo_url, isotipo_url, portal_primary_color, portal_secondary_color")
    .eq("organization_id", staff.organization_id)
    .maybeSingle();

  // Detect platform defaults to avoid leaking Pixy logo to white-labeled tenants
  const isPlatformDefault = (url?: string | null) =>
    !url || url.includes("c3b2058f-487c-442f-a9a0-c1c7d3fb0883") || url.includes("/branding/logo");

  // En ADN de Marca:
  // - main_logo_url: "Logo Principal - Para fondos oscuros (Ej: Sidebar, Header)"
  // - main_logo_light_url: "Logo Secundario - Para fondos claros y documentación"
  const logoDark =
    (!isPlatformDefault(settings?.main_logo_url) ? settings?.main_logo_url : null) ||
    (!isPlatformDefault(settings?.portal_logo_url) ? settings?.portal_logo_url : null) ||
    (!isPlatformDefault(org?.logo_url) ? org?.logo_url : null) ||
    null;

  const logoLight =
    (!isPlatformDefault(settings?.main_logo_light_url) ? settings?.main_logo_light_url : null) ||
    (!isPlatformDefault(settings?.portal_logo_url) ? settings?.portal_logo_url : null) ||
    (!isPlatformDefault(org?.logo_url) ? org?.logo_url : null) ||
    logoDark ||
    null;

  const tenantIsotipo = settings?.isotipo_url || (org as any)?.isotipo_url || null;

  const orgData = {
    id: staff.organization_id,
    name: settings?.agency_name || org?.name || "Organización",
    slug: org?.slug || "portal",
    logo_url: logoLight || logoDark,
    logo_dark_url: logoDark || logoLight,
    logo_light_url: logoLight || logoDark,
    isotipo_url: tenantIsotipo,
    primary_color: settings?.portal_primary_color || "#8ec045",
    secondary_color: settings?.portal_secondary_color || "#5c8ea9"
  };

  // 3. Determine role permissions
  const roleLower = (staff.role || "").toLowerCase();
  const isLeadOrPm =
    roleLower.includes("pm") ||
    roleLower.includes("lead") ||
    roleLower.includes("project") ||
    roleLower.includes("gerente") ||
    roleLower.includes("manager");

  const isQa =
    roleLower.includes("qa") ||
    roleLower.includes("tester") ||
    roleLower.includes("calidad");

  // 4. Fetch Projects
  const { data: projectsData } = await supabaseAdmin
    .from("task_projects")
    .select("*")
    .eq("organization_id", staff.organization_id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const projects: TaskProject[] = projectsData || [];

  // 5. Fetch Tasks
  // If PM or QA, also fetch all team tasks for supervision & testing queue
  let tasksQuery = supabaseAdmin
    .from("task_items")
    .select(`
      *,
      assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(
        id, first_name, last_name, photo_url, role
      ),
      qa_staff:organization_staff!task_items_qa_staff_id_fkey(
        id, first_name, last_name, photo_url, role
      ),
      project:task_projects!task_items_project_id_fkey(
        id, name, color
      )
    `)
    .eq("organization_id", staff.organization_id)
    .order("created_at", { ascending: false });

  const { data: allTasksData } = await tasksQuery;
  const allTasks = (allTasksData || []).map(normalizeTask);

  // Filter tasks assigned to this collaborator
  const myTasks = allTasks.filter(
    (t) => t.assigned_staff_id === staff.id || (isQa && t.qa_staff_id === staff.id)
  );

  const completed = myTasks.filter((t) => t.status === "done").length;
  const inProgress = myTasks.filter((t) => t.status === "in_progress").length;
  const inReview = myTasks.filter((t) => t.status === "in_review").length;
  const completionPercentage = myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 0;

  // Fetch team members with live sprint workload for all staff (allows @mentions and team overview)
  const { data: staffList } = await supabaseAdmin
    .from("organization_staff")
    .select("id, first_name, last_name, photo_url, role")
    .eq("organization_id", staff.organization_id)
    .eq("is_active", true)
    .order("first_name", { ascending: true });

  const teamMembers = (staffList || []).map((m) => {
    const memberTasks = allTasks.filter((t) => t.assigned_staff_id === m.id);
    const mCompleted = memberTasks.filter((t) => t.status === "done").length;
    const mInProgress = memberTasks.filter((t) => t.status === "in_progress").length;
    const mInReview = memberTasks.filter((t) => t.status === "in_review").length;
    const mPercent = memberTasks.length > 0 ? Math.round((mCompleted / memberTasks.length) * 100) : 0;
    const mHours = memberTasks.reduce((acc, t) => acc + (t.estimated_hours || 0), 0);
    return {
      id: m.id,
      first_name: m.first_name,
      last_name: m.last_name,
      photo_url: m.photo_url,
      role: m.role,
      totalTasks: memberTasks.length,
      completedTasks: mCompleted,
      inProgressTasks: mInProgress,
      inReviewTasks: mInReview,
      hours: mHours,
      completionPercentage: mPercent,
    };
  });

  // Fetch comments where this collaborator is mentioned (@Name or @staffId)
  const { data: mentionsData } = await supabaseAdmin
    .from("task_comments")
    .select(`
      id, task_id, author_name, author_avatar, content, created_at,
      task:task_items!task_comments_task_id_fkey(id, ticket_code, title)
    `)
    .eq("organization_id", staff.organization_id)
    .ilike("content", `%@${staff.first_name}%`)
    .neq("author_id", staff.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const recentMentions = (mentionsData || []).map((m: any) => ({
    id: m.id,
    task_id: m.task_id,
    ticket_code: m.task?.ticket_code || `TK-${m.task_id.slice(0, 4)}`,
    task_title: m.task?.title || "Tarea",
    author_name: m.author_name,
    author_avatar: m.author_avatar,
    content: m.content,
    created_at: m.created_at,
  }));

  return {
    staff: {
      id: staff.id,
      organization_id: staff.organization_id,
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email,
      role: staff.role,
      photo_url: staff.photo_url,
      access_token: staff.access_token
    },
    organization: orgData,
    projects,
    tasks: myTasks,
    allTeamTasks: isLeadOrPm || isQa ? allTasks : undefined,
    teamMembers,
    recentMentions,
    isLeadOrPm,
    isQa,
    metrics: {
      totalAssigned: myTasks.length,
      completed,
      inProgress,
      inReview,
      completionPercentage
    }
  };
}

/**
 * Update task priority from portal (e.g. PM in sprint review)
 */
export async function portalUpdateTaskPriority(
  token: string,
  taskId: string,
  priority: TaskPriority
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const { error } = await supabaseAdmin
      .from("task_items")
      .update({ priority, updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Portal update priority error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Reassign task from portal (PM capability in daily meetings)
 */
export async function portalAssignTask(
  token: string,
  taskId: string,
  assignedStaffId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const { error } = await supabaseAdmin
      .from("task_items")
      .update({ assigned_staff_id: assignedStaffId, updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Portal assign task error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update task progress slider (0 - 100%) from portal
 */
export async function portalUpdateTaskProgress(
  token: string,
  taskId: string,
  progress: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const { data: current } = await supabaseAdmin
      .from("task_items")
      .select("status, checklist")
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
      .single();

    const checklist = parseTaskChecklist(current?.checklist);
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c: any) => !c.completed);

    let clamped = Math.max(0, Math.min(100, Math.round(progress)));
    if (hasUnfinishedDeliverables && clamped > 95) {
      clamped = 95;
    }

    const updateData: any = {
      progress_percentage: clamped,
      updated_at: new Date().toISOString()
    };

    if (clamped === 100) {
      updateData.status = "done";
    } else if (clamped > 0) {
      if (current && (current.status === "todo" || current.status === "backlog")) {
        updateData.status = "in_progress";
      }
    }

    const { error } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Portal update progress error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update task status from portal (e.g. submit for QA review, complete, etc.)
 */
export async function portalUpdateTaskStatus(
  token: string,
  taskId: string,
  status: TaskStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const { data: current } = await supabaseAdmin
      .from("task_items")
      .select("checklist, progress_percentage")
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
      .single();

    const checklist = parseTaskChecklist(current?.checklist);
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c: any) => !c.completed);

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === "done") {
      if (hasUnfinishedDeliverables) {
        updateData.status = "in_review";
        updateData.progress_percentage = 95;
      } else {
        updateData.progress_percentage = 100;
      }
    } else if (status === "in_review") {
      updateData.progress_percentage = Math.max(90, updateData.progress_percentage || 90);
    }

    const { error } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Portal update status error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Toggle checklist item from portal
 */
export async function portalToggleChecklist(
  token: string,
  taskId: string,
  checklistItemId: string,
  completed: boolean
): Promise<{ success: boolean; checklist?: TaskChecklistItem[]; progress?: number; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, first_name, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("checklist, progress_percentage")
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
      .single();

    if (fetchErr || !task) throw fetchErr || new Error("Tarea no encontrada");

    const checklist: TaskChecklistItem[] = parseTaskChecklist(task.checklist).map((item: TaskChecklistItem) => {
      if (item.id === checklistItemId) {
        return {
          ...item,
          completed,
          completed_at: completed ? new Date().toISOString() : undefined,
          completed_by: completed ? staff.first_name : undefined
        };
      }
      return item;
    });

    const completedCount = checklist.filter((i) => i.completed).length;
    const progress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : task.progress_percentage;

    const updateData: any = {
      checklist,
      progress_percentage: progress,
      updated_at: new Date().toISOString()
    };

    if (progress === 100) {
      updateData.status = "done";
    }

    const { error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id);

    if (updateErr) throw updateErr;

    return { success: true, checklist, progress };
  } catch (err: any) {
    console.error("Portal toggle checklist error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Add comment from collaborator portal
 */
export async function portalAddTaskComment(
  token: string,
  taskId: string,
  content: string
): Promise<{ success: boolean; comment?: TaskComment; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, first_name, last_name, photo_url, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const authorName = `${staff.first_name} ${staff.last_name}`.trim();
    const matched = content.match(/@(\w+)/g);
    const mentions = matched ? matched.map((m) => m.substring(1)) : [];

    const { data: comment, error } = await supabaseAdmin
      .from("task_comments")
      .insert({
        organization_id: staff.organization_id,
        task_id: taskId,
        author_type: "staff",
        author_id: staff.id,
        author_name: authorName,
        author_avatar: staff.photo_url || null,
        content,
        mentions
      })
      .select("*")
      .single();

    if (error) throw error;
    return { success: true, comment: comment as TaskComment };
  } catch (err: any) {
    console.error("Portal comment error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch comments for a task from collaborator portal
 */
export async function portalGetTaskComments(
  token: string,
  taskId: string
): Promise<TaskComment[]> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) return [];

    const { data, error } = await supabaseAdmin
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .eq("organization_id", staff.organization_id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []) as TaskComment[];
  } catch (err) {
    console.error("Error fetching comments in portal:", err);
    return [];
  }
}

/**
 * Create task directly from PM or QA Lead portal
 */
export async function portalCreateTask(
  token: string,
  taskData: {
    projectId: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    assignedStaffId?: string | null;
    qaStaffId?: string | null;
    dueDate?: string | null;
    estimatedHours?: number;
    checklist?: TaskChecklistItem[];
    attachments?: TaskAttachment[];
  }
): Promise<{ success: boolean; task?: TaskItem; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, role, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const roleLower = (staff.role || "").toLowerCase();
    const isLeadOrPm =
      roleLower.includes("pm") ||
      roleLower.includes("lead") ||
      roleLower.includes("project") ||
      roleLower.includes("qa");

    if (!isLeadOrPm) {
      throw new Error("Solo los líderes o Project Managers tienen permiso para crear tareas.");
    }

    const { data: latest } = await supabaseAdmin
      .from("task_items")
      .select("ticket_code")
      .eq("organization_id", staff.organization_id)
      .order("created_at", { ascending: false })
      .limit(1);

    let nextNum = 101;
    if (latest && latest.length > 0 && latest[0].ticket_code) {
      const match = latest[0].ticket_code.match(/(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    const ticketCode = `TK-${nextNum}`;

    const { data: newTask, error } = await supabaseAdmin
      .from("task_items")
      .insert({
        organization_id: staff.organization_id,
        project_id: taskData.projectId,
        ticket_code: ticketCode,
        title: taskData.title,
        description: taskData.description || null,
        status: taskData.status || "todo",
        priority: taskData.priority || "medium",
        type: taskData.type || "task",
        progress_percentage: 0,
        assigned_staff_id: taskData.assignedStaffId === "unassigned" ? null : taskData.assignedStaffId || null,
        qa_staff_id: taskData.qaStaffId === "unassigned" ? null : taskData.qaStaffId || null,
        due_date: taskData.dueDate || null,
        created_by_staff_id: staff.id,
        estimated_hours: Number(taskData.estimatedHours || 0),
        checklist: taskData.checklist || [],
        attachments: taskData.attachments || [],
        order_index: 0
      })
      .select(`
        *,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(
          id, first_name, last_name, photo_url, role
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
    return { success: true, task: normalizeTask(newTask) };
  } catch (err: any) {
    console.error("Portal create task error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Comprehensive update of a task from the portal (supporting PM full edits & Collaborator progress/subtasks/references)
 */
export async function portalUpdateTask(
  token: string,
  taskId: string,
  data: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    assignedStaffId?: string | null;
    qaStaffId?: string | null;
    estimatedHours?: number;
    actualHours?: number;
    dueDate?: string | null;
    progressPercentage?: number;
    checklist?: TaskChecklistItem[];
    attachments?: TaskAttachment[];
  }
): Promise<{ success: boolean; task?: TaskItem; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, first_name, last_name, photo_url, role, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const roleLower = (staff.role || "").toLowerCase();
    const isLeadOrPm =
      roleLower.includes("pm") ||
      roleLower.includes("lead") ||
      roleLower.includes("project") ||
      roleLower.includes("gerente") ||
      roleLower.includes("manager") ||
      roleLower.includes("qa");

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Universal updates (collaborators and PMs can both update these)
    if (data.progressPercentage !== undefined) {
      const clamped = Math.max(0, Math.min(100, Math.round(data.progressPercentage)));
      const { data: curTask } = await supabaseAdmin
        .from("task_items")
        .select("progress_percentage, status")
        .eq("id", taskId)
        .maybeSingle();

      if (curTask && curTask.progress_percentage !== clamped) {
        // Automatically record progress audit in discussion feed
        await supabaseAdmin.from("task_comments").insert({
          organization_id: staff.organization_id,
          task_id: taskId,
          author_type: isLeadOrPm ? "owner" : "staff",
          author_id: staff.id,
          author_name: `${staff.first_name} ${staff.last_name}`.trim(),
          author_avatar: staff.photo_url || null,
          content: `📈 Avance de tarea actualizado del ${curTask.progress_percentage}% al ${clamped}%`,
          mentions: []
        });
      }

      updateData.progress_percentage = clamped;
      if (clamped === 100 && !data.status) {
        updateData.status = "done";
      }
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "done" && data.progressPercentage === undefined) {
        updateData.progress_percentage = 100;
      }
    }
    if (data.actualHours !== undefined) {
      updateData.actual_hours = Number(data.actualHours);
    }
    if (data.checklist !== undefined) {
      updateData.checklist = data.checklist;
    }
    if (data.attachments !== undefined) {
      updateData.attachments = data.attachments;
    }

    // PM/Lead administrative fields
    if (isLeadOrPm) {
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.assignedStaffId !== undefined) {
        updateData.assigned_staff_id = data.assignedStaffId === "unassigned" ? null : data.assignedStaffId;
      }
      if (data.qaStaffId !== undefined) {
        updateData.qa_staff_id = data.qaStaffId === "unassigned" ? null : data.qaStaffId;
      }
      if (data.estimatedHours !== undefined) {
        updateData.estimated_hours = Number(data.estimatedHours);
      }
      if (data.dueDate !== undefined) {
        updateData.due_date = data.dueDate || null;
      }
    } else {
      // Collaborators can also update description or title if provided
      if (data.description !== undefined) updateData.description = data.description;
    }

    const { data: updatedTask, error } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
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
    return { success: true, task: normalizeTask(updatedTask) };
  } catch (err: any) {
    console.error("Portal update task error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a task from PM portal
 */
export async function portalDeleteTask(
  token: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, role, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const roleLower = (staff.role || "").toLowerCase();
    const isLeadOrPm =
      roleLower.includes("pm") ||
      roleLower.includes("lead") ||
      roleLower.includes("project") ||
      roleLower.includes("gerente") ||
      roleLower.includes("manager");

    if (!isLeadOrPm) {
      throw new Error("Solo los líderes o Project Managers tienen permiso para eliminar tareas.");
    }

    const { error } = await supabaseAdmin
      .from("task_items")
      .delete()
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Portal delete task error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Upload file attachment from collaborator/PM portal to Supabase storage
 */
export async function portalUploadTaskAttachment(
  token: string,
  formData: FormData
): Promise<{ success: boolean; attachment?: TaskAttachment; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, first_name, last_name, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const file = formData.get("file") as File;
    if (!file) throw new Error("No se ha seleccionado ningún archivo.");

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `tasks/${staff.organization_id}/${Date.now()}_${sanitizedName}`;

    // Upload to storage with fallback bucket strategy
    const candidateBuckets = ["public-assets", "branding", "catalog"];
    let publicUrl: string | null = null;
    let lastError: any = null;

    for (const bucket of candidateBuckets) {
      try {
        const { error: uploadErr } = await supabaseAdmin.storage
          .from(bucket)
          .upload(filePath, file, { upsert: true });

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

    // Determine type
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
    console.error("Portal upload attachment error:", err);
    return { success: false, error: err.message };
  }
}

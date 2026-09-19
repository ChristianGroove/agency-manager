"use server"

import { supabaseAdmin } from "@/modules/core/database/supabase-admin";
import type { TaskItem, TaskProject, TaskWorkspace, TaskStatus, TaskPriority, TaskType, TaskAttachment, TaskComment, TaskChecklistItem, RecurrenceInterval, TaskProgressAuditSummary } from "../types";
import { normalizeTask, parseTaskChecklist, isStaffLeadOrPmRole, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "../types";
import { calculateNextRecurrence } from "../utils/recurrence-utils";

/**
 * Helper to log single-line system audit notes into task_comments for portal
 */
async function logPortalTaskAuditComment(
  orgId: string,
  taskId: string,
  content: string,
  staff?: { id?: string; first_name?: string; last_name?: string; photo_url?: string | null; role?: string } | string
) {
  try {
    let authorName = "Sistema";
    let authorId = "system";
    let authorAvatar: string | null = null;

    if (typeof staff === "string") {
      authorName = staff;
    } else if (staff) {
      authorId = staff.id || "system";
      authorName = `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Sistema";
      authorAvatar = staff.photo_url || null;
    }

    await supabaseAdmin.from("task_comments").insert({
      organization_id: orgId,
      task_id: taskId,
      author_type: "system",
      author_id: authorId,
      author_name: authorName,
      author_avatar: authorAvatar,
      content,
      mentions: []
    });
  } catch (err) {
    console.error("Error inserting portal task audit comment:", err);
  }
}

/**
 * Automatic unblocker: When a task is marked done in portal, notify and unblock dependent tasks
 */
async function handlePortalTaskUnblocking(completedTaskId: string, ticketCode: string, title: string) {
  try {
    const { data: blockedTasks } = await supabaseAdmin
      .from("task_items")
      .select("id, ticket_code, title, status, progress_percentage, organization_id, assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(first_name)")
      .eq("blocked_by_task_id", completedTaskId);

    if (!blockedTasks || blockedTasks.length === 0) return;

    for (const bt of blockedTasks) {
      const mentionTag = (bt as any)?.assigned_staff?.first_name ? ` @${(bt as any).assigned_staff.first_name}` : "";
      await logPortalTaskAuditComment(
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
      }
    }
  } catch (err) {
    console.error("Error running portal task unblocking:", err);
  }
}

export interface CollaboratorPortalData {
  latestAudits?: Record<string, TaskProgressAuditSummary>;
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
  workspaces?: TaskWorkspace[];
  projects: TaskProject[];
  tasks: TaskItem[];
  allTeamTasks?: TaskItem[]; // For PMs or QA Leads
  teamMembers?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    role: string;
    phone?: string | null;
    access_token?: string | null;
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

import { cache } from "react";

/**
 * Validate token and return full collaborator portal session data
 * Memoized per-request to avoid redundant executions between generateMetadata and Page render.
 */
export const getCollaboratorPortalData = cache(async (token: string): Promise<CollaboratorPortalData | null> => {
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
  const hasLeadKeywords = isStaffLeadOrPmRole(staff.role);

  // Also check if this collaborator is designated lead of any workspace or project
  const { data: leadWorkspaces } = await supabaseAdmin
    .from("task_workspaces")
    .select("id")
    .eq("organization_id", staff.organization_id)
    .eq("lead_staff_id", staff.id)
    .limit(1);

  const { data: leadProjects } = await supabaseAdmin
    .from("task_projects")
    .select("id")
    .eq("organization_id", staff.organization_id)
    .eq("lead_staff_id", staff.id)
    .limit(1);

  const isLeadOrPm = Boolean(
    hasLeadKeywords ||
    (leadWorkspaces && leadWorkspaces.length > 0) ||
    (leadProjects && leadProjects.length > 0)
  );

  const isQa =
    roleLower.includes("qa") ||
    roleLower.includes("tester") ||
    roleLower.includes("calidad") ||
    roleLower.includes("revisor") ||
    roleLower.includes("pruebas");

  // 4. Resolve Workspace Access Control & Fetch Workspaces
  const hasGlobalAccess = staff.has_global_workspace_access !== false;

  let authorizedWorkspaceIds: string[] | null = null;
  if (!hasGlobalAccess) {
    const { data: userMemberships } = await supabaseAdmin
      .from("task_workspace_members")
      .select("workspace_id")
      .eq("staff_id", staff.id)
      .eq("organization_id", staff.organization_id);

    const wsIds = new Set((userMemberships || []).map((m) => m.workspace_id));
    if (leadWorkspaces) {
      leadWorkspaces.forEach((w) => wsIds.add(w.id));
    }
    authorizedWorkspaceIds = Array.from(wsIds);
  }

  let workspacesQuery = supabaseAdmin
    .from("task_workspaces")
    .select("id, organization_id, name, slug, key_prefix, color, icon, lead_staff_id, created_at, updated_at")
    .eq("organization_id", staff.organization_id)
    .order("name", { ascending: true });

  if (authorizedWorkspaceIds !== null) {
    workspacesQuery = workspacesQuery.in(
      "id",
      authorizedWorkspaceIds.length > 0 ? authorizedWorkspaceIds : ["00000000-0000-0000-0000-000000000000"]
    );
  }

  const { data: workspacesData } = await workspacesQuery;
  const workspaces: TaskWorkspace[] = (workspacesData || []) as any;
  const allowedWorkspaceIds = new Set(workspaces.map((w) => w.id));

  // 5. Fetch Projects (scoped to allowed workspaces if not global)
  const { data: projectsData } = await supabaseAdmin
    .from("task_projects")
    .select(`
      *,
      workspace:task_workspaces!task_projects_workspace_id_fkey(
        id, name, slug, key_prefix, color, icon
      )
    `)
    .eq("organization_id", staff.organization_id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  let projects: TaskProject[] = projectsData || [];
  if (!hasGlobalAccess) {
    projects = projects.filter((p) => p.workspace_id && allowedWorkspaceIds.has(p.workspace_id));
  }
  const allowedProjectIds = new Set(projects.map((p) => p.id));

  // 6. Fetch Tasks (scoped to allowed projects if not global)
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
      ),
      blocked_by:blocked_by_task_id(
        id, ticket_code, title, status
      )
    `)
    .eq("organization_id", staff.organization_id)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  const { data: allTasksData } = await tasksQuery;
  let allTasks = (allTasksData || []).map(normalizeTask);

  if (!hasGlobalAccess) {
    allTasks = allTasks.filter(
      (t) =>
        allowedProjectIds.has(t.project_id) ||
        t.assigned_staff_id === staff.id ||
        (t.checklist && t.checklist.some((c) => c.assigned_staff_id === staff.id))
    );
  }

  // Filter tasks assigned to this collaborator (as lead, QA, or subtask/deliverable owner)
  const myTasks = allTasks.filter(
    (t) =>
      t.assigned_staff_id === staff.id ||
      (isQa && t.qa_staff_id === staff.id) ||
      (t.checklist && t.checklist.some((c) => c.assigned_staff_id === staff.id))
  );

  const completed = myTasks.filter((t) => t.status === "done").length;
  const inProgress = myTasks.filter((t) => t.status === "in_progress").length;
  const inReview = myTasks.filter((t) => t.status === "in_review").length;
  const completionPercentage = myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 0;

  // Fetch team members with live sprint workload for all staff (allows @mentions and team overview)
  const { data: staffList } = await supabaseAdmin
    .from("organization_staff")
    .select("id, first_name, last_name, photo_url, role, phone, access_token")
    .eq("organization_id", staff.organization_id)
    .eq("is_active", true)
    .order("first_name", { ascending: true });

  let filteredStaffList = staffList || [];
  if (!hasGlobalAccess) {
    // Only include staff who share at least one authorized workspace or are assigned in allowed tasks
    const { data: sharedStaffMemberships } = await supabaseAdmin
      .from("task_workspace_members")
      .select("staff_id")
      .in("workspace_id", Array.from(allowedWorkspaceIds).length > 0 ? Array.from(allowedWorkspaceIds) : ["00000000-0000-0000-0000-000000000000"]);

    const sharedStaffIds = new Set((sharedStaffMemberships || []).map((m) => m.staff_id));
    sharedStaffIds.add(staff.id);
    allTasks.forEach((t) => {
      if (t.assigned_staff_id) sharedStaffIds.add(t.assigned_staff_id);
      if (t.qa_staff_id) sharedStaffIds.add(t.qa_staff_id);
    });

    filteredStaffList = filteredStaffList.filter((m) => sharedStaffIds.has(m.id));
  }

  const teamMembers = await Promise.all(
    filteredStaffList.map(async (m) => {
      let token = m.access_token;
      if (!token) {
        token = crypto.randomUUID();
        await supabaseAdmin
          .from("organization_staff")
          .update({ access_token: token })
          .eq("id", m.id);
      }
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
        phone: m.phone,
        access_token: token,
        totalTasks: memberTasks.length,
        completedTasks: mCompleted,
        inProgressTasks: mInProgress,
        inReviewTasks: mInReview,
        hours: mHours,
        completionPercentage: mPercent,
      };
    })
  );

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

  // Fetch latest progress audit comments for tasks in this organization
  const { data: auditsData } = await supabaseAdmin
    .from("task_comments")
    .select("task_id, author_name, author_avatar, content, created_at")
    .eq("organization_id", staff.organization_id)
    .or("content.ilike.%de tarea actualizado del%,content.ilike.%de tarea actualizada del%,content.ilike.%📈%,content.ilike.%📉%")
    .order("created_at", { ascending: false })
    .limit(200);

  const latestAudits: Record<string, TaskProgressAuditSummary> = {};
  if (auditsData) {
    for (const a of auditsData) {
      if (!latestAudits[a.task_id]) {
        const match = a.content.match(/del\s+(\d+)%\s+al\s+(\d+)%/i);
        if (match) {
          const fromProgress = parseInt(match[1], 10);
          const toProgress = parseInt(match[2], 10);
          const isRegression = toProgress < fromProgress || a.content.includes("📉") || a.content.toLowerCase().includes("regresi");
          latestAudits[a.task_id] = {
            taskId: a.task_id,
            authorName: a.author_name || "Colaborador",
            authorAvatar: a.author_avatar || null,
            fromProgress,
            toProgress,
            isRegression,
            createdAt: a.created_at
          };
        }
      }
    }
  }

  return {
    latestAudits,
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
    workspaces,
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
});

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
      .select("id, organization_id, first_name, last_name, photo_url, role")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");
    const isLeadOrPm = isStaffLeadOrPmRole(staff.role);

    const { data: current } = await supabaseAdmin
      .from("task_items")
      .select("status, checklist, progress_percentage, assigned_staff_id, blocked_by_task_id, ticket_code, title")
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
      .single();

    const isMainAssignee = current?.assigned_staff_id === staff.id;
    const canCloseParentTask = isLeadOrPm || isMainAssignee;
    const canManageParent = canCloseParentTask;

    if (!canManageParent) {
      throw new Error("Solo el responsable directo de la tarea o un PM pueden ajustar el avance general del ticket.");
    }

    const checklist = parseTaskChecklist(current?.checklist);
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c: any) => !c.completed);

    let clamped = Math.max(0, Math.min(100, Math.round(progress)));
    if (hasUnfinishedDeliverables && clamped > 95) {
      clamped = 95;
    }
    if (!canCloseParentTask && clamped >= 100) {
      clamped = 95;
    }

    // Dependency restriction: Cannot complete or reach 100% if predecessor is not done
    if (clamped === 100 && current?.blocked_by_task_id) {
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

    if (current && current.progress_percentage !== clamped) {
      const isRegression = clamped < (current.progress_percentage ?? 0);
      const icon = isRegression ? "📉" : "📈";
      const actionWord = isRegression ? "Regresión" : "Avance";
      await supabaseAdmin.from("task_comments").insert({
        organization_id: staff.organization_id,
        task_id: taskId,
        author_type: isLeadOrPm ? "owner" : "staff",
        author_id: staff.id,
        author_name: `${staff.first_name} ${staff.last_name}`.trim(),
        author_avatar: staff.photo_url || null,
        content: `${icon} ${actionWord} de tarea actualizado del ${current.progress_percentage ?? 0}% al ${clamped}%`,
        mentions: []
      });
    }

    const updateData: any = {
      progress_percentage: clamped,
      updated_at: new Date().toISOString()
    };

    if (clamped === 100) {
      if (canCloseParentTask) {
        updateData.status = "done";
      } else {
        clamped = 95;
        updateData.progress_percentage = 95;
      }
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

    if (clamped === 100 && canCloseParentTask && current && current.status !== "done") {
      await handlePortalTaskUnblocking(taskId, current.ticket_code, current.title);
    }

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
  status: TaskStatus,
  blockedReason?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, first_name, last_name, photo_url, role, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const { data: current } = await supabaseAdmin
      .from("task_items")
      .select("checklist, progress_percentage, status, ticket_code, title, blocked_by_task_id, blocked_reason")
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
      .single();

    if ((status === "done" || status === "in_review") && current?.blocked_by_task_id) {
      const { data: blocker } = await supabaseAdmin
        .from("task_items")
        .select("id, ticket_code, title, status")
        .eq("id", current.blocked_by_task_id)
        .maybeSingle();

      if (blocker && blocker.status !== "done") {
        const actionLabel = status === "in_review" ? "enviar a revisión / QA" : "completar";
        return {
          success: false,
          error: `No se puede ${actionLabel} el ticket porque depende de #${blocker.ticket_code} (${blocker.title}), el cual aún está pendiente (${TASK_STATUS_LABELS[blocker.status as TaskStatus] || blocker.status}).`
        };
      }
    }

    const checklist = parseTaskChecklist(current?.checklist);
    const hasUnfinishedDeliverables = checklist.length > 0 && checklist.some((c: any) => !c.completed);

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === "blocked" && blockedReason !== undefined) {
      updateData.blocked_reason = blockedReason;
    } else if (status !== "blocked" && current?.status === "blocked") {
      updateData.blocked_reason = null;
    }

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

    if (current && current.status !== updateData.status) {
      const oldLabel = TASK_STATUS_LABELS[current.status as TaskStatus] || current.status;
      const newLabel = TASK_STATUS_LABELS[updateData.status as TaskStatus] || updateData.status;
      await logPortalTaskAuditComment(
        staff.organization_id,
        taskId,
        `🔄 Estado actualizado a "${newLabel}" (anterior: "${oldLabel}")`,
        staff
      );

      if (updateData.status === "blocked" && blockedReason && blockedReason.trim()) {
        await logPortalTaskAuditComment(
          staff.organization_id,
          taskId,
          `🚫 Motivo del bloqueo: ${blockedReason.trim()}`,
          staff
        );
      }

      if (updateData.status === "done") {
        await handlePortalTaskUnblocking(taskId, current.ticket_code, current.title);
      }
    }

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
      .select("id, first_name, last_name, photo_url, role, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select(`
        checklist, progress_percentage, status, ticket_code, title, assigned_staff_id, created_by_staff_id,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(id, first_name),
        creator_staff:organization_staff!task_items_created_by_staff_id_fkey(id, first_name)
      `)
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
      .single();

    if (fetchErr || !task) throw fetchErr || new Error("Tarea no encontrada");

    const currentChecklist = parseTaskChecklist(task.checklist);
    const targetItem = currentChecklist.find((i) => i.id === checklistItemId);
    if (!targetItem) throw new Error("Subtarea no encontrada");

    const isLeadOrPm = isStaffLeadOrPmRole(staff.role);
    const isMainAssignee = task.assigned_staff_id === staff.id;
    const canToggleAny = isLeadOrPm || isMainAssignee;

    if (!canToggleAny && targetItem.assigned_staff_id && targetItem.assigned_staff_id !== staff.id) {
      throw new Error("No tienes autorización para marcar subtareas asignadas a otros colaboradores.");
    }
    if (!canToggleAny && !targetItem.assigned_staff_id) {
      throw new Error("Solo el responsable directo de la tarea o un PM pueden marcar subtareas generales.");
    }

    const checklist: TaskChecklistItem[] = currentChecklist.map((item: TaskChecklistItem) => {
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

    // When all deliverables are completed, move to in_review (QA), NOT directly to done
    if (progress === 100 && task.status !== "done") {
      updateData.status = "in_review";
    }

    const { error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id);

    if (updateErr) throw updateErr;

    // Log audit note for subtask completion with stakeholder mentions
    const toggledItem = checklist.find((i) => i.id === checklistItemId);
    if (toggledItem) {
      const itemTitle = toggledItem.title ? `"${toggledItem.title}"` : "subtarea";

      const assignedFirstName = (task as any)?.assigned_staff?.first_name;
      let creatorFirstName = (task as any)?.creator_staff?.first_name;
      if (!creatorFirstName) {
        const { data: pmStaff } = await supabaseAdmin
          .from("organization_staff")
          .select("id, first_name")
          .eq("organization_id", staff.organization_id)
          .or("role.ilike.%gestor%,role.ilike.%pm%,role.ilike.%lead%")
          .neq("id", staff.id)
          .limit(1)
          .maybeSingle();
        if (pmStaff) {
          creatorFirstName = pmStaff.first_name;
        }
      }
      const notifyTags: string[] = [];
      if (assignedFirstName && task.assigned_staff_id !== staff.id) {
        notifyTags.push(`@${assignedFirstName}`);
      }
      if (creatorFirstName && creatorFirstName !== assignedFirstName && task.created_by_staff_id !== staff.id) {
        notifyTags.push(`@${creatorFirstName}`);
      }
      const notifyMsg = notifyTags.length > 0 ? ` | Notificando a ${notifyTags.join(" ")}` : "";

      const auditMsg = completed
        ? `☑️ Subtarea completada: ${itemTitle} por @${staff.first_name}${notifyMsg}`
        : `⬜ Subtarea reactivada: ${itemTitle} por @${staff.first_name}`;
      await logPortalTaskAuditComment(staff.organization_id, taskId, auditMsg, staff);
    }

    if (progress === 100 && task.status !== "done") {
      await handlePortalTaskUnblocking(taskId, task.ticket_code, task.title);
    }

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
      .order("created_at", { ascending: false });

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
    tags?: string[];
    isRecurring?: boolean;
    recurrenceInterval?: RecurrenceInterval | null;
    recurrenceDay?: number | null;
    blockedByTaskId?: string | null;
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

    const isLeadOrPm = isStaffLeadOrPmRole(staff.role);

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
        tags: taskData.tags || [],
        attachments: taskData.attachments || [],
        order_index: 0,
        blocked_by_task_id: taskData.blockedByTaskId || null,
        is_recurring: taskData.isRecurring ?? false,
        recurrence_interval: taskData.recurrenceInterval || null,
        recurrence_day: taskData.recurrenceDay || 1,
        next_recurrence_at: taskData.isRecurring && taskData.recurrenceInterval ? calculateNextRecurrence(taskData.recurrenceInterval, new Date(), taskData.recurrenceDay || 1).toISOString() : null
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
        ),
        blocked_by:blocked_by_task_id(
          id, ticket_code, title, status
        )
      `)
      .single();

    if (error) throw error;

    // Log audit notes for assignments upon creation
    if (taskData.assignedStaffId && taskData.assignedStaffId !== "unassigned") {
      const { data: mainStaff } = await supabaseAdmin
        .from("organization_staff")
        .select("first_name, last_name")
        .eq("id", taskData.assignedStaffId)
        .maybeSingle();
      if (mainStaff) {
        await logPortalTaskAuditComment(
          staff.organization_id,
          newTask.id,
          `👤 Asignado a @${mainStaff.first_name} (${mainStaff.first_name} ${mainStaff.last_name})`,
          staff
        );
      }
    }

    if (taskData.checklist && Array.isArray(taskData.checklist)) {
      for (const item of taskData.checklist) {
        if (item.assigned_staff_id && item.assigned_staff_id !== "unassigned") {
          const { data: assignedStaff } = await supabaseAdmin
            .from("organization_staff")
            .select("first_name, last_name")
            .eq("id", item.assigned_staff_id)
            .maybeSingle();
          if (assignedStaff) {
            const itemTitle = item.title ? `"${item.title}"` : "subtarea";
            await logPortalTaskAuditComment(
              staff.organization_id,
              newTask.id,
              `👤 Subtarea ${itemTitle} asignada a @${assignedStaff.first_name} (${assignedStaff.first_name} ${assignedStaff.last_name})`,
              staff
            );
          }
        }
      }
    }

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
    tags?: string[];
    isRecurring?: boolean;
    recurrenceInterval?: RecurrenceInterval | null;
    recurrenceDay?: number | null;
    blockedByTaskId?: string | null;
    blockedReason?: string | null;
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
    const isLeadOrPm = isStaffLeadOrPmRole(staff.role);

    // Fetch previous state for audit comparison and stakeholder notifications
    const { data: prevTask } = await supabaseAdmin
      .from("task_items")
      .select(`
        status, priority, due_date, assigned_staff_id, created_by_staff_id, blocked_by_task_id, blocked_reason, ticket_code, title, checklist,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(id, first_name),
        creator_staff:organization_staff!task_items_created_by_staff_id_fkey(id, first_name)
      `)
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
      .maybeSingle();

    const isMainAssignee = prevTask?.assigned_staff_id === staff.id;
    const canCloseParentTask = isLeadOrPm || isMainAssignee;

    if (!canCloseParentTask) {
      if (data.status === "done") {
        throw new Error("Solo el responsable asignado al ticket o el Gestor de Proyecto pueden marcar la tarea como Completada.");
      }
      // Subtask-only contributors cannot manually override the parent task's progress
      if (data.progressPercentage !== undefined) {
        delete data.progressPercentage;
      }
    }

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
        const isRegression = clamped < (curTask.progress_percentage ?? 0);
        const icon = isRegression ? "📉" : "📈";
        const actionWord = isRegression ? "Regresión" : "Avance";
        await supabaseAdmin.from("task_comments").insert({
          organization_id: staff.organization_id,
          task_id: taskId,
          author_type: isLeadOrPm ? "owner" : "staff",
          author_id: staff.id,
          author_name: `${staff.first_name} ${staff.last_name}`.trim(),
          author_avatar: staff.photo_url || null,
          content: `${icon} ${actionWord} de tarea actualizado del ${curTask.progress_percentage ?? 0}% al ${clamped}%`,
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
      if (!isLeadOrPm) {
        // Enforce: Normal collaborators cannot delete deliverables
        const { data: curTask } = await supabaseAdmin
          .from("task_items")
          .select("checklist")
          .eq("id", taskId)
          .maybeSingle();

        const currentChecklist: TaskChecklistItem[] = Array.isArray(curTask?.checklist)
          ? curTask.checklist
          : [];

        const safeChecklist = currentChecklist.map((existing) => {
          const match = Array.isArray(data.checklist)
            ? data.checklist.find((c: any) => c.id === existing.id)
            : null;
          if (match) {
            // Main assignee can toggle any deliverable; subtask-only contributor can ONLY toggle their own
            const canToggleThisItem = isMainAssignee || (existing.assigned_staff_id && existing.assigned_staff_id === staff.id);
            if (canToggleThisItem) {
              return {
                ...existing,
                completed: Boolean(match.completed),
                completed_at: match.completed ? (match.completed_at || new Date().toISOString()) : undefined,
                completed_by: match.completed ? (match.completed_by || staff.first_name) : undefined,
              };
            }
          }
          return existing;
        });

        updateData.checklist = safeChecklist;

        if (!canCloseParentTask) {
          const completedCount = safeChecklist.filter((i: any) => i.completed).length;
          const computedProgress = safeChecklist.length > 0
            ? Math.round((completedCount / safeChecklist.length) * 100)
            : undefined;
          if (computedProgress !== undefined) {
            updateData.progress_percentage = computedProgress;
            if (computedProgress === 100 && (!updateData.status || updateData.status === "done")) {
              updateData.status = "in_review";
            }
          }
        }
      } else {
        updateData.checklist = data.checklist;
      }
    }
    if (data.attachments !== undefined) {
      updateData.attachments = data.attachments;
    }
    if (data.tags !== undefined) {
      updateData.tags = data.tags;
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
      if (data.blockedByTaskId !== undefined) {
        updateData.blocked_by_task_id = data.blockedByTaskId || null;
      }
      if (data.isRecurring !== undefined) {
        updateData.is_recurring = data.isRecurring;
        if (data.isRecurring && data.recurrenceInterval) {
          updateData.recurrence_interval = data.recurrenceInterval;
          updateData.recurrence_day = data.recurrenceDay || 1;
          updateData.next_recurrence_at = calculateNextRecurrence(
            data.recurrenceInterval,
            new Date(),
            data.recurrenceDay || 1
          ).toISOString();
        } else if (!data.isRecurring) {
          updateData.recurrence_interval = null;
          updateData.next_recurrence_at = null;
        }
      } else if (data.recurrenceInterval !== undefined || data.recurrenceDay !== undefined) {
        if (data.recurrenceInterval) updateData.recurrence_interval = data.recurrenceInterval;
        if (data.recurrenceDay) updateData.recurrence_day = data.recurrenceDay;
        const { data: currRTask } = await supabaseAdmin
          .from("task_items")
          .select("is_recurring, recurrence_interval, recurrence_day")
          .eq("id", taskId)
          .single();
        if (currRTask?.is_recurring) {
          const interval = data.recurrenceInterval || currRTask.recurrence_interval;
          const day = data.recurrenceDay || currRTask.recurrence_day || 1;
          if (interval) {
            updateData.next_recurrence_at = calculateNextRecurrence(interval, new Date(), day).toISOString();
          }
        }
      }
    } else {
      // Collaborators can also update description or title if provided
      if (data.description !== undefined) updateData.description = data.description;
    }

    if (data.blockedReason !== undefined) {
      updateData.blocked_reason = data.blockedReason || null;
    }

    // If unblocking status, clear blocked_reason automatically if not explicitly provided
    if (prevTask?.status === "blocked" && updateData.status && updateData.status !== "blocked") {
      if (updateData.blocked_reason === undefined) {
        updateData.blocked_reason = null;
      }
    }

    // Validate dependency blocking rule: cannot complete or reach 100% if blocker is unfinished
    const effectiveBlockerId = updateData.blocked_by_task_id !== undefined
      ? updateData.blocked_by_task_id
      : prevTask?.blocked_by_task_id;

    if ((updateData.status === "done" || updateData.status === "in_review" || updateData.progress_percentage === 100) && effectiveBlockerId) {
      const { data: blocker } = await supabaseAdmin
        .from("task_items")
        .select("id, ticket_code, title, status")
        .eq("id", effectiveBlockerId)
        .maybeSingle();

      if (blocker && blocker.status !== "done") {
        const actionLabel = updateData.status === "in_review" ? "enviar a revisión / QA" : "completar";
        throw new Error(
          `No se puede ${actionLabel} el ticket porque depende de #${blocker.ticket_code} (${blocker.title}), el cual aún está pendiente (${TASK_STATUS_LABELS[blocker.status as TaskStatus] || blocker.status}).`
        );
      }
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
        ),
        blocked_by:blocked_by_task_id(
          id, ticket_code, title, status
        )
      `)
      .single();

    if (error) throw error;

    if (prevTask) {
      const orgId = staff.organization_id;

      // Status change audit
      if (updateData.status && updateData.status !== prevTask.status) {
        const oldLabel = TASK_STATUS_LABELS[prevTask.status as TaskStatus] || prevTask.status;
        const newLabel = TASK_STATUS_LABELS[updateData.status as TaskStatus] || updateData.status;

        let statusNotify = "";
        if (updateData.status === "done") {
          const creatorFirstName = (prevTask as any)?.creator_staff?.first_name;
          if (creatorFirstName && prevTask.created_by_staff_id !== staff.id) {
            statusNotify = ` | Notificando a @${creatorFirstName} (Gestor de Proyecto)`;
          }
        }

        await logPortalTaskAuditComment(orgId, taskId, `🔄 Estado actualizado a "${newLabel}" (anterior: "${oldLabel}")${statusNotify}`, staff);

        if (updateData.status === "done") {
          await handlePortalTaskUnblocking(taskId, prevTask.ticket_code, prevTask.title);
        }
      }

      // Priority change audit
      if (updateData.priority && updateData.priority !== prevTask.priority) {
        const oldP = TASK_PRIORITY_LABELS[prevTask.priority as TaskPriority] || prevTask.priority;
        const newP = TASK_PRIORITY_LABELS[updateData.priority as TaskPriority] || updateData.priority;
        await logPortalTaskAuditComment(orgId, taskId, `⚡ Prioridad cambiada a ${newP} (anterior: ${oldP})`, staff);
      }

      // Due date audit
      if (updateData.due_date !== undefined && updateData.due_date !== prevTask.due_date) {
        if (updateData.due_date) {
          const dateFormatted = new Date(updateData.due_date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
          await logPortalTaskAuditComment(orgId, taskId, `📅 Fecha límite establecida para el ${dateFormatted}`, staff);
        } else {
          await logPortalTaskAuditComment(orgId, taskId, `📅 Fecha límite eliminada`, staff);
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
          await logPortalTaskAuditComment(orgId, taskId, `👤 Asignado a ${staffTag} (${staffName})`, staff);
        } else {
          await logPortalTaskAuditComment(orgId, taskId, `👤 Asignación de tarea removida`, staff);
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
          await logPortalTaskAuditComment(orgId, taskId, `🚫 Bloqueado por ${blkCode}${blkTitle}`, staff);
        } else {
          await logPortalTaskAuditComment(orgId, taskId, `🔓 Bloqueo removido manualmente`, staff);
        }
      }

      // Blocker reason audit
      if (updateData.blocked_reason !== undefined && updateData.blocked_reason !== prevTask.blocked_reason) {
        if (updateData.blocked_reason && updateData.blocked_reason.trim()) {
          await logPortalTaskAuditComment(orgId, taskId, `🚫 Motivo del bloqueo: ${updateData.blocked_reason.trim()}`, staff);
        } else if (prevTask.blocked_reason) {
          await logPortalTaskAuditComment(orgId, taskId, `🔓 Motivo del bloqueo removido`, staff);
        }
      }

      // Subtask resolution and assignment audit loop
      if (updateData.checklist && Array.isArray(updateData.checklist)) {
        const prevChecklist = parseTaskChecklist(prevTask.checklist);
        const newChecklist = parseTaskChecklist(updateData.checklist);

        // Resolve stakeholder mention tags
        const assignedFirstName = (prevTask as any)?.assigned_staff?.first_name;
        let creatorFirstName = (prevTask as any)?.creator_staff?.first_name;
        if (!creatorFirstName) {
          const { data: pmStaff } = await supabaseAdmin
            .from("organization_staff")
            .select("id, first_name")
            .eq("organization_id", staff.organization_id)
            .or("role.ilike.%gestor%,role.ilike.%pm%,role.ilike.%lead%")
            .neq("id", staff.id)
            .limit(1)
            .maybeSingle();
          if (pmStaff) {
            creatorFirstName = pmStaff.first_name;
          }
        }
        const notifyTags: string[] = [];
        if (assignedFirstName && prevTask.assigned_staff_id !== staff.id) {
          notifyTags.push(`@${assignedFirstName}`);
        }
        if (creatorFirstName && creatorFirstName !== assignedFirstName && prevTask.created_by_staff_id !== staff.id) {
          notifyTags.push(`@${creatorFirstName}`);
        }
        const notifyMsg = notifyTags.length > 0 ? ` | Notificando a ${notifyTags.join(" ")}` : "";

        for (const item of newChecklist) {
          const prevItem = prevChecklist.find((p) => p.id === item.id);
          const itemTitle = item.title ? `"${item.title}"` : "subtarea";

          // 1. Completion / Reactivation detection
          if (prevItem && !prevItem.completed && item.completed) {
            await logPortalTaskAuditComment(
              orgId,
              taskId,
              `☑️ Subtarea completada: ${itemTitle} por @${staff.first_name}${notifyMsg}`,
              staff
            );
          } else if (prevItem && prevItem.completed && !item.completed) {
            await logPortalTaskAuditComment(
              orgId,
              taskId,
              `⬜ Subtarea reactivada: ${itemTitle} por @${staff.first_name}`,
              staff
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
                await logPortalTaskAuditComment(
                  orgId,
                  taskId,
                  `👤 Subtarea ${itemTitle} asignada a @${assignedStaff.first_name} (${assignedStaff.first_name} ${assignedStaff.last_name})`,
                  staff
                );
              }
            }
          }
        }
      }
    }

    return { success: true, task: normalizeTask(updatedTask) };
  } catch (err: any) {
    console.error("Portal update task error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Assign or reassign a deliverable / subtask to a collaborator from portal
 */
export async function portalUpdateChecklistItemAssignee(
  token: string,
  taskId: string,
  checklistItemId: string,
  assignedStaffId: string | null
): Promise<{ success: boolean; checklist?: TaskChecklistItem[]; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, organization_id, first_name, last_name, photo_url, role")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("checklist")
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
      .single();

    if (fetchErr || !task) throw fetchErr || new Error("Tarea no encontrada");

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
      .update({ checklist, updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id);

    if (updateErr) throw updateErr;

    // Log audit note for subtask assignment in portal
    if (assignedStaffId) {
      const { data: assignedStaff } = await supabaseAdmin
        .from("organization_staff")
        .select("first_name, last_name")
        .eq("id", assignedStaffId)
        .single();
      const item = checklist.find((i) => i.id === checklistItemId);
      if (assignedStaff && item) {
        const itemTitle = item.title ? `"${item.title}"` : "subtarea";
        await logPortalTaskAuditComment(
          staff.organization_id,
          taskId,
          `👤 Subtarea ${itemTitle} asignada a @${assignedStaff.first_name} (${assignedStaff.first_name} ${assignedStaff.last_name})`,
          staff
        );
      }
    }

    return { success: true, checklist };
  } catch (err: any) {
    console.error("Portal update checklist assignee error:", err);
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

    const isLeadOrPm = isStaffLeadOrPmRole(staff.role);

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

/**
 * Portal action: Save or override weekly pacing snapshot for a task
 */
export async function portalSaveTaskWeeklySnapshot(
  accessToken: string,
  taskId: string,
  week: 1 | 2 | 3 | 4,
  progress: number
): Promise<{ success: boolean; weekly_snapshots?: any; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, organization_id, role")
      .eq("access_token", accessToken)
      .eq("is_active", true)
      .single();

    if (!staff) throw new Error("Acceso no autorizado");

    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("id, weekly_snapshots")
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
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
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id);

    if (updateErr) throw updateErr;

    return { success: true, weekly_snapshots: nextSnapshots };
  } catch (err: any) {
    console.error("Portal save task weekly snapshot error:", err);
    return { success: false, error: err.message };
  }
}

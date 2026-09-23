"use server"

import { supabaseAdmin } from "@/modules/core/database/supabase-admin";
import type { TaskItem, TaskProject, TaskWorkspace, TaskStatus, TaskPriority, TaskType, TaskAttachment, TaskComment, TaskChecklistItem, RecurrenceInterval, TaskProgressAuditSummary, TaskSprint } from "../types";
import { normalizeTask, parseTaskChecklist, isStaffLeadOrPmRole, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "../types";
import { calculateNextRecurrence } from "../utils/recurrence-utils";

/**
 * Helper to log single-line system audit notes into task_comments for portal
 */
async function logPortalTaskAuditComment(
  orgId: string,
  taskId: string,
  content: string,
  staff?: { id?: string; first_name?: string; last_name?: string; photo_url?: string | null; role?: string | null } | string,
  explicitMentions?: string[]
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

    const extracted = explicitMentions && explicitMentions.length > 0
      ? explicitMentions
      : Array.from(content.matchAll(/@([a-zA-Z0-9_\.\u00C0-\u017F]+)/g)).map((m) => m[1]);

    await supabaseAdmin.from("task_comments").insert({
      organization_id: orgId,
      task_id: taskId,
      author_type: "system",
      author_id: authorId,
      author_name: authorName,
      author_avatar: authorAvatar,
      content,
      mentions: Array.from(new Set(extracted.filter(Boolean)))
    });
  } catch (err) {
    console.error("Error inserting portal task audit comment:", err);
  }
}

/**
 * Automatic unblocker: When a task is marked done in portal, notify and unblock dependent tasks
 */
async function handlePortalTaskUnblocking(completedTaskId: string, ticketCode: string, title: string): Promise<TaskItem[]> {
  try {
    const { data: blockedTasks } = await supabaseAdmin
      .from("task_items")
      .select("id, ticket_code, title, status, progress_percentage, organization_id, assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(first_name)")
      .eq("blocked_by_task_id", completedTaskId);

    if (!blockedTasks || blockedTasks.length === 0) return [];

    const unblockedIds: string[] = [];
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
        unblockedIds.push(bt.id);
      }
    }

    if (unblockedIds.length === 0) return [];

    const { data: refreshedUnblocked } = await supabaseAdmin
      .from("task_items")
      .select(`
        *,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(*),
        qa_staff:organization_staff!task_items_qa_staff_id_fkey(*),
        project:task_projects(*),
        blocked_by:task_items!task_items_blocked_by_task_id_fkey(id, ticket_code, title, status)
      `)
      .in("id", unblockedIds);

    return (refreshedUnblocked || []).map(normalizeTask);
  } catch (err) {
    console.error("Error running portal task unblocking:", err);
    return [];
  }
}

/**
 * Universal stakeholder notifier for key task lifecycle transitions:
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
  currentActorStaff: { id: string; first_name: string; last_name: string; role?: string | null; photo_url?: string | null },
  blockedReason?: string | null
) {
  if (newStatus === prevStatus) return;

  try {
    // 1. Fetch task details
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

    // 2. Fetch active PMs/Leads in this organization
    const { data: pmStaffList } = await supabaseAdmin
      .from("organization_staff")
      .select("id, first_name, last_name, role")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .or("role.ilike.%gestor%,role.ilike.%pm%,role.ilike.%lead%,role.ilike.%lider%,role.ilike.%líder%");

    const targetStaff: { id: string; first_name: string; roleDesc: string }[] = [];

    const addRecipient = (member?: { id: string; first_name: string; role?: string | null } | null, roleDesc: string = "") => {
      if (!member || !member.first_name) return;
      if (member.id === currentActorStaff.id) return; // Do not self-notify
      if (!targetStaff.some((s) => s.id === member.id)) {
        targetStaff.push({ id: member.id, first_name: member.first_name, roleDesc });
      }
    };

    if (newStatus === "in_review") {
      // Notify PMs
      (pmStaffList || []).forEach((pm) => addRecipient(pm, "Gestor de Proyecto"));
      // Notify QA specialist if assigned
      if ((task as any).qa_staff) {
        addRecipient((task as any).qa_staff, "QA");
      }
      // Notify creator if different
      if ((task as any).creator_staff) {
        addRecipient((task as any).creator_staff, "Creador");
      }
    } else if (newStatus === "done") {
      // Notify PMs
      (pmStaffList || []).forEach((pm) => addRecipient(pm, "Gestor de Proyecto"));
      // Notify creator
      if ((task as any).creator_staff) {
        addRecipient((task as any).creator_staff, "Creador");
      }
    } else if (newStatus === "blocked") {
      // Notify PMs
      (pmStaffList || []).forEach((pm) => addRecipient(pm, "Gestor de Proyecto"));
    } else if (newStatus === "in_progress" && prevStatus === "blocked") {
      // Unblocked: notify assigned staff and PMs
      (pmStaffList || []).forEach((pm) => addRecipient(pm, "Gestor de Proyecto"));
      if ((task as any).assigned_staff) {
        addRecipient((task as any).assigned_staff, "Responsable");
      }
    }

    const newLabel = TASK_STATUS_LABELS[newStatus] || newStatus;
    const oldLabel = TASK_STATUS_LABELS[prevStatus] || prevStatus;

    let icon = "🔄";
    let actionDesc = `Estado actualizado a "${newLabel}" (anterior: "${oldLabel}")`;

    if (newStatus === "in_review") {
      icon = "🔍";
      actionDesc = `Requerimiento enviado a Revisión / QA por @${currentActorStaff.first_name}`;
    } else if (newStatus === "done") {
      icon = "✅";
      actionDesc = `Tarea completada exitosamente por @${currentActorStaff.first_name}`;
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

    await logPortalTaskAuditComment(
      orgId,
      taskId,
      auditContent,
      currentActorStaff,
      explicitNames
    );
  } catch (err) {
    console.error("Error notifying stakeholders on status change:", err);
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
    can_bulk_delete_tasks?: boolean;
  };
  canBulkDeleteTasks?: boolean;
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
  availableTasks?: TaskItem[]; // Authorized workspace/project tasks for blockers and #mentions
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
  sprints?: TaskSprint[];
  activeSprint?: TaskSprint | null;
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
    .or(`content.ilike.%@${staff.first_name}%,mentions.cs.{"${staff.first_name}"}`)
    .neq("author_id", staff.id)
    .order("created_at", { ascending: false })
    .limit(30);

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

  // Fetch sprints for organization
  const { data: sprintsData } = await supabaseAdmin
    .from("task_sprints")
    .select("*")
    .eq("organization_id", staff.organization_id)
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });

  const sprintTasksBySprint: Record<string, TaskItem[]> = {};
  allTasks.forEach((t) => {
    if (t.sprint_id) {
      if (!sprintTasksBySprint[t.sprint_id]) sprintTasksBySprint[t.sprint_id] = [];
      sprintTasksBySprint[t.sprint_id].push(t);
    }
  });

  const sprints: TaskSprint[] = (sprintsData || []).map((s) => {
    const sTasks = sprintTasksBySprint[s.id] || [];
    const total_tasks = sTasks.length;
    const completed_tasks = sTasks.filter((t) => t.status === "done").length;
    const total_hours = sTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0);
    const completed_hours = sTasks
      .filter((t) => t.status === "done")
      .reduce((sum, t) => sum + (Number(t.actual_hours) || Number(t.estimated_hours) || 0), 0);
    const progress_percentage = total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0;
    return {
      ...s,
      total_tasks,
      completed_tasks,
      total_hours,
      completed_hours,
      progress_percentage
    };
  });

  const activeSprint = sprints.find((s) => s.status === "active") || null;

  const canBulkDeleteTasks =
    staff.can_bulk_delete_tasks !== null && staff.can_bulk_delete_tasks !== undefined
      ? Boolean(staff.can_bulk_delete_tasks)
      : isLeadOrPm;

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
      access_token: staff.access_token,
      can_bulk_delete_tasks: canBulkDeleteTasks,
    },
    canBulkDeleteTasks,
    organization: orgData,
    workspaces,
    projects,
    tasks: myTasks,
    allTeamTasks: isLeadOrPm || isQa ? allTasks : undefined,
    availableTasks: allTasks,
    teamMembers,
    recentMentions,
    isLeadOrPm,
    isQa,
    sprints,
    activeSprint,
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
): Promise<{ success: boolean; unblockedTasks?: TaskItem[]; error?: string }> {
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

    // Terminal Governance: Completed tasks cannot be modified by regular staff
    if (current?.status === "done" && !isLeadOrPm) {
      return {
        success: false,
        error: "Este requerimiento ya fue finalizado y está sellado. Solo un Project Manager puede reabrirlo o modificar su avance."
      };
    }

    // Backlog Governance: Collaborators cannot advance tickets that are pending PM approval in Backlog
    if (current?.status === "backlog" && !isLeadOrPm) {
      return {
        success: false,
        error: "Este requerimiento se encuentra en el Backlog y debe ser evaluado y aprobado por el Gestor de Proyecto / PM antes de registrar avances."
      };
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

    if (updateData.status && current && updateData.status !== current.status) {
      await notifyStakeholdersOnStatusChange(
        staff.organization_id,
        taskId,
        updateData.status,
        current.status as TaskStatus,
        staff
      );
    }

    let unblockedTasks: TaskItem[] = [];
    if (clamped === 100 && canCloseParentTask && current && current.status !== "done") {
      unblockedTasks = await handlePortalTaskUnblocking(taskId, current.ticket_code, current.title);
    }

    return { success: true, unblockedTasks };
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
  blockedReason?: string | null,
  loggedHours?: number,
  note?: string
): Promise<{ success: boolean; unblockedTasks?: TaskItem[]; error?: string }> {
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
      .select("checklist, progress_percentage, status, ticket_code, title, blocked_by_task_id, blocked_reason, actual_hours")
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
      .single();

    const isLeadOrPm = isStaffLeadOrPmRole(staff.role);

    // Terminal Governance: Completed tasks cannot be reopened or transitioned by regular staff
    if (current?.status === "done" && status !== current.status && !isLeadOrPm) {
      return {
        success: false,
        error: "Este requerimiento ya fue finalizado y está sellado. Solo un Project Manager / Líder puede reabrirlo o cambiar su estado."
      };
    }

    // Worklog Governance: Regular staff cannot log hours on completed tasks
    if (current?.status === "done" && loggedHours !== undefined && loggedHours > 0 && !isLeadOrPm) {
      return {
        success: false,
        error: "No se pueden imputar horas en requerimientos finalizados. Solicita autorización a tu Project Manager."
      };
    }

    // Backlog Governance: Only PM/Lead can promote a task from Backlog
    if (current?.status === "backlog" && status !== "backlog" && !isLeadOrPm) {
      return {
        success: false,
        error: "Este requerimiento se encuentra en el Backlog y debe ser aprobado por el Gestor de Proyecto / PM antes de iniciarse."
      };
    }

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

    if (loggedHours !== undefined && loggedHours > 0) {
      const prevActual = Number(current?.actual_hours) || 0;
      updateData.actual_hours = Math.round((prevActual + loggedHours) * 100) / 100;

      if (checklist.length > 0) {
        let allocated = false;
        const updatedChecklist = checklist.map((c: any) => {
          if (!allocated && c.assigned_staff_id === staff.id) {
            allocated = true;
            return {
              ...c,
              actual_hours: Math.round(((Number(c.actual_hours) || 0) + loggedHours) * 100) / 100,
            };
          }
          return c;
        });
        if (allocated) {
          updateData.checklist = updatedChecklist;
        }
      }
    }

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

    if (loggedHours !== undefined && loggedHours > 0) {
      const noteStr = note && note.trim() ? ` — "${note.trim()}"` : "";
      await logPortalTaskAuditComment(
        staff.organization_id,
        taskId,
        `⏱️ Registro de trabajo: +${loggedHours}h (Total: ${updateData.actual_hours}h)${noteStr}`,
        staff
      );
    }

    if (current && current.status !== updateData.status) {
      await notifyStakeholdersOnStatusChange(
        staff.organization_id,
        taskId,
        updateData.status,
        current.status as TaskStatus,
        staff,
        blockedReason
      );

      let unblockedTasks: TaskItem[] = [];
      if (updateData.status === "done") {
        unblockedTasks = await handlePortalTaskUnblocking(taskId, current.ticket_code, current.title);
      }
      return { success: true, unblockedTasks };
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
): Promise<{ success: boolean; checklist?: TaskChecklistItem[]; progress?: number; status?: TaskStatus; task?: TaskItem; error?: string }> {
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

    // Terminal Governance: Completed tasks deliverables cannot be modified by regular staff
    if (task.status === "done" && !isLeadOrPm) {
      throw new Error("No se pueden modificar entregables en un requerimiento finalizado. Solo el PM puede reabrirlo.");
    }

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
    } else if (progress < 100 && task.status === "in_review") {
      updateData.status = "in_progress";
    }

    const { data: updatedTask, error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
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
      const explicitNames = notifyTags.map((t) => t.replace("@", ""));
      const auditMsg = completed
        ? `☑️ Subtarea completada: ${itemTitle} por @${staff.first_name}`
        : `⬜ Subtarea reactivada: ${itemTitle} por @${staff.first_name}`;
      await logPortalTaskAuditComment(staff.organization_id, taskId, auditMsg, staff, explicitNames);
    }

    if (updateData.status && updateData.status !== task.status) {
      await notifyStakeholdersOnStatusChange(
        staff.organization_id,
        taskId,
        updateData.status,
        task.status as TaskStatus,
        staff
      );
    }

    if (progress === 100 && task.status !== "done") {
      await handlePortalTaskUnblocking(taskId, task.ticket_code, task.title);
    }

    return {
      success: true,
      checklist,
      progress,
      status: updateData.status || task.status,
      task: updatedTask ? normalizeTask(updatedTask) : undefined
    };
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
    sprintId?: string | null;
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

    // Standard Collaborator Governance:
    // 1. Forced into "backlog" (no uncontrolled scope creep in active sprints).
    // 2. Estimated hours forced to 0 (only PM can authorize contract hours).
    // 3. Due date left null (only PM can set contractual deadlines).
    // 4. Assigned staff defaults to creator or unassigned.
    // 5. QA staff defaults to unassigned.
    // 6. Subtasks can only be assigned to self or unassigned (no imposing subtasks on peers).
    const finalStatus: TaskStatus = isLeadOrPm ? (taskData.status || "todo") : "backlog";
    const finalEstimatedHours = isLeadOrPm ? Number(taskData.estimatedHours || 0) : 0;
    const finalDueDate = isLeadOrPm ? (taskData.dueDate || null) : null;
    const finalPriority: TaskPriority = taskData.priority || "medium";
    const finalAssignedStaffId = isLeadOrPm
      ? (taskData.assignedStaffId === "unassigned" ? null : taskData.assignedStaffId || null)
      : (taskData.assignedStaffId === "unassigned" ? null : taskData.assignedStaffId || staff.id);
    const finalQaStaffId = isLeadOrPm
      ? (taskData.qaStaffId === "unassigned" ? null : taskData.qaStaffId || null)
      : null;

    const finalChecklist = (taskData.checklist || []).map((item) => ({
      ...item,
      assigned_staff_id: isLeadOrPm
        ? (item.assigned_staff_id === "unassigned" ? null : item.assigned_staff_id || null)
        : (item.assigned_staff_id === staff.id ? staff.id : null),
      estimated_hours: isLeadOrPm ? item.estimated_hours : null,
    }));

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
        status: finalStatus,
        priority: finalPriority,
        type: taskData.type || "task",
        progress_percentage: 0,
        assigned_staff_id: finalAssignedStaffId,
        qa_staff_id: finalQaStaffId,
        due_date: finalDueDate,
        created_by_staff_id: staff.id,
        estimated_hours: finalEstimatedHours,
        checklist: finalChecklist,
        tags: taskData.tags || [],
        attachments: taskData.attachments || [],
        order_index: 0,
        sprint_id: taskData.sprintId && taskData.sprintId !== "none" ? taskData.sprintId : null,
        blocked_by_task_id: taskData.blockedByTaskId || null,
        is_recurring: isLeadOrPm ? (taskData.isRecurring ?? false) : false,
        recurrence_interval: isLeadOrPm ? (taskData.recurrenceInterval || null) : null,
        recurrence_day: isLeadOrPm ? (taskData.recurrenceDay || 1) : 1,
        next_recurrence_at: isLeadOrPm && taskData.isRecurring && taskData.recurrenceInterval ? calculateNextRecurrence(taskData.recurrenceInterval, new Date(), taskData.recurrenceDay || 1).toISOString() : null
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

    if (!isLeadOrPm) {
      // Find PMs/Leads in this organization to tag and notify them directly
      const { data: pms } = await supabaseAdmin
        .from("organization_staff")
        .select("id, first_name, last_name")
        .eq("organization_id", staff.organization_id)
        .eq("is_active", true)
        .or("role.ilike.%gestor%,role.ilike.%pm%,role.ilike.%lead%,role.ilike.%lider%,role.ilike.%líder%,role.ilike.%manager%,role.ilike.%project%");

      const pmNames = (pms || []).map((p) => p.first_name);
      const pmMentions = pmNames.map((name) => `@${name}`).join(" ");

      await logPortalTaskAuditComment(
        staff.organization_id,
        newTask.id,
        `📋 Nueva solicitud de requerimiento registrada por ${staff.first_name} ${staff.last_name} en el Backlog. Requiere revisión y aprobación de ${pmMentions || "@Gestor de Proyecto"}.`,
        staff,
        pmNames.length > 0 ? pmNames : undefined
      );
    }

    // Log audit notes for assignments upon creation
    if (finalAssignedStaffId) {
      const { data: mainStaff } = await supabaseAdmin
        .from("organization_staff")
        .select("first_name, last_name")
        .eq("id", finalAssignedStaffId)
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

    if (finalChecklist && Array.isArray(finalChecklist)) {
      for (const item of finalChecklist) {
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
 * Update checklist item hours from portal (worklog directly on subtask)
 */
export async function portalUpdateChecklistItemHours(
  token: string,
  taskId: string,
  checklistItemId: string,
  hours: { estimated_hours?: number | null; actual_hours?: number | null }
): Promise<{ success: boolean; checklist?: TaskChecklistItem[]; task?: TaskItem; error?: string }> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("organization_staff")
      .select("id, role, first_name, last_name, organization_id")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) throw new Error("Acceso no autorizado");

    const isLeadOrPm = isStaffLeadOrPmRole(staff.role);

    const { data: task, error: fetchErr } = await supabaseAdmin
      .from("task_items")
      .select("checklist, organization_id, estimated_hours, actual_hours, assigned_staff_id, ticket_code")
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
      .single();

    if (fetchErr || !task) throw fetchErr || new Error("Tarea no encontrada");

    const prevChecklist = parseTaskChecklist(task.checklist);
    const targetItem = prevChecklist.find((i) => i.id === checklistItemId);
    if (!targetItem) throw new Error("Subtarea no encontrada");

    const isOwner = targetItem.assigned_staff_id === staff.id || task.assigned_staff_id === staff.id;
    if (!isLeadOrPm && !isOwner) {
      throw new Error("No tienes permiso para registrar horas en subtareas de otros compañeros.");
    }

    const checklist: TaskChecklistItem[] = prevChecklist.map((item: TaskChecklistItem) => {
      if (item.id === checklistItemId) {
        return {
          ...item,
          ...(isLeadOrPm && hours.estimated_hours !== undefined ? { estimated_hours: hours.estimated_hours } : {}),
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

    if (isLeadOrPm && totalSubEstimated > 0) {
      updateData.estimated_hours = totalSubEstimated;
    }
    if (totalSubActual > 0) {
      updateData.actual_hours = totalSubActual;
    }

    const { data: updatedTask, error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update(updateData)
      .eq("id", taskId)
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

    if (updateErr) throw updateErr;

    if (hours.actual_hours !== undefined && hours.actual_hours !== targetItem.actual_hours) {
      await logPortalTaskAuditComment(
        staff.organization_id,
        taskId,
        `⏱️ Subtarea "${targetItem.title}": horas registradas ajustadas a ${hours.actual_hours}h por ${staff.first_name} ${staff.last_name}`,
        staff
      );
    }

    return { success: true, checklist, task: normalizeTask(updatedTask) };
  } catch (err: any) {
    console.error("Portal update checklist item hours error:", err);
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
    loggedHours?: number;
    note?: string;
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
    sprintId?: string | null;
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
        status, priority, due_date, assigned_staff_id, created_by_staff_id, blocked_by_task_id, blocked_reason, ticket_code, title, checklist, sprint_id, actual_hours, progress_percentage,
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(id, first_name),
        creator_staff:organization_staff!task_items_created_by_staff_id_fkey(id, first_name)
      `)
      .eq("id", taskId)
      .eq("organization_id", staff.organization_id)
      .maybeSingle();

    const isMainAssignee = prevTask?.assigned_staff_id === staff.id;
    const canCloseParentTask = isLeadOrPm || isMainAssignee;

    // Terminal Governance: Completed tasks cannot be reopened or altered by regular staff
    if (prevTask?.status === "done" && !isLeadOrPm) {
      if (data.status && data.status !== prevTask.status) {
        throw new Error("Este requerimiento ya fue finalizado y está sellado. Solo un Project Manager / Líder puede reabrirlo o cambiar su estado.");
      }
      if (data.loggedHours !== undefined && data.loggedHours > 0) {
        throw new Error("No se pueden imputar horas en requerimientos finalizados. Solicita autorización a tu Project Manager.");
      }
      if (data.progressPercentage !== undefined && data.progressPercentage !== prevTask.progress_percentage) {
        throw new Error("No se puede alterar el avance de un requerimiento finalizado.");
      }
    }

    // Backlog Governance: Only PM/Lead can promote or move a task out of Backlog, or adjust progress on it
    if (prevTask?.status === "backlog" && !isLeadOrPm) {
      if (data.status && data.status !== "backlog") {
        throw new Error("Este requerimiento se encuentra en el Backlog y debe ser aprobado por el Gestor de Proyecto / PM antes de iniciarse.");
      }
      if (data.progressPercentage !== undefined && data.progressPercentage > 0) {
        throw new Error("No se puede registrar avance en un requerimiento en Backlog hasta que sea aprobado por el PM.");
      }
    }

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
      if (data.sprintId !== undefined) {
        updateData.sprint_id = data.sprintId === "none" || !data.sprintId ? null : data.sprintId;
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

      // Status change audit and stakeholder notification
      if (updateData.status && updateData.status !== prevTask.status) {
        await notifyStakeholdersOnStatusChange(
          orgId,
          taskId,
          updateData.status,
          prevTask.status as TaskStatus,
          staff,
          updateData.blocked_reason || prevTask.blocked_reason
        );

        if (updateData.status === "done") {
          await handlePortalTaskUnblocking(taskId, prevTask.ticket_code, prevTask.title);
        }
      }

      // Work hours logged audit
      if (data.loggedHours !== undefined && data.loggedHours > 0) {
        const noteStr = data.note && data.note.trim() ? ` — "${data.note.trim()}"` : "";
        await logPortalTaskAuditComment(
          orgId,
          taskId,
          `⏱️ Registro de trabajo: +${data.loggedHours}h (Total: ${updateData.actual_hours ?? prevTask.actual_hours ?? 0}h)${noteStr}`,
          staff
        );
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

      // Sprint assignment audit
      if (updateData.sprint_id !== undefined && updateData.sprint_id !== prevTask.sprint_id) {
        if (updateData.sprint_id) {
          const { data: sprintRecord } = await supabaseAdmin
            .from("task_sprints")
            .select("name")
            .eq("id", updateData.sprint_id)
            .maybeSingle();
          const sprintName = sprintRecord?.name || "Sprint";
          await logPortalTaskAuditComment(orgId, taskId, `🎯 Asignada al ${sprintName}`, staff);
        } else {
          await logPortalTaskAuditComment(orgId, taskId, `📦 Retirada del sprint al Backlog`, staff);
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
        const notifyStaffNames: string[] = [];
        if (assignedFirstName && prevTask.assigned_staff_id !== staff.id) {
          notifyStaffNames.push(assignedFirstName);
        }
        if (creatorFirstName && creatorFirstName !== assignedFirstName && prevTask.created_by_staff_id !== staff.id) {
          notifyStaffNames.push(creatorFirstName);
        }

        for (const item of newChecklist) {
          const prevItem = prevChecklist.find((p) => p.id === item.id);
          const itemTitle = item.title ? `"${item.title}"` : "subtarea";

          // 1. Completion / Reactivation detection
          if (prevItem && !prevItem.completed && item.completed) {
            await logPortalTaskAuditComment(
              orgId,
              taskId,
              `☑️ Subtarea completada: ${itemTitle} por @${staff.first_name}`,
              staff,
              notifyStaffNames
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

    const isLeadOrPm = isStaffLeadOrPmRole(staff.role);
    if (!isLeadOrPm) {
      throw new Error("Solo un Líder o Project Manager puede reasignar subtareas a otros colaboradores.");
    }

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

/**
 * Bulk delete tasks from collaborator portal if staff has can_bulk_delete_tasks permission
 */
export async function portalBulkDeleteTasks(
  token: string,
  taskIds: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    if (!token || !Array.isArray(taskIds) || taskIds.length === 0) {
      return { success: true, count: 0 };
    }

    // 1. Verify staff by token
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("organization_staff")
      .select("id, organization_id, role, can_bulk_delete_tasks")
      .eq("access_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (staffErr || !staff) {
      return { success: false, error: "Colaborador no autorizado" };
    }

    const isLead = isStaffLeadOrPmRole(staff.role);
    const hasPermission =
      staff.can_bulk_delete_tasks !== null && staff.can_bulk_delete_tasks !== undefined
        ? Boolean(staff.can_bulk_delete_tasks)
        : isLead;

    if (!hasPermission) {
      return { success: false, error: "No tienes permiso para eliminar tareas en masa" };
    }

    // 2. Delete tasks in chunks of 100
    const CHUNK_SIZE = 100;
    let totalDeleted = 0;

    for (let i = 0; i < taskIds.length; i += CHUNK_SIZE) {
      const chunk = taskIds.slice(i, i + CHUNK_SIZE);
      const { error: delErr, count } = await supabaseAdmin
        .from("task_items")
        .delete({ count: "exact" })
        .eq("organization_id", staff.organization_id)
        .in("id", chunk);

      if (delErr) throw delErr;
      totalDeleted += count ?? chunk.length;
    }

    return { success: true, count: totalDeleted };
  } catch (err: any) {
    console.error("Portal bulk delete tasks error:", err);
    return { success: false, error: err.message };
  }
}


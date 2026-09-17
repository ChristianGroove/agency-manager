export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'task' | 'feature' | 'bug' | 'improvement' | 'delivery';
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type CollaboratorRole = 'pm' | 'qa_lead' | 'developer' | 'designer' | 'specialist' | 'observer' | 'sales' | 'operations' | 'support' | 'consultant';

export type RecurrenceInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual' | 'yearly';

export type TaskChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  target_week?: 1 | 2 | 3 | 4 | null;
  due_date?: string | null;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  created_at?: string;
}

export interface TaskWorkspace {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  key_prefix: string;
  description?: string | null;
  color: string;
  icon: string;
  lead_staff_id?: string | null;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Computed / Joined
  lead_staff?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    role?: string;
  } | null;
  project_count?: number;
  task_count?: number;
}

export interface TaskProject {
  id: string;
  organization_id: string;
  workspace_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  color: string;
  icon: string;
  status: ProjectStatus;
  lead_staff_id?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Computed / Joined
  workspace?: TaskWorkspace | null;
  lead_staff?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    role?: string;
  } | null;
  task_count?: number;
  completed_count?: number;
  progress_percentage?: number;
}

export type TaskReviewStage = 'none' | 'qa_failed' | 'uat' | 'vendor_blocked' | 'ready_for_release';

export interface SystemStageTagConfig {
  tag: string;
  label: string;
  shortLabel: string;
  color: string;
  badgeClass: string;
  icon: string;
}

export const SYSTEM_STAGE_TAGS: Record<string, SystemStageTagConfig> = {
  'qa-failed': {
    tag: 'qa-failed',
    label: 'QA: Rechazado / Erróneo',
    shortLabel: 'QA Erróneo',
    color: 'red',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    icon: 'AlertTriangle'
  },
  'uat': {
    tag: 'uat',
    label: 'Pruebas de Usuario (UAT)',
    shortLabel: 'UAT',
    color: 'purple',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    icon: 'UserCheck'
  },
  'vendor-blocked': {
    tag: 'vendor-blocked',
    label: 'Espera Proveedor / Bloqueada',
    shortLabel: 'Espera Proveedor',
    color: 'amber',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: 'Clock'
  },
  'ready-for-release': {
    tag: 'ready-for-release',
    label: 'Aprobado para Release',
    shortLabel: 'Listo Release',
    color: 'emerald',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: 'CheckCircle2'
  }
};

export interface TenantTaskTag {
  id: string;            // slug/key único
  name: string;          // nombre de la etiqueta
  label: string;         // etiqueta visible
  color: string;         // 'blue' | 'emerald' | 'purple' | 'amber' | 'red' | 'indigo' | 'rose' | 'cyan' | 'slate'
  is_favorite: boolean;  // si es favorita para predominar arriba en la lista
  created_at?: string;
  created_by?: string;
}

export const DEFAULT_TENANT_TASK_TAGS: TenantTaskTag[] = [
  // Favoritas Predeterminadas (predominan arriba en el selector)
  { id: "qa-failed", name: "qa-failed", label: "QA: Rechazado", color: "red", is_favorite: true },
  { id: "uat", name: "uat", label: "Pruebas UAT", color: "purple", is_favorite: true },
  { id: "vendor-blocked", name: "vendor-blocked", label: "Bloqueo Proveedor", color: "amber", is_favorite: true },
  { id: "ready-for-release", name: "ready-for-release", label: "Listo para Release", color: "emerald", is_favorite: true },
  { id: "bug", name: "bug", label: "Bug / Incidencia", color: "red", is_favorite: true },
  { id: "urgente", name: "urgente", label: "Urgente", color: "amber", is_favorite: true },
  { id: "frontend", name: "frontend", label: "Frontend", color: "blue", is_favorite: true },
  { id: "backend", name: "backend", label: "Backend", color: "indigo", is_favorite: true },
  // Otras Disponibles
  { id: "api", name: "api", label: "API REST", color: "cyan", is_favorite: false },
  { id: "diseño", name: "diseño", label: "Diseño UI/UX", color: "rose", is_favorite: false },
  { id: "database", name: "database", label: "Base de Datos", color: "emerald", is_favorite: false },
  { id: "seguridad", name: "seguridad", label: "Seguridad", color: "purple", is_favorite: false },
];

export const RECURRENCE_INTERVAL_LABELS: Record<RecurrenceInterval, string> = {
  daily: 'Diaria (Cada día)',
  weekly: 'Semanal (Cada semana)',
  biweekly: 'Quincenal (Cada 15 días)',
  monthly: 'Mensual (Cada mes)',
  quarterly: 'Trimestral (Cada 3 meses)',
  biannual: 'Semestral (Cada 6 meses)',
  yearly: 'Anual (Cada año)',
};

export interface TaskItem {
  id: string;
  organization_id: string;
  project_id: string;
  ticket_code: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  progress_percentage: number;
  assigned_staff_id?: string | null;
  created_by_staff_id?: string | null;
  qa_staff_id?: string | null;
  due_date?: string | null;
  estimated_hours: number;
  actual_hours: number;
  checklist: TaskChecklistItem[];
  tags: string[];
  attachments: TaskAttachment[];
  order_index: number;
  // Recurrence Engine
  is_recurring?: boolean;
  recurrence_interval?: RecurrenceInterval | null;
  recurrence_day?: number | null;
  parent_recurring_id?: string | null;
  last_recurred_at?: string | null;
  next_recurrence_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_staff?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    role?: string;
    email?: string;
  } | null;
  qa_staff?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    role?: string;
  } | null;
  project?: {
    id: string;
    name: string;
    color: string;
  } | null;
  comments_count?: number;
}

export interface TaskComment {
  id: string;
  organization_id: string;
  task_id: string;
  author_type: 'staff' | 'owner' | 'system';
  author_id: string;
  author_name: string;
  author_avatar?: string | null;
  content: string;
  mentions: string[];
  created_at: string;
}

export interface TaskCollaborator {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  task_role?: CollaboratorRole;
  access_token: string;
  is_active: boolean;
  photo_url?: string | null;
  portal_url?: string;
  has_global_workspace_access?: boolean;
  workspace_ids?: string[];
  assigned_tasks_count?: number;
  completed_tasks_count?: number;
}

export interface TaskWorkspaceMember {
  id: string;
  organization_id: string;
  workspace_id: string;
  staff_id: string;
  role: 'lead' | 'member';
  created_at: string;
}

export interface TaskProjectMember {
  id: string;
  organization_id: string;
  project_id: string;
  staff_id: string;
  role: CollaboratorRole;
  created_at: string;
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    email?: string | null;
    role?: string;
  };
}

export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  inReviewTasks: number;
  blockedTasks: number;
  todoTasks: number;
  completionRate: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  tasksByPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  collaboratorWorkload: {
    staffId: string;
    name: string;
    avatar?: string | null;
    role: string;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    hours: number;
  }[];
}

/**
 * Safely parse and normalize checklist field (handles stringified JSON, null, undefined)
 */
export function parseTaskChecklist(rawChecklist: any): TaskChecklistItem[] {
  if (!rawChecklist) return [];
  if (Array.isArray(rawChecklist)) return rawChecklist;
  if (typeof rawChecklist === 'string') {
    try {
      const parsed = JSON.parse(rawChecklist);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Normalize all dynamic JSON fields of a TaskItem
 */
export function normalizeTask(task: any): TaskItem {
  return {
    ...task,
    checklist: parseTaskChecklist(task.checklist),
    tags: Array.isArray(task.tags) ? task.tags : [],
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
    progress_percentage: Number(task.progress_percentage || 0),
    estimated_hours: Number(task.estimated_hours || 0),
    actual_hours: Number(task.actual_hours || 0),
  };
}

/**
 * Safely infer CollaboratorRole enum from arbitrary job role strings
 */
export function inferTaskRole(role?: string | null): CollaboratorRole {
  if (!role) return "developer";
  const r = role.toLowerCase();
  if (
    r.includes("pm") ||
    r.includes("project") ||
    r.includes("gestor") ||
    r.includes("gestora") ||
    r.includes("gerente") ||
    r.includes("manager") ||
    r.includes("coordinad") ||
    r.includes("lider") ||
    r.includes("líder") ||
    r.includes("director") ||
    r.includes("directora")
  ) {
    return "pm";
  }
  if (r.includes("qa") || r.includes("test") || r.includes("calidad") || r.includes("revisor") || r.includes("pruebas")) {
    return "qa_lead";
  }
  if (r.includes("design") || r.includes("ux") || r.includes("ui") || r.includes("diseñ") || r.includes("creativ")) {
    return "designer";
  }
  if (r.includes("dev") || r.includes("desarroll") || r.includes("program") || r.includes("front") || r.includes("back") || r.includes("full")) {
    return "developer";
  }
  if (r.includes("vent") || r.includes("sales") || r.includes("comercial")) {
    return "sales";
  }
  if (r.includes("operac") || r.includes("logistic")) {
    return "operations";
  }
  if (r.includes("soport") || r.includes("support") || r.includes("atenci")) {
    return "support";
  }
  if (r.includes("consult") || r.includes("asesor")) {
    return "consultant";
  }
  if (r.includes("observ")) {
    return "observer";
  }
  return "specialist";
}

export interface WeeklyPacingSummary {
  week: 1 | 2 | 3 | 4;
  label: string;
  dateRange: string;
  progress: number;
  totalDeliverables: number;
  completedDeliverables: number;
  status: 'completed' | 'on_track' | 'at_risk' | 'delayed' | 'pending';
  hasSchedule: boolean;
}

/**
 * Calculates 4-week fractional progress and pacing health status for a task
 * Respects real calendar time, delivery dates, and weekly checklist commitments.
 * Avoids artificial future progression and false past delays.
 */
export function getTaskWeeklyPacing(
  task: TaskItem,
  viewDate: Date = new Date(),
  realToday: Date = new Date()
): WeeklyPacingSummary[] {
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const todayYear = realToday.getFullYear();
  const todayMonth = realToday.getMonth();
  const todayDay = realToday.getDate();

  const isCurrentMonth = viewYear === todayYear && viewMonth === todayMonth;
  const isPastMonth = viewYear < todayYear || (viewYear === todayYear && viewMonth < todayMonth);
  const isFutureMonth = viewYear > todayYear || (viewYear === todayYear && viewMonth > todayMonth);

  // Active week of the month (only exists when viewing the actual current month)
  const activeMonthWeek: 1 | 2 | 3 | 4 | null = isCurrentMonth
    ? todayDay <= 7
      ? 1
      : todayDay <= 14
      ? 2
      : todayDay <= 21
      ? 3
      : 4
    : null;

  const checklist = parseTaskChecklist(task.checklist);
  const hasTargetWeeks = checklist.some((c) => c.target_week && c.target_week >= 1 && c.target_week <= 4);

  const globalProg = task.progress_percentage || 0;
  const isTaskDone = task.status === 'done' || globalProg === 100;
  const isBlocked = task.status === 'blocked';

  // Parse due date if present to determine if a week is overdue
  let dueWeek: number | null = null;
  let isDueInPastMonth = false;

  if (task.due_date) {
    const due = new Date(task.due_date);
    if (!isNaN(due.getTime())) {
      const dueYear = due.getFullYear();
      const dueMonth = due.getMonth();
      const dueDay = due.getDate();

      if (dueYear < viewYear || (dueYear === viewYear && dueMonth < viewMonth)) {
        isDueInPastMonth = true;
      } else if (dueYear === viewYear && dueMonth === viewMonth) {
        dueWeek = dueDay <= 7 ? 1 : dueDay <= 14 ? 2 : dueDay <= 21 ? 3 : 4;
      }
    }
  }

  const weeks: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  const dateRanges = [
    'Días 1 - 7',
    'Días 8 - 14',
    'Días 15 - 21',
    'Días 22 - Fin',
  ];

  return weeks.map((w, idx) => {
    // Determine time status of week w
    let isPastWeek = false;
    let isCurrentWeek = false;
    let isFutureWeek = false;

    if (isPastMonth) {
      isPastWeek = true;
    } else if (isFutureMonth) {
      isFutureWeek = true;
    } else {
      // Current month
      if (activeMonthWeek !== null) {
        if (w < activeMonthWeek) isPastWeek = true;
        else if (w === activeMonthWeek) isCurrentWeek = true;
        else isFutureWeek = true;
      }
    }

    let progress = 0;
    let totalItems = 0;
    let doneItems = 0;
    let hasSchedule = false;
    let status: 'completed' | 'on_track' | 'at_risk' | 'delayed' | 'pending' = 'pending';

    // If task is globally completed, all weeks reflect complete status
    if (isTaskDone) {
      return {
        week: w,
        label: `Semana ${w}`,
        dateRange: dateRanges[idx],
        progress: 100,
        totalDeliverables: 0,
        completedDeliverables: 0,
        status: 'completed',
        hasSchedule: true,
      };
    }

    if (hasTargetWeeks) {
      // CASE 1: Task has explicit checklist deliverables per week
      const itemsInWeek = checklist.filter((c) => c.target_week === w);
      totalItems = itemsInWeek.length;
      doneItems = itemsInWeek.filter((c) => c.completed).length;
      hasSchedule = totalItems > 0;
      progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

      if (!hasSchedule) {
        // No deliverables planned for this week -> Not a delay!
        status = 'pending';
      } else if (doneItems === totalItems) {
        status = 'completed';
      } else if (isBlocked) {
        status = 'delayed';
      } else if (isPastWeek) {
        // Had deliverables in a past week and failed to complete them -> True delay!
        status = 'delayed';
      } else if (isCurrentWeek) {
        // Current week with deliverables in progress
        if (progress >= 50) {
          status = 'on_track';
        } else {
          status = 'at_risk';
        }
      } else {
        // Future week
        status = progress > 0 ? 'on_track' : 'pending';
      }
    } else {
      // CASE 2: Standard task WITHOUT target_week checklist (Global progress & dates)
      if (isPastWeek) {
        // In past weeks: only marked delayed if blocked or due_date expired on/before this week
        const isPastDue = isDueInPastMonth || (dueWeek !== null && dueWeek <= w);

        if (isBlocked || isPastDue) {
          status = 'delayed';
          progress = globalProg;
          hasSchedule = true;
        } else if (globalProg > 0) {
          // If task has reached progress today, earlier weeks were successfully worked
          status = 'completed';
          progress = 100;
          hasSchedule = true;
        } else {
          // 0% progress and not past due -> Scheduled/Plan, NOT a delay!
          status = 'pending';
          progress = 0;
          hasSchedule = false;
        }
      } else if (isCurrentWeek) {
        // Current active week: reflects current global progress
        progress = globalProg;
        hasSchedule = true;

        if (isBlocked) {
          status = 'delayed';
        } else if (progress >= 70) {
          status = 'on_track';
        } else if (progress >= 20) {
          status = 'on_track';
        } else if (dueWeek !== null && dueWeek <= w) {
          // Due this week or overdue with low progress
          status = 'at_risk';
        } else if (progress > 0) {
          status = 'on_track';
        } else {
          // 0% progress
          status = 'pending';
        }
      } else {
        // Future week: cannot have arbitrary progress allocated!
        progress = 0;
        status = 'pending';
        hasSchedule = false;
      }
    }

    return {
      week: w,
      label: `Semana ${w}`,
      dateRange: dateRanges[idx],
      progress,
      totalDeliverables: totalItems,
      completedDeliverables: doneItems,
      status,
      hasSchedule,
    };
  });
}

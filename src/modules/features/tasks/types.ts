export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'Por Hacer',
  in_progress: 'En Curso',
  in_review: 'En QA',
  done: 'Completada',
  blocked: 'Bloqueada',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};
export type TaskType = 'task' | 'feature' | 'bug' | 'improvement' | 'delivery' | 'meeting';

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  task: 'Tarea',
  feature: 'Funcionalidad',
  bug: 'Error / Bug',
  improvement: 'Mejora',
  delivery: 'Entrega de Cliente',
  meeting: 'Reunión',
};

export type TaskMeetingModality = 'virtual' | 'in_person' | 'hybrid';

export type TaskMeetingAttendanceStatus = 'pending' | 'attended' | 'excused' | 'absent';

export type TaskMeetingCheckinMethod = 'link_click' | 'manual_checkin' | 'pm_verified';

export interface TaskMeetingAttendee {
  staff_id: string;
  status: TaskMeetingAttendanceStatus;
  attended_at?: string | null;
  check_in_method?: TaskMeetingCheckinMethod | null;
  hours_allocated: number;
  notes?: string | null;
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    role?: string;
    email?: string;
  } | null;
}

export interface MeetingPreset {
  id: 'daily_standup' | 'sprint_planning' | 'sync_alignment';
  label: string;
  description: string;
  defaultTitle: string;
  durationMinutes: number;
  modality: TaskMeetingModality;
  recurrenceInterval?: RecurrenceInterval | null;
  recurrenceDays?: number[] | null;
}

export const MEETING_PRESETS: MeetingPreset[] = [
  {
    id: 'daily_standup',
    label: 'Daily Standup',
    description: 'Sincronización diaria ágil (15 min, Lun - Vie)',
    defaultTitle: 'Daily Standup',
    durationMinutes: 15,
    modality: 'virtual',
    recurrenceInterval: 'weekly',
    recurrenceDays: [1, 2, 3, 4, 5],
  },
  {
    id: 'sprint_planning',
    label: 'Sprint Planning / Review',
    description: 'Planificación o retrospectiva de ciclo (60 min)',
    defaultTitle: 'Sprint Planning & Review',
    durationMinutes: 60,
    modality: 'virtual',
    recurrenceInterval: 'biweekly',
    recurrenceDays: [1],
  },
  {
    id: 'sync_alignment',
    label: 'Sync de Alineación / 1-on-1',
    description: 'Alineación de objetivos y dudas (30 min)',
    defaultTitle: 'Sync de Alineación',
    durationMinutes: 30,
    modality: 'hybrid',
    recurrenceInterval: 'weekly',
    recurrenceDays: [3],
  },
];

/**
 * Attendance window validation:
 * - Opens 5 minutes before meeting_start_at
 * - Closes 15 minutes after meeting scheduled end (start_at + duration + 15m)
 * Prevents post-meeting unattended auto-checkins while allowing PM overrides
 */
export function getMeetingAttendanceWindowStatus(
  startAt?: string | null,
  durationMinutes: number = 30,
  now: Date = new Date()
): {
  isOpen: boolean;
  isBefore: boolean;
  isAfter: boolean;
  windowStart: Date | null;
  windowEnd: Date | null;
  minutesUntilOpen: number;
  message: string;
} {
  if (!startAt) {
    return {
      isOpen: true,
      isBefore: false,
      isAfter: false,
      windowStart: null,
      windowEnd: null,
      minutesUntilOpen: 0,
      message: 'Horario flexible / sin ventana restrictiva',
    };
  }

  const start = new Date(startAt);
  if (isNaN(start.getTime())) {
    return {
      isOpen: true,
      isBefore: false,
      isAfter: false,
      windowStart: null,
      windowEnd: null,
      minutesUntilOpen: 0,
      message: 'Horario flexible',
    };
  }

  const windowStart = new Date(start.getTime() - 5 * 60 * 1000);
  const windowEnd = new Date(start.getTime() + (durationMinutes + 15) * 60 * 1000);
  const nowTime = now.getTime();

  if (nowTime < windowStart.getTime()) {
    const minutesUntilOpen = Math.max(1, Math.ceil((windowStart.getTime() - nowTime) / (60 * 1000)));
    return {
      isOpen: false,
      isBefore: true,
      isAfter: false,
      windowStart,
      windowEnd,
      minutesUntilOpen,
      message: `La ventana de asistencia abre 5 min antes del inicio programado (en ${minutesUntilOpen} min).`,
    };
  }

  if (nowTime > windowEnd.getTime()) {
    return {
      isOpen: false,
      isBefore: false,
      isAfter: true,
      windowStart,
      windowEnd,
      minutesUntilOpen: 0,
      message: 'Ventana de auto-registro cerrada. Solicita al PM certificar tu presencia.',
    };
  }

  return {
    isOpen: true,
    isBefore: false,
    isAfter: false,
    windowStart,
    windowEnd,
    minutesUntilOpen: 0,
    message: 'Ventana de asistencia activa',
  };
}

/**
 * Ensures a meeting or external URL starts with http:// or https://,
 * fixing issues with relative URL navigation and accidental comma typos like 'www,pixy.com.co'.
 */
export function ensureAbsoluteUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  const sanitized = trimmed.replace(/^www,/i, 'www.');
  if (/^https?:\/\//i.test(sanitized)) {
    return sanitized;
  }
  return `https://${sanitized}`;
}

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
  assigned_staff_id?: string | null;
  assigned_staff?: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    role?: string;
  } | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
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
  parallel_team_enabled?: boolean;
  support_config?: Record<string, any>;
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

export type TaskSprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export interface TaskSprint {
  id: string;
  organization_id: string;
  workspace_id?: string | null;
  project_id?: string | null;
  name: string;
  goal?: string | null;
  start_date: string;
  end_date: string;
  status: TaskSprintStatus;
  auto_rollover: boolean;
  duration_days: number;
  created_by_staff_id?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  // Computed / Joined
  total_tasks?: number;
  completed_tasks?: number;
  total_hours?: number;
  completed_hours?: number;
  progress_percentage?: number;
  workspace?: TaskWorkspace | null;
  project?: TaskProject | null;
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
    label: 'QA Rechazado',
    shortLabel: 'QA Rechazado',
    color: 'red',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    icon: 'AlertTriangle'
  },
  'uat': {
    tag: 'uat',
    label: 'Pruebas UAT',
    shortLabel: 'Pruebas UAT',
    color: 'purple',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    icon: 'UserCheck'
  },
  'vendor-blocked': {
    tag: 'vendor-blocked',
    label: 'Bloqueo Proveedor',
    shortLabel: 'Bloqueo Proveedor',
    color: 'amber',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: 'Clock'
  },
  'ready-for-release': {
    tag: 'ready-for-release',
    label: 'Listo para Release',
    shortLabel: 'Listo para Release',
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
  { id: "qa-failed", name: "qa-failed", label: "QA Rechazado", color: "red", is_favorite: true },
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
  weekly_snapshots?: {
    s1?: number | null;
    s2?: number | null;
    s3?: number | null;
    s4?: number | null;
  } | null;
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
  last_comment_at?: string | null;
  last_comment_author_id?: string | null;
  // Sprint Association
  sprint_id?: string | null;
  sprint?: TaskSprint | null;
  // Blocker Dependency
  blocked_by_task_id?: string | null;
  blocked_by?: {
    id: string;
    ticket_code: string;
    title: string;
    status: TaskStatus;
  } | null;
  blocked_reason?: string | null;
  // Parallel Teams & Support Channel
  origin_type?: 'internal' | 'support';
  promoted_from_id?: string | null;
  promoted_from?: {
    id: string;
    ticket_code: string;
    title: string;
  } | null;
  // Synchronous Activities / Meetings
  meeting_modality?: TaskMeetingModality | null;
  meeting_url?: string | null;
  meeting_location?: string | null;
  meeting_start_at?: string | null;
  meeting_duration_minutes?: number | null;
  meeting_attendees?: TaskMeetingAttendee[];
  recurrence_days?: number[] | null;
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

export interface TaskProgressAuditSummary {
  taskId: string;
  authorName: string;
  authorAvatar?: string | null;
  fromProgress: number;
  toProgress: number;
  isRegression: boolean;
  createdAt: string;
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
  can_bulk_delete_tasks?: boolean;
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
  let list: any[] = [];
  if (Array.isArray(rawChecklist)) {
    list = rawChecklist;
  } else if (typeof rawChecklist === 'string') {
    try {
      const parsed = JSON.parse(rawChecklist);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }
  return list.map((item) => ({
    ...item,
    estimated_hours: item.estimated_hours !== undefined && item.estimated_hours !== null ? Number(item.estimated_hours) : null,
    actual_hours: item.actual_hours !== undefined && item.actual_hours !== null ? Number(item.actual_hours) : null,
  }));
}

/**
 * Normalize all dynamic JSON fields of a TaskItem
 */
export function normalizeTask(task: any): TaskItem {
  let isMeetingExpired = false;
  if (task.type === "meeting" && task.meeting_start_at) {
    const startMs = new Date(task.meeting_start_at).getTime();
    if (!isNaN(startMs)) {
      const durationMinutes = task.meeting_duration_minutes !== undefined && task.meeting_duration_minutes !== null
        ? Number(task.meeting_duration_minutes)
        : 30;
      isMeetingExpired = Date.now() > (startMs + durationMinutes * 60 * 1000);
    }
  }
  const isDone = task.status === "done" || isMeetingExpired;
  return {
    ...task,
    status: isDone ? "done" : task.status,
    origin_type: task.origin_type || "internal",
    promoted_from_id: task.promoted_from_id || null,
    checklist: parseTaskChecklist(task.checklist),
    tags: Array.isArray(task.tags) ? task.tags : [],
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
    progress_percentage: isDone ? 100 : Number(task.progress_percentage || 0),
    estimated_hours: Number(task.estimated_hours || 0),
    actual_hours: Number(task.actual_hours || 0),
    weekly_snapshots: task.weekly_snapshots && typeof task.weekly_snapshots === "object" ? task.weekly_snapshots : {},
    meeting_modality: task.meeting_modality || (task.type === "meeting" ? "virtual" : null),
    meeting_url: task.meeting_url || null,
    meeting_location: task.meeting_location || null,
    meeting_start_at: task.meeting_start_at || null,
    meeting_duration_minutes: task.meeting_duration_minutes !== undefined && task.meeting_duration_minutes !== null ? Number(task.meeting_duration_minutes) : (task.type === "meeting" ? 30 : null),
    meeting_attendees: Array.isArray(task.meeting_attendees) ? task.meeting_attendees : [],
    recurrence_days: Array.isArray(task.recurrence_days) ? task.recurrence_days : null,
  };
}

/**
 * Safely compute hours attributed to a specific staff member in a task.
 * Avoids multi-collaborator duplication:
 * - If the task has subtasks with assigned members, computes only the subtasks assigned to memberId.
 * - If the member is the primary assignee and has no subtasks assigned to others, or no subtasks exist, computes task-level hours.
 */
export function getTaskMemberHours(task: TaskItem, memberId: string): { estimated: number; actual: number } {
  // Synchronous Activities / Meetings: Multi-attendee allocation without subtask requirement
  if (task.type === 'meeting') {
    const attendees = Array.isArray(task.meeting_attendees) ? task.meeting_attendees : [];
    const attendee = attendees.find((a) => a.staff_id === memberId);
    const meetingEstHours = Number(task.estimated_hours) || (Number(task.meeting_duration_minutes) ? Number(task.meeting_duration_minutes) / 60 : 0.5);

    if (attendee) {
      if (attendee.status === 'attended') {
        const allocated = Number(attendee.hours_allocated) || meetingEstHours;
        return { estimated: meetingEstHours, actual: allocated };
      } else if (attendee.status === 'pending') {
        return { estimated: meetingEstHours, actual: 0 };
      } else {
        // 'excused' or 'absent': does not consume hours or mark delayed
        return { estimated: 0, actual: 0 };
      }
    }

    if (task.assigned_staff_id === memberId) {
      return {
        estimated: meetingEstHours,
        actual: task.status === 'done' ? (Number(task.actual_hours) || meetingEstHours) : 0,
      };
    }

    return { estimated: 0, actual: 0 };
  }

  const safeChecklist = Array.isArray(task.checklist) ? task.checklist : parseTaskChecklist(task.checklist);
  const memberSubtasks = safeChecklist.filter((c) => c.assigned_staff_id === memberId);
  const otherSubtasks = safeChecklist.filter((c) => c.assigned_staff_id && c.assigned_staff_id !== memberId);

  if (memberSubtasks.length > 0) {
    const subEstimated = memberSubtasks.reduce((sum, c) => sum + (Number(c.estimated_hours) || 0), 0);
    const subActual = memberSubtasks.reduce((sum, c) => sum + (Number(c.actual_hours) || 0), 0);

    if (task.assigned_staff_id === memberId && otherSubtasks.length === 0 && subEstimated === 0 && subActual === 0) {
      return {
        estimated: Number(task.estimated_hours) || 0,
        actual: Number(task.actual_hours) || 0,
      };
    }
    return { estimated: subEstimated, actual: subActual };
  }

  if (task.assigned_staff_id === memberId) {
    if (otherSubtasks.length === 0) {
      return {
        estimated: Number(task.estimated_hours) || 0,
        actual: Number(task.actual_hours) || 0,
      };
    } else {
      const otherEstimated = otherSubtasks.reduce((sum, c) => sum + (Number(c.estimated_hours) || 0), 0);
      const otherActual = otherSubtasks.reduce((sum, c) => sum + (Number(c.actual_hours) || 0), 0);
      const remainingEstimated = Math.max(0, (Number(task.estimated_hours) || 0) - otherEstimated);
      const remainingActual = Math.max(0, (Number(task.actual_hours) || 0) - otherActual);
      return { estimated: remainingEstimated, actual: remainingActual };
    }
  }

  return { estimated: 0, actual: 0 };
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
  const isBlocked =
    task.status === 'blocked' ||
    (Boolean(task.blocked_by_task_id) && Boolean(task.blocked_by) && task.blocked_by?.status !== 'done');

  // Parse due date or meeting start date if present to determine if a week is scheduled/overdue
  let dueWeek: number | null = null;
  let isDueInPastMonth = false;

  const targetDateStr = task.type === 'meeting' ? (task.meeting_start_at || task.due_date) : task.due_date;
  if (targetDateStr) {
    const due = new Date(targetDateStr);
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

    // Synchronous activities / meetings: paced by scheduled session week
    if (task.type === 'meeting') {
      const isMeetingWeek = dueWeek === w;
      if (isTaskDone) {
        return {
          week: w,
          label: `Semana ${w}`,
          dateRange: dateRanges[idx],
          progress: isMeetingWeek || isPastWeek ? 100 : 0,
          totalDeliverables: 1,
          completedDeliverables: 1,
          status: isMeetingWeek || isPastWeek ? 'completed' : 'pending',
          hasSchedule: isMeetingWeek,
        };
      }

      if (isMeetingWeek) {
        const meetingStatus = isBlocked ? 'delayed' : isPastWeek ? 'on_track' : isCurrentWeek ? 'on_track' : 'pending';
        return {
          week: w,
          label: `Semana ${w}`,
          dateRange: dateRanges[idx],
          progress: isPastWeek ? 100 : 50,
          totalDeliverables: 1,
          completedDeliverables: isPastWeek ? 1 : 0,
          status: meetingStatus,
          hasSchedule: true,
        };
      }

      return {
        week: w,
        label: `Semana ${w}`,
        dateRange: dateRanges[idx],
        progress: 0,
        totalDeliverables: 0,
        completedDeliverables: 0,
        status: 'pending',
        hasSchedule: false,
      };
    }

    // If task is globally completed, evaluate based on week timing
    if (isTaskDone) {
      if (hasTargetWeeks) {
        // Evaluate deliverables explicitly planned for this week w
        const itemsInWeek = checklist.filter((c) => c.target_week === w);
        totalItems = itemsInWeek.length;
        doneItems = itemsInWeek.filter((c) => c.completed).length;
        hasSchedule = totalItems > 0;
        progress = hasSchedule ? Math.round((doneItems / totalItems) * 100) : 0;

        if (!hasSchedule) {
          status = 'pending';
        } else if (doneItems === totalItems) {
          status = 'completed';
        } else {
          status = 'on_track';
        }
      } else {
        // Standard task without weekly deliverables
        if (isFutureWeek) {
          // Future week cannot be completed in advance if no future schedule
          progress = 0;
          status = 'pending';
          hasSchedule = false;
        } else {
          // Past week or current active week when task was finished
          progress = 100;
          status = 'completed';
          hasSchedule = true;
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
    }

    // 1. Check if there is an inmutable recorded snapshot for past week w
    const snapshotKey = `s${w}` as 's1' | 's2' | 's3' | 's4';
    const snapshotVal = task.weekly_snapshots && typeof task.weekly_snapshots[snapshotKey] === 'number'
      ? task.weekly_snapshots[snapshotKey]
      : null;

    if (isPastWeek && snapshotVal !== null) {
      // Use frozen historical cut for past week!
      progress = snapshotVal;
      hasSchedule = true;
      if (progress === 100) {
        status = 'completed';
      } else if (hasTargetWeeks) {
        const itemsInWeek = checklist.filter((c) => c.target_week === w);
        totalItems = itemsInWeek.length;
        doneItems = itemsInWeek.filter((c) => c.completed).length;
        status = totalItems > 0 && doneItems < totalItems ? 'delayed' : 'pending';
      } else {
        const isPastDue = isDueInPastMonth || (dueWeek !== null && dueWeek <= w);
        if (isBlocked || isPastDue) {
          status = 'delayed';
        } else if (progress > 0) {
          status = 'on_track';
        } else {
          status = 'pending';
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
    }

    if (hasTargetWeeks) {
      // CASE 1: Task has explicit checklist deliverables per week
      const itemsInWeek = checklist.filter((c) => c.target_week === w);
      totalItems = itemsInWeek.length;
      doneItems = itemsInWeek.filter((c) => c.completed).length;
      hasSchedule = totalItems > 0;
      progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

      // If single deliverable in this week is not yet checked, but global slider has progress, reflect active progress!
      if (totalItems === 1 && doneItems === 0 && globalProg > 0 && isCurrentWeek) {
        progress = globalProg;
      }

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

export interface ParsedAuditNote {
  isAudit: boolean;
  type: 'progress' | 'status' | 'assignment' | 'due_date' | 'priority' | 'blocker' | 'unblock' | 'subtask' | 'other';
  icon: string;
  badgeClass?: string;
  formattedText: string;
}

/**
 * Strips any legacy notification recipient mention suffix (e.g. "| Notificando a @Natalia")
 * from audit and comment strings for cleaner UI display.
 */
export function cleanAuditNotificationSuffix(text: string): string {
  if (!text) return "";
  return text.replace(/\s*\|\s*[Nn]otificando a\s+.*$/i, "").trim();
}

export function parseSystemAuditNote(rawContent: string): ParsedAuditNote {
  if (!rawContent) return { isAudit: false, type: 'other', icon: '💬', formattedText: rawContent };

  const content = cleanAuditNotificationSuffix(rawContent);

  // 1. Progress / Regression
  if (
    content.startsWith("📈") ||
    content.startsWith("📉") ||
    content.toLowerCase().includes("de tarea actualizado") ||
    content.toLowerCase().includes("regres")
  ) {
    const isRegression = content.startsWith("📉") || content.toLowerCase().includes("regres");
    return {
      isAudit: true,
      type: 'progress',
      icon: isRegression ? "📉" : "📈",
      badgeClass: isRegression ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
      formattedText: content.replace(/^[📈📉]\s*/, '').trim()
    };
  }

  // 2. Status change (including QA Review and Task Completion)
  if (
    content.startsWith("🔄") ||
    content.startsWith("🔍") ||
    content.startsWith("✅") ||
    content.toLowerCase().includes("estado actualizado") ||
    content.toLowerCase().includes("estado cambiado") ||
    content.toLowerCase().includes("enviado a revisión") ||
    content.toLowerCase().includes("revisión / qa") ||
    content.toLowerCase().includes("tarea completada exitosamente")
  ) {
    const isQa = content.startsWith("🔍") || content.toLowerCase().includes("revisión") || content.toLowerCase().includes("qa");
    const isDone = content.startsWith("✅") || content.toLowerCase().includes("tarea completada");
    return {
      isAudit: true,
      type: 'status',
      icon: isQa ? "🔍" : isDone ? "✅" : "🔄",
      badgeClass: isQa ? "text-violet-600 dark:text-violet-400" : isDone ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400",
      formattedText: content.replace(/^[🔄🔍✅]\s*/, '').trim()
    };
  }

  // 3. Assignment
  if (
    content.startsWith("👤") ||
    content.toLowerCase().includes("asignado a") ||
    content.toLowerCase().includes("reasignado a")
  ) {
    return {
      isAudit: true,
      type: 'assignment',
      icon: "👤",
      badgeClass: "text-purple-600 dark:text-purple-400",
      formattedText: content.replace(/^👤\s*/, '').trim()
    };
  }

  // 4. Due Date
  if (content.startsWith("📅") || content.toLowerCase().includes("fecha límite")) {
    return {
      isAudit: true,
      type: 'due_date',
      icon: "📅",
      badgeClass: "text-amber-600 dark:text-amber-400",
      formattedText: content.replace(/^📅\s*/, '').trim()
    };
  }

  // 5. Priority
  if (content.startsWith("⚡") || content.toLowerCase().includes("prioridad cambiada")) {
    return {
      isAudit: true,
      type: 'priority',
      icon: "⚡",
      badgeClass: "text-orange-600 dark:text-orange-400",
      formattedText: content.replace(/^⚡\s*/, '').trim()
    };
  }

  // 6. Blocker
  if (content.startsWith("🚫") || content.toLowerCase().includes("bloqueado por")) {
    return {
      isAudit: true,
      type: 'blocker',
      icon: "🚫",
      badgeClass: "text-red-600 dark:text-red-400",
      formattedText: content.replace(/^🚫\s*/, '').trim()
    };
  }

  // 7. Unblock
  if (content.startsWith("🔓") || content.toLowerCase().includes("desbloqueo")) {
    return {
      isAudit: true,
      type: 'unblock',
      icon: "🔓",
      badgeClass: "text-emerald-600 dark:text-emerald-400",
      formattedText: content.replace(/^🔓\s*/, '').trim()
    };
  }

  // 8. Subtask / Deliverable
  if (
    content.startsWith("☑️") ||
    content.startsWith("⬜") ||
    content.toLowerCase().includes("subtarea") ||
    content.toLowerCase().includes("entregable")
  ) {
    const isCompleted = content.startsWith("☑️") || content.toLowerCase().includes("completad");
    return {
      isAudit: true,
      type: 'subtask',
      icon: isCompleted ? "☑️" : "⬜",
      badgeClass: isCompleted ? "text-teal-600 dark:text-teal-400" : "text-zinc-500 dark:text-zinc-400",
      formattedText: content.replace(/^(?:☑️|☑|⬜)\s*/, '').trim()
    };
  }

  return { isAudit: false, type: 'other', icon: '💬', formattedText: content };
}

/**
 * Standardized role matcher: Checks if a staff member has PM, Lead, or Management permissions.
 * Prioritizes structured task_role if present, otherwise evaluates role string strictly.
 * Explicitly separates QA/testing roles from PM management permissions.
 */
export function isStaffLeadOrPmRole(
  role?: string | null,
  taskRole?: CollaboratorRole | string | null
): boolean {
  if (taskRole) {
    const tr = taskRole.toLowerCase();
    if (tr === "pm" || tr === "admin" || tr === "owner") return true;
    if (
      tr === "qa_lead" ||
      tr === "developer" ||
      tr === "designer" ||
      tr === "support" ||
      tr === "sales" ||
      tr === "operations"
    ) {
      return false;
    }
  }

  if (!role) return false;
  const r = role.toLowerCase().trim();

  // Exclude pure QA or tester roles explicitly
  if (
    r.includes("qa") ||
    r.includes("tester") ||
    r.includes("calidad") ||
    r.includes("revisor") ||
    r.includes("pruebas")
  ) {
    return false;
  }

  // Match PM with word boundary or exact token
  const hasPmToken = /\bpm\b/i.test(r) || /\bp\.m\.\b/i.test(r);
  if (hasPmToken) return true;

  return (
    r.includes("project manager") ||
    r.includes("gestor de proyecto") ||
    r.includes("gestora de proyecto") ||
    r.includes("lider tecnico") ||
    r.includes("líder técnico") ||
    r.includes("tech lead") ||
    r.includes("team lead") ||
    r.includes("gerente") ||
    r.includes("director") ||
    r.includes("directora") ||
    r.includes("coordinador") ||
    r.includes("coordinadora") ||
    r.includes("administrator") ||
    r.includes("administrador") ||
    r.includes("admin") ||
    r.includes("owner")
  );
}

export * from "./import-types";

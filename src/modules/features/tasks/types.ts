export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'task' | 'feature' | 'bug' | 'improvement' | 'delivery';
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type CollaboratorRole = 'pm' | 'qa_lead' | 'developer' | 'designer' | 'specialist' | 'observer' | 'sales' | 'operations' | 'support' | 'consultant';

export type TaskChecklistItem = {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
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

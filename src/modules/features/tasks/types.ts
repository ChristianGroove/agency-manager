export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'task' | 'feature' | 'bug' | 'improvement' | 'delivery';
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type CollaboratorRole = 'pm' | 'qa_lead' | 'developer' | 'designer' | 'specialist' | 'observer';

export interface TaskChecklistItem {
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

export interface TaskProject {
  id: string;
  organization_id: string;
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
  assigned_tasks_count?: number;
  completed_tasks_count?: number;
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

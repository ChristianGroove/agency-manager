import { z } from "zod";
import type { TaskStatus, TaskPriority, TaskType, ProjectStatus, CollaboratorRole, TaskSprintStatus } from "./types";

// ==========================================
// 1. Zod Validation Schemas
// ==========================================

export const PixyImportCollaboratorSchema = z.object({
  email: z.string().email("Formato de correo electrónico inválido"),
  first_name: z.string().min(1, "El nombre es obligatorio"),
  last_name: z.string().optional().default(""),
  phone: z.string().optional().nullable(),
  role: z.string().optional().default("Colaborador"),
  task_role: z.enum([
    "pm", "qa_lead", "developer", "designer", "specialist", 
    "observer", "sales", "operations", "support", "consultant"
  ] as const).optional().default("developer"),
  photo_url: z.string().optional().nullable(),
  workspaces_access: z.array(z.string()).optional().default([]),
  is_active: z.boolean().optional().default(true),
});

export const PixyImportWorkspaceSchema = z.object({
  key_prefix: z.string().min(2, "El prefijo debe tener al menos 2 caracteres").max(10),
  name: z.string().min(1, "El nombre del espacio es obligatorio"),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional().default("#3b82f6"),
  icon: z.string().optional().default("Layers"),
  lead_email: z.string().email().optional().nullable(),
});

export const PixyImportProjectSchema = z.object({
  name: z.string().min(1, "El nombre del proyecto es obligatorio"),
  slug: z.string().optional(),
  workspace_key: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  color: z.string().optional().default("#8ec045"),
  icon: z.string().optional().default("Folder"),
  status: z.enum(["active", "paused", "completed", "archived"] as const).optional().default("active"),
  lead_email: z.string().email().optional().nullable(),
  start_date: z.string().optional().nullable(),
  target_date: z.string().optional().nullable(),
});

export const PixyImportSprintSchema = z.object({
  name: z.string().min(1, "El nombre del sprint es obligatorio"),
  goal: z.string().optional().nullable(),
  start_date: z.string().min(1, "Fecha de inicio obligatoria"),
  end_date: z.string().min(1, "Fecha de fin obligatoria"),
  duration_days: z.number().int().positive().optional().default(14),
  status: z.enum(["planning", "active", "completed", "cancelled"] as const).optional().default("active"),
  auto_rollover: z.boolean().optional().default(true),
  project_slug: z.string().optional().nullable(),
  workspace_key: z.string().optional().nullable(),
});

export const PixyImportChecklistItemSchema = z.object({
  title: z.string().min(1, "El título del entregable es obligatorio"),
  completed: z.boolean().optional().default(false),
  estimated_hours: z.number().nonnegative().optional().nullable(),
  actual_hours: z.number().nonnegative().optional().nullable(),
  assigned_email: z.string().email().optional().nullable(),
  target_week: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional().nullable(),
  due_date: z.string().optional().nullable(),
});

export const PixyImportTaskSchema = z.object({
  import_ref_id: z.string().optional().nullable(),
  ticket_code: z.string().optional().nullable(),
  title: z.string().min(1, "El título del ticket es obligatorio"),
  description: z.string().optional().nullable(),
  project_slug: z.string().optional().nullable(),
  project_name: z.string().optional().nullable(),
  workspace_key: z.string().optional().nullable(),
  type: z.enum(["task", "feature", "bug", "improvement", "delivery", "meeting"] as const).optional().default("task"),
  status: z.enum(["backlog", "todo", "in_progress", "in_review", "done", "blocked"] as const).optional().default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"] as const).optional().default("medium"),
  progress_percentage: z.number().min(0).max(100).optional().default(0),
  estimated_hours: z.number().nonnegative().optional().default(0),
  actual_hours: z.number().nonnegative().optional().default(0),
  due_date: z.string().optional().nullable(),
  assignee_email: z.string().email().optional().nullable(),
  qa_email: z.string().email().optional().nullable(),
  sprint_name: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  checklist: z.array(PixyImportChecklistItemSchema).optional().default([]),
  blocked_by_ref_id: z.string().optional().nullable(),
  blocked_reason: z.string().optional().nullable(),
});

export const PixyUniversalBundleSchema = z.object({
  version: z.string().default("1.0"),
  exported_at: z.string().optional(),
  source_system: z.enum(["pixy", "jira", "csv", "generic"]).default("pixy"),
  collaborators: z.array(PixyImportCollaboratorSchema).optional().default([]),
  workspaces: z.array(PixyImportWorkspaceSchema).optional().default([]),
  projects: z.array(PixyImportProjectSchema).optional().default([]),
  sprints: z.array(PixyImportSprintSchema).optional().default([]),
  tasks: z.array(PixyImportTaskSchema).min(1, "El archivo debe contener al menos una tarea a importar"),
});

// ==========================================
// 2. TypeScript Types
// ==========================================

export type PixyImportCollaborator = z.infer<typeof PixyImportCollaboratorSchema>;
export type PixyImportWorkspace = z.infer<typeof PixyImportWorkspaceSchema>;
export type PixyImportProject = z.infer<typeof PixyImportProjectSchema>;
export type PixyImportSprint = z.infer<typeof PixyImportSprintSchema>;
export type PixyImportChecklistItem = z.infer<typeof PixyImportChecklistItemSchema>;
export type PixyImportTask = z.infer<typeof PixyImportTaskSchema>;
export type PixyUniversalBundle = z.infer<typeof PixyUniversalBundleSchema>;

// ==========================================
// 3. Dry-Run & Execution Interfaces
// ==========================================

export interface ImportValidationError {
  row?: number;
  entity: "task" | "collaborator" | "project" | "workspace" | "sprint" | "bundle";
  field?: string;
  message: string;
  value?: any;
}

export interface ImportDryRunStaffSummary {
  email: string;
  fullName: string;
  role: string;
  isExisting: boolean;
  assignedTasksCount: number;
}

export interface ImportDryRunProjectSummary {
  name: string;
  slug: string;
  workspaceKey?: string | null;
  isExisting: boolean;
  tasksCount: number;
}

export interface ImportDryRunWorkspaceSummary {
  keyPrefix: string;
  name: string;
  isExisting: boolean;
}

export interface ImportDryRunSprintSummary {
  name: string;
  dates: string;
  isExisting: boolean;
  tasksCount: number;
}

export interface ImportDryRunResult {
  isValid: boolean;
  bundle: PixyUniversalBundle | null;
  sourceType: "pixy" | "jira" | "csv" | "generic";
  errors: ImportValidationError[];
  warnings: string[];
  stats: {
    totalTasks: number;
    totalStaff: number;
    newStaffCount: number;
    existingStaffCount: number;
    totalProjects: number;
    newProjectsCount: number;
    existingProjectsCount: number;
    totalWorkspaces: number;
    newWorkspacesCount: number;
    totalSprints: number;
    newSprintsCount: number;
    totalChecklistItems: number;
    totalEstimatedHours: number;
  };
  details: {
    staff: ImportDryRunStaffSummary[];
    projects: ImportDryRunProjectSummary[];
    workspaces: ImportDryRunWorkspaceSummary[];
    sprints: ImportDryRunSprintSummary[];
  };
}

export interface ImportExecutionOptions {
  autoCreateStaff: boolean;
  autoCreateProjects: boolean;
  autoCreateWorkspaces: boolean;
  autoCreateSprints: boolean;
  defaultProjectId?: string | null;
  defaultWorkspaceId?: string | null;
  unassignedFallback?: boolean;
}

export interface ImportExecutionResult {
  success: boolean;
  error?: string;
  createdStats?: {
    staffCreated: number;
    workspacesCreated: number;
    projectsCreated: number;
    sprintsCreated: number;
    tasksCreated: number;
    checklistsCreated: number;
    blockersResolved: number;
  };
  createdTaskCodes?: string[];
}

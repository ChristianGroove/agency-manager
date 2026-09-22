import Papa from "papaparse";
import {
  PixyUniversalBundle,
  PixyUniversalBundleSchema,
  PixyImportTask,
  PixyImportCollaborator,
  PixyImportChecklistItem,
  ImportDryRunResult,
  ImportValidationError,
} from "../import-types";
import type { TaskCollaborator, TaskProject, TaskWorkspace, TaskSprint, TaskStatus, TaskPriority, TaskType } from "../types";

// Helper: Normalize strings for fuzzy matching
export function normalizeSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// ==========================================
// 1. Checklist String Parser
// ==========================================
// Parses format: "[x] Subtask Title (4h @carlos@email.com); [ ] Another task (2h)"
export function parseChecklistString(checklistStr?: string | null): PixyImportChecklistItem[] {
  if (!checklistStr || !checklistStr.trim()) return [];

  const items: PixyImportChecklistItem[] = [];
  const parts = checklistStr.split(";").map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const isCompleted = /^\[[xX]\]/i.test(part);
    let clean = part.replace(/^\[[ xX]\]/i, "").trim();

    // Extract hours and email if inside parentheses, e.g. "(4h @email.com)"
    let estimatedHours: number | null = null;
    let assignedEmail: string | null = null;

    const parenMatch = clean.match(/\(([^)]+)\)$/);
    if (parenMatch) {
      const insideParens = parenMatch[1];
      clean = clean.replace(/\(([^)]+)\)$/, "").trim();

      const hoursMatch = insideParens.match(/(\d+(?:\.\d+)?)\s*h/i);
      if (hoursMatch) {
        estimatedHours = parseFloat(hoursMatch[1]);
      }

      const emailMatch = insideParens.match(/@?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        assignedEmail = emailMatch[1].toLowerCase();
      }
    }

    if (clean.length > 0) {
      items.push({
        title: clean,
        completed: isCompleted,
        estimated_hours: estimatedHours,
        assigned_email: assignedEmail,
      });
    }
  }

  return items;
}

// ==========================================
// 2. Format Detector
// ==========================================
export function detectImportFormat(fileContent: string, fileName: string): "pixy" | "jira" | "csv" | "generic" {
  const trimmed = fileContent.trim();
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".json") || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    return "pixy";
  }

  // Parse first few rows of CSV to inspect headers
  try {
    const parsed = Papa.parse(trimmed, { preview: 2, header: false });
    if (parsed.data && parsed.data.length > 0) {
      const headers = (parsed.data[0] as string[]).map((h) => (h || "").trim().toLowerCase());
      
      const isJira = headers.some(
        (h) => h === "issue key" || h === "issue type" || h === "issue id" || h === "summary" || h === "custom field (sprint)"
      );
      if (isJira) return "jira";

      const isPixyCsv = headers.some(
        (h) => h === "ticket" || h === "ref_id" || h === "project" || h === "proyecto" || h === "assignee_email" || h === "checklist"
      );
      if (isPixyCsv) return "csv";
    }
  } catch {
    // fallback
  }

  return "csv";
}

// ==========================================
// 3. JSON Parser (Pixy Universal Bundle)
// ==========================================
export function parsePixyJson(rawJson: string): { success: boolean; bundle?: PixyUniversalBundle; error?: string } {
  try {
    const parsed = JSON.parse(rawJson);
    const validated = PixyUniversalBundleSchema.safeParse(parsed);

    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      const path = firstIssue.path.join(".");
      return {
        success: false,
        error: `Error de estructura JSON en "${path}": ${firstIssue.message}`,
      };
    }

    return { success: true, bundle: validated.data };
  } catch (err: any) {
    return { success: false, error: `JSON inválido: ${err.message}` };
  }
}

// ==========================================
// 4. CSV Parser: Pixy Standard Tasks CSV
// ==========================================
export function parsePixyCsv(csvContent: string): { success: boolean; bundle?: PixyUniversalBundle; error?: string } {
  try {
    const parsed = Papa.parse<Record<string, string>>(csvContent.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return { success: false, error: `Error leyendo CSV: ${parsed.errors[0].message}` };
    }

    const rows = parsed.data;
    if (rows.length === 0) {
      return { success: false, error: "El archivo CSV está vacío." };
    }

    const tasks: PixyImportTask[] = [];
    const staffMap = new Map<string, PixyImportCollaborator>();
    const projectSet = new Set<string>();

    rows.forEach((row, index) => {
      // Find title
      const title = row["title"] || row["titulo"] || row["título"] || row["nombre"] || row["summary"] || "";
      if (!title.trim()) return; // skip rows without title

      const refId = row["ref_id"] || row["id"] || row["code"] || row["ticket"] || `REF-${index + 1}`;
      const projectName = row["project"] || row["proyecto"] || row["project_name"] || row["project_slug"] || "Proyecto General";
      const workspaceKey = row["workspace"] || row["espacio"] || row["workspace_key"] || null;
      const description = row["description"] || row["descripcion"] || row["descripción"] || null;
      
      // Status mapping
      const rawStatus = (row["status"] || row["estado"] || "todo").toLowerCase().trim();
      let status: TaskStatus = "todo";
      if (rawStatus.includes("backlog")) status = "backlog";
      else if (rawStatus.includes("curso") || rawStatus.includes("progress")) status = "in_progress";
      else if (rawStatus.includes("qa") || rawStatus.includes("review") || rawStatus.includes("revis")) status = "in_review";
      else if (rawStatus.includes("done") || rawStatus.includes("complet") || rawStatus.includes("terminad")) status = "done";
      else if (rawStatus.includes("block") || rawStatus.includes("bloque")) status = "blocked";

      // Priority mapping
      const rawPriority = (row["priority"] || row["prioridad"] || "medium").toLowerCase().trim();
      let priority: TaskPriority = "medium";
      if (rawPriority.includes("urgent") || rawPriority.includes("urgente") || rawPriority.includes("crit")) priority = "urgent";
      else if (rawPriority.includes("high") || rawPriority.includes("alta")) priority = "high";
      else if (rawPriority.includes("low") || rawPriority.includes("baja")) priority = "low";

      // Type mapping
      const rawType = (row["type"] || row["tipo"] || "task").toLowerCase().trim();
      let type: TaskType = "task";
      if (rawType.includes("bug") || rawType.includes("error") || rawType.includes("incid")) type = "bug";
      else if (rawType.includes("feat") || rawType.includes("caracter") || rawType.includes("funcional")) type = "feature";
      else if (rawType.includes("improv") || rawType.includes("mejora")) type = "improvement";
      else if (rawType.includes("deliv") || rawType.includes("entrega")) type = "delivery";

      // Numbers
      const progress = Math.max(0, Math.min(100, parseInt(row["progress"] || row["progreso"] || row["%"] || "0", 10) || 0));
      const estimatedHours = parseFloat(row["estimated_hours"] || row["horas_estimadas"] || row["estimado"] || "0") || 0;
      const actualHours = parseFloat(row["actual_hours"] || row["horas_reales"] || row["real"] || "0") || 0;
      const dueDate = row["due_date"] || row["fecha_limite"] || row["fecha_fin"] || null;

      // Assignee & QA emails
      const rawAssignee = (row["assignee_email"] || row["asignado"] || row["email_asignado"] || row["assignee"] || "").trim().toLowerCase();
      const assigneeEmail = rawAssignee.includes("@") ? rawAssignee : null;

      const rawQa = (row["qa_email"] || row["qa"] || row["revisor"] || "").trim().toLowerCase();
      const qaEmail = rawQa.includes("@") ? rawQa : null;

      if (assigneeEmail && !staffMap.has(assigneeEmail)) {
        staffMap.set(assigneeEmail, {
          email: assigneeEmail,
          first_name: assigneeEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          last_name: "",
          role: "Colaborador",
          task_role: "developer",
          is_active: true,
          workspaces_access: workspaceKey ? [workspaceKey] : [],
        });
      }

      const sprintName = row["sprint"] || row["sprint_name"] || null;

      // Tags
      const rawTags = row["tags"] || row["etiquetas"] || "";
      const tags = rawTags
        ? rawTags.split(/[,|]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];

      // Checklist
      const checklistStr = row["checklist"] || row["subtareas"] || row["entregables"] || "";
      const checklist = parseChecklistString(checklistStr);

      // Blockers
      const blockedByRefId = row["blocked_by"] || row["bloqueado_por"] || null;
      const blockedReason = row["blocked_reason"] || row["motivo_bloqueo"] || (status === "blocked" && blockedByRefId ? null : null);

      projectSet.add(projectName);

      tasks.push({
        import_ref_id: refId,
        project_name: projectName,
        project_slug: normalizeSlug(projectName),
        workspace_key: workspaceKey,
        title,
        description,
        type,
        status,
        priority,
        progress_percentage: progress,
        estimated_hours: estimatedHours,
        actual_hours: actualHours,
        due_date: dueDate,
        assignee_email: assigneeEmail,
        qa_email: qaEmail,
        sprint_name: sprintName,
        tags,
        checklist,
        blocked_by_ref_id: blockedByRefId,
        blocked_reason: blockedReason,
      });
    });

    if (tasks.length === 0) {
      return { success: false, error: "No se encontraron tareas válidas en el archivo CSV." };
    }

    const projects = Array.from(projectSet).map((name) => ({
      name,
      slug: normalizeSlug(name),
      status: "active" as const,
      color: "#8ec045",
      icon: "Layers",
    }));

    const bundle: PixyUniversalBundle = {
      version: "1.0",
      source_system: "csv",
      exported_at: new Date().toISOString(),
      collaborators: Array.from(staffMap.values()),
      projects,
      workspaces: [],
      sprints: [],
      tasks,
    };

    return { success: true, bundle };
  } catch (err: any) {
    return { success: false, error: `Error procesando CSV: ${err.message}` };
  }
}

// ==========================================
// 5. Jira Adapter: Jira CSV Export Parser
// ==========================================
export function parseJiraCsv(csvContent: string): { success: boolean; bundle?: PixyUniversalBundle; error?: string } {
  try {
    const parsed = Papa.parse<Record<string, string>>(csvContent.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return { success: false, error: `Error leyendo CSV de Jira: ${parsed.errors[0].message}` };
    }

    const rows = parsed.data;
    if (rows.length === 0) {
      return { success: false, error: "El archivo de exportación de Jira está vacío." };
    }

    const tasks: PixyImportTask[] = [];
    const staffMap = new Map<string, PixyImportCollaborator>();
    const projectMap = new Map<string, { name: string; key: string }>();
    const sprintSet = new Set<string>();

    rows.forEach((row, index) => {
      // Find Summary / Title
      const title = row["Summary"] || row["Resumen"] || "";
      if (!title.trim()) return;

      const issueKey = row["Issue key"] || row["Clave de incidencia"] || row["Key"] || `JIRA-${index + 1}`;
      const description = row["Description"] || row["Descripción"] || null;
      const rawIssueType = (row["Issue Type"] || row["Tipo de incidencia"] || "Task").toLowerCase();
      
      // Type mapping
      let type: TaskType = "task";
      if (rawIssueType.includes("bug") || rawIssueType.includes("defecto") || rawIssueType.includes("error")) {
        type = "bug";
      } else if (rawIssueType.includes("story") || rawIssueType.includes("historia") || rawIssueType.includes("feature")) {
        type = "feature";
      } else if (rawIssueType.includes("improvement") || rawIssueType.includes("mejora")) {
        type = "improvement";
      }

      // Status mapping
      const rawStatus = (row["Status"] || row["Estado"] || "To Do").toLowerCase();
      let status: TaskStatus = "todo";
      if (rawStatus.includes("backlog")) status = "backlog";
      else if (rawStatus.includes("progress") || rawStatus.includes("curso") || rawStatus.includes("development")) status = "in_progress";
      else if (rawStatus.includes("review") || rawStatus.includes("qa") || rawStatus.includes("test")) status = "in_review";
      else if (rawStatus.includes("done") || rawStatus.includes("closed") || rawStatus.includes("resolved") || rawStatus.includes("listo")) status = "done";
      else if (rawStatus.includes("block") || rawStatus.includes("imped")) status = "blocked";

      // Priority mapping
      const rawPriority = (row["Priority"] || row["Prioridad"] || "Medium").toLowerCase();
      let priority: TaskPriority = "medium";
      if (rawPriority.includes("blocker") || rawPriority.includes("highest") || rawPriority.includes("crit") || rawPriority.includes("muy alta")) priority = "urgent";
      else if (rawPriority.includes("high") || rawPriority.includes("alta")) priority = "high";
      else if (rawPriority.includes("low") || rawPriority.includes("baja")) priority = "low";

      // Progress & Estimates: Jira gives time in seconds or string (e.g. 3600s or 1h)
      const rawEstimate = row["Original Estimate"] || row["Σ Original Estimate"] || row["Estimación original"] || "0";
      let estimatedHours = 0;
      const numSec = parseFloat(rawEstimate);
      if (!isNaN(numSec) && numSec > 0) {
        // If > 100, likely seconds from Jira export
        estimatedHours = numSec > 100 ? Math.round((numSec / 3600) * 10) / 10 : numSec;
      }

      const rawTimeSpent = row["Time Spent"] || row["Σ Time Spent"] || row["Tiempo empleado"] || "0";
      let actualHours = 0;
      const numSpent = parseFloat(rawTimeSpent);
      if (!isNaN(numSpent) && numSpent > 0) {
        actualHours = numSpent > 100 ? Math.round((numSpent / 3600) * 10) / 10 : numSpent;
      }

      const progress = status === "done" ? 100 : status === "in_review" ? 95 : 0;
      const dueDate = row["Due date"] || row["Fecha de vencimiento"] || null;

      // Project resolution
      const projectName = row["Project name"] || row["Nombre del proyecto"] || row["Project key"] || "Proyecto Jira";
      const projectKey = row["Project key"] || row["Clave del proyecto"] || projectName.slice(0, 4).toUpperCase();
      if (!projectMap.has(projectName)) {
        projectMap.set(projectName, { name: projectName, key: projectKey });
      }

      // Assignee resolution
      const rawAssignee = (row["Assignee"] || row["Responsable"] || row["Assignee email"] || "").trim();
      let assigneeEmail: string | null = null;
      if (rawAssignee.includes("@")) {
        assigneeEmail = rawAssignee.toLowerCase();
      } else if (rawAssignee && rawAssignee.toLowerCase() !== "unassigned") {
        // Generate pseudo-email if Jira only gives display name
        assigneeEmail = `${normalizeSlug(rawAssignee)}@agencia.com`;
      }

      if (assigneeEmail && !staffMap.has(assigneeEmail)) {
        staffMap.set(assigneeEmail, {
          email: assigneeEmail,
          first_name: rawAssignee.includes("@") ? rawAssignee.split("@")[0] : rawAssignee,
          last_name: "",
          role: "Colaborador",
          task_role: "developer",
          is_active: true,
          workspaces_access: [projectKey],
        });
      }

      // Sprint resolution: Jira format often looks like "Sprint 1" or complex string
      let sprintName: string | null = null;
      const rawSprint = row["Sprint"] || row["Custom field (Sprint)"] || "";
      if (rawSprint) {
        const nameMatch = rawSprint.match(/name=([^,]+)/);
        if (nameMatch) {
          sprintName = nameMatch[1].trim();
        } else {
          // Take last part or full name
          sprintName = rawSprint.split(",").pop()?.trim() || rawSprint.trim();
        }
        if (sprintName) sprintSet.add(sprintName);
      }

      // Tags / Labels
      const rawLabels = row["Labels"] || row["Etiquetas"] || "";
      const tags = rawLabels
        ? rawLabels.split(/\s+/).map((t) => t.trim().toLowerCase()).filter(Boolean)
        : [];
      tags.push("jira-import");

      // Sub-tasks or checklist
      const subtasksStr = row["Sub-tasks"] || row["Subtareas"] || "";
      const checklist = parseChecklistString(subtasksStr);

      tasks.push({
        import_ref_id: issueKey,
        project_name: projectName,
        project_slug: normalizeSlug(projectName),
        workspace_key: projectKey,
        title,
        description,
        type,
        status,
        priority,
        progress_percentage: progress,
        estimated_hours: estimatedHours,
        actual_hours: actualHours,
        due_date: dueDate,
        assignee_email: assigneeEmail,
        qa_email: null,
        sprint_name: sprintName,
        tags,
        checklist,
        blocked_by_ref_id: null,
        blocked_reason: status === "blocked" ? "Migrado desde Jira como bloqueado" : null,
      });
    });

    if (tasks.length === 0) {
      return { success: false, error: "No se pudieron extraer tareas válidas del CSV de Jira." };
    }

    const projects = Array.from(projectMap.values()).map((p) => ({
      name: p.name,
      slug: normalizeSlug(p.name),
      workspace_key: p.key,
      status: "active" as const,
      color: "#3b82f6",
      icon: "Layers",
    }));

    const sprints = Array.from(sprintSet).map((name) => {
      const today = new Date();
      const in14Days = new Date();
      in14Days.setDate(today.getDate() + 14);
      return {
        name,
        goal: `Sprint migrado desde Jira (${name})`,
        start_date: today.toISOString().split("T")[0],
        end_date: in14Days.toISOString().split("T")[0],
        duration_days: 14,
        status: "active" as const,
        auto_rollover: true,
      };
    });

    const bundle: PixyUniversalBundle = {
      version: "1.0",
      source_system: "jira",
      exported_at: new Date().toISOString(),
      collaborators: Array.from(staffMap.values()),
      projects,
      workspaces: [],
      sprints,
      tasks,
    };

    return { success: true, bundle };
  } catch (err: any) {
    return { success: false, error: `Error procesando export de Jira: ${err.message}` };
  }
}

// ==========================================
// 6. Dry-Run & Pre-validation Engine
// ==========================================
export function runImportDryRun(
  bundle: PixyUniversalBundle,
  existingState: {
    existingStaff: TaskCollaborator[];
    existingProjects: TaskProject[];
    existingWorkspaces: TaskWorkspace[];
    existingSprints?: TaskSprint[];
  }
): ImportDryRunResult {
  const errors: ImportValidationError[] = [];
  const warnings: string[] = [];

  const existingStaffEmails = new Set(
    existingState.existingStaff.map((s) => (s.email || "").toLowerCase().trim()).filter(Boolean)
  );
  const existingProjectSlugs = new Set(
    existingState.existingProjects.map((p) => normalizeSlug(p.name || p.slug || ""))
  );
  const existingWorkspaceKeys = new Set(
    existingState.existingWorkspaces.map((w) => (w.key_prefix || "").toUpperCase().trim())
  );
  const existingSprintNames = new Set(
    (existingState.existingSprints || []).map((s) => s.name.toLowerCase().trim())
  );

  // Track counts
  const staffSummaryMap = new Map<string, { email: string; fullName: string; role: string; isExisting: boolean; assignedTasksCount: number }>();
  const projectSummaryMap = new Map<string, { name: string; slug: string; workspaceKey?: string | null; isExisting: boolean; tasksCount: number }>();
  const workspaceSummaryMap = new Map<string, { keyPrefix: string; name: string; isExisting: boolean }>();
  const sprintSummaryMap = new Map<string, { name: string; dates: string; isExisting: boolean; tasksCount: number }>();

  // Register collaborators declared in bundle
  (bundle.collaborators || []).forEach((c, idx) => {
    const email = c.email.toLowerCase().trim();
    const isExisting = existingStaffEmails.has(email);
    staffSummaryMap.set(email, {
      email,
      fullName: `${c.first_name} ${c.last_name || ""}`.trim(),
      role: c.role || "Colaborador",
      isExisting,
      assignedTasksCount: 0,
    });
  });

  // Register projects declared in bundle
  (bundle.projects || []).forEach((p) => {
    const slug = normalizeSlug(p.slug || p.name);
    const isExisting = existingProjectSlugs.has(slug);
    projectSummaryMap.set(slug, {
      name: p.name,
      slug,
      workspaceKey: p.workspace_key,
      isExisting,
      tasksCount: 0,
    });
  });

  // Register workspaces declared in bundle
  (bundle.workspaces || []).forEach((w) => {
    const key = (w.key_prefix || "").toUpperCase().trim();
    const isExisting = existingWorkspaceKeys.has(key);
    workspaceSummaryMap.set(key, {
      keyPrefix: key,
      name: w.name,
      isExisting,
    });
  });

  // Register sprints declared in bundle
  (bundle.sprints || []).forEach((s) => {
    const nameLower = s.name.toLowerCase().trim();
    const isExisting = existingSprintNames.has(nameLower);
    sprintSummaryMap.set(nameLower, {
      name: s.name,
      dates: `${s.start_date} al ${s.end_date}`,
      isExisting,
      tasksCount: 0,
    });
  });

  let totalChecklistItems = 0;
  let totalEstimatedHours = 0;

  // Validate tasks
  bundle.tasks.forEach((t, idx) => {
    const rowNum = idx + 1;
    if (!t.title || !t.title.trim()) {
      errors.push({
        row: rowNum,
        entity: "task",
        field: "title",
        message: "El ticket no tiene título.",
      });
    }

    totalEstimatedHours += t.estimated_hours || 0;
    if (t.checklist && t.checklist.length > 0) {
      totalChecklistItems += t.checklist.length;
    }

    // Assignee check
    if (t.assignee_email) {
      const email = t.assignee_email.toLowerCase().trim();
      let staffEntry = staffSummaryMap.get(email);
      if (!staffEntry) {
        const isExisting = existingStaffEmails.has(email);
        staffEntry = {
          email,
          fullName: email.split("@")[0],
          role: "Colaborador",
          isExisting,
          assignedTasksCount: 0,
        };
        staffSummaryMap.set(email, staffEntry);
      }
      staffEntry.assignedTasksCount += 1;
    }

    // QA check
    if (t.qa_email) {
      const email = t.qa_email.toLowerCase().trim();
      if (!staffSummaryMap.has(email)) {
        const isExisting = existingStaffEmails.has(email);
        staffSummaryMap.set(email, {
          email,
          fullName: email.split("@")[0],
          role: "QA Revisor",
          isExisting,
          assignedTasksCount: 0,
        });
      }
    }

    // Project check
    const pSlug = normalizeSlug(t.project_slug || t.project_name || "proyecto-general");
    let projEntry = projectSummaryMap.get(pSlug);
    if (!projEntry) {
      const isExisting = existingProjectSlugs.has(pSlug);
      projEntry = {
        name: t.project_name || t.project_slug || "Proyecto General",
        slug: pSlug,
        workspaceKey: t.workspace_key,
        isExisting,
        tasksCount: 0,
      };
      projectSummaryMap.set(pSlug, projEntry);
    }
    projEntry.tasksCount += 1;

    // Sprint check
    if (t.sprint_name) {
      const sName = t.sprint_name.toLowerCase().trim();
      let sprintEntry = sprintSummaryMap.get(sName);
      if (!sprintEntry) {
        const isExisting = existingSprintNames.has(sName);
        sprintEntry = {
          name: t.sprint_name,
          dates: "Por definir",
          isExisting,
          tasksCount: 0,
        };
        sprintSummaryMap.set(sName, sprintEntry);
      }
      sprintEntry.tasksCount += 1;
    }
  });

  const staffList = Array.from(staffSummaryMap.values());
  const newStaffCount = staffList.filter((s) => !s.isExisting).length;
  const existingStaffCount = staffList.filter((s) => s.isExisting).length;

  const projectList = Array.from(projectSummaryMap.values());
  const newProjectsCount = projectList.filter((p) => !p.isExisting).length;
  const existingProjectsCount = projectList.filter((p) => p.isExisting).length;

  const workspaceList = Array.from(workspaceSummaryMap.values());
  const newWorkspacesCount = workspaceList.filter((w) => !w.isExisting).length;

  const sprintList = Array.from(sprintSummaryMap.values());
  const newSprintsCount = sprintList.filter((s) => !s.isExisting).length;

  if (newStaffCount > 0) {
    warnings.push(`Se detectaron ${newStaffCount} colaboradores nuevos que no existen actualmente en la organización.`);
  }
  if (newProjectsCount > 0) {
    warnings.push(`Se detectaron ${newProjectsCount} proyectos que serán creados automáticamente.`);
  }

  return {
    isValid: errors.length === 0,
    bundle,
    sourceType: bundle.source_system,
    errors,
    warnings,
    stats: {
      totalTasks: bundle.tasks.length,
      totalStaff: staffList.length,
      newStaffCount,
      existingStaffCount,
      totalProjects: projectList.length,
      newProjectsCount,
      existingProjectsCount,
      totalWorkspaces: workspaceList.length,
      newWorkspacesCount,
      totalSprints: sprintList.length,
      newSprintsCount,
      totalChecklistItems,
      totalEstimatedHours,
    },
    details: {
      staff: staffList,
      projects: projectList,
      workspaces: workspaceList,
      sprints: sprintList,
    },
  };
}

// ==========================================
// 7. Sample Templates Generators
// ==========================================

export function generateSamplePixyJson(): string {
  const sample: PixyUniversalBundle = {
    version: "1.0",
    source_system: "pixy",
    exported_at: new Date().toISOString(),
    collaborators: [
      {
        email: "carlos.mendoza@agencia.com",
        first_name: "Carlos",
        last_name: "Mendoza",
        phone: "+573001234567",
        role: "Líder Técnico",
        task_role: "pm",
        is_active: true,
        workspaces_access: ["TECH"],
      },
      {
        email: "ana.gomez@agencia.com",
        first_name: "Ana",
        last_name: "Gómez",
        role: "QA Engineer",
        task_role: "qa_lead",
        is_active: true,
        workspaces_access: ["TECH"],
      },
    ],
    workspaces: [
      {
        key_prefix: "TECH",
        name: "Tecnología & Desarrollo",
        slug: "tecnologia-desarrollo",
        description: "Espacio de trabajo del equipo técnico",
        color: "#3b82f6",
        icon: "Layers",
        lead_email: "carlos.mendoza@agencia.com",
      },
    ],
    projects: [
      {
        workspace_key: "TECH",
        name: "Plataforma Core",
        slug: "plataforma-core",
        description: "Módulos principales del sistema Pixy",
        color: "#8ec045",
        icon: "Folder",
        status: "active",
        lead_email: "carlos.mendoza@agencia.com",
      },
    ],
    sprints: [
      {
        name: "Sprint 1",
        goal: "Lanzamiento del módulo y validación operativa",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        duration_days: 14,
        status: "active",
        auto_rollover: true,
        project_slug: "plataforma-core",
      },
    ],
    tasks: [
      {
        import_ref_id: "T-101",
        project_slug: "plataforma-core",
        workspace_key: "TECH",
        title: "Diseñar interfaz de carga masiva de tareas",
        description: "Implementar la ventana modal con soporte de drag & drop para JSON y CSV.",
        type: "feature",
        status: "in_progress",
        priority: "high",
        progress_percentage: 60,
        estimated_hours: 8,
        actual_hours: 5,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        assignee_email: "carlos.mendoza@agencia.com",
        qa_email: "ana.gomez@agencia.com",
        sprint_name: "Sprint 1",
        tags: ["frontend", "urgente"],
        checklist: [
          {
            title: "Crear componentes Dropzone",
            completed: true,
            estimated_hours: 3,
            actual_hours: 3,
            assigned_email: "carlos.mendoza@agencia.com",
          },
          {
            title: "Conectar validación de esquemas Zod",
            completed: false,
            estimated_hours: 5,
            actual_hours: 2,
            assigned_email: "carlos.mendoza@agencia.com",
          },
        ],
        blocked_by_ref_id: null,
        blocked_reason: null,
      },
      {
        import_ref_id: "T-102",
        project_slug: "plataforma-core",
        workspace_key: "TECH",
        title: "Endpoint de procesamiento masivo en Supabase",
        description: "Crear Server Action para insertar en orden topológico con resolución de bloqueos.",
        type: "task",
        status: "todo",
        priority: "urgent",
        progress_percentage: 0,
        estimated_hours: 10,
        actual_hours: 0,
        assignee_email: "carlos.mendoza@agencia.com",
        sprint_name: "Sprint 1",
        tags: ["backend", "database"],
        checklist: [],
        blocked_by_ref_id: "T-101",
        blocked_reason: "Depende de la definición de los esquemas en la interfaz",
      },
    ],
  };

  return JSON.stringify(sample, null, 2);
}

export function generateSampleTasksCsv(): string {
  const headers = [
    "ref_id",
    "title",
    "description",
    "project",
    "workspace",
    "type",
    "status",
    "priority",
    "progress",
    "estimated_hours",
    "actual_hours",
    "due_date",
    "assignee_email",
    "qa_email",
    "sprint",
    "tags",
    "checklist",
    "blocked_by",
  ];

  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const in14Days = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  const rows = [
    [
      "REF-001",
      "Configurar base de datos y migraciones",
      "Crear tablas de sprints y dependencias en Supabase",
      "Plataforma Core",
      "TECH",
      "task",
      "done",
      "high",
      "100",
      "6",
      "6",
      in7Days,
      "carlos.mendoza@agencia.com",
      "ana.gomez@agencia.com",
      "Sprint 1",
      "backend,database",
      "[x] Escribir DDL SQL; [x] Aplicar en staging",
      "",
    ],
    [
      "REF-002",
      "Implementar panel de métricas ágiles",
      "Desarrollar componentes Recharts para burn down y salud de sprint",
      "Plataforma Core",
      "TECH",
      "feature",
      "in_progress",
      "urgent",
      "60",
      "12",
      "7",
      in14Days,
      "carlos.mendoza@agencia.com",
      "ana.gomez@agencia.com",
      "Sprint 1",
      "frontend,urgente",
      "[x] Gráfico de barras (4h @carlos.mendoza@agencia.com); [ ] Gráfico Donut (3h); [ ] Tabla de balance (5h)",
      "REF-001",
    ],
    [
      "REF-003",
      "Pruebas de regresión y control de calidad",
      "Validar flujo completo de asignaciones y bloqueos",
      "Plataforma Core",
      "TECH",
      "task",
      "todo",
      "medium",
      "0",
      "8",
      "0",
      in14Days,
      "ana.gomez@agencia.com",
      "",
      "Sprint 1",
      "qa,pruebas",
      "[ ] Caso de prueba 1 (2h); [ ] Caso de prueba 2 (4h)",
      "REF-002",
    ],
  ];

  return Papa.unparse({
    fields: headers,
    data: rows,
  });
}

export function generateSampleCollaboratorsCsv(): string {
  const headers = ["email", "first_name", "last_name", "role", "task_role", "phone", "workspaces"];
  const rows = [
    ["carlos.mendoza@agencia.com", "Carlos", "Mendoza", "Líder Técnico", "pm", "+573001234567", "TECH,OPS"],
    ["ana.gomez@agencia.com", "Ana", "Gómez", "QA Engineer", "qa_lead", "+573009876543", "TECH"],
    ["david.silva@agencia.com", "David", "Silva", "Frontend Developer", "developer", "+573112223344", "TECH"],
    ["laura.rojas@agencia.com", "Laura", "Rojas", "UI/UX Designer", "designer", "+573205556677", "TECH,MKT"],
  ];

  return Papa.unparse({
    fields: headers,
    data: rows,
  });
}

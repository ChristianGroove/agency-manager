"use server"

import { createClient } from "@/modules/core/database/supabase-server";
import { supabaseAdmin } from "@/modules/core/database/supabase-admin";
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions";
import { revalidatePath } from "next/cache";
import type { TaskItem, TaskStatus, TaskComment } from "../types";
import { TASK_STATUS_LABELS, normalizeTask } from "../types";
import {
  calculateBusinessHours,
  getTaskStalledInfo,
  isTaskStalled,
  type TaskStalledInfo,
} from "../utils/business-hours-utils";

export interface StalledTaskWatchdogItem {
  task: TaskItem;
  stalledInfo: TaskStalledInfo;
}

export interface WatchdogScanResult {
  success: boolean;
  timestamp: string;
  organizationId: string;
  totalActiveTasks: number;
  totalStalledTasks: number;
  alertsCreated: number;
  stalledTasks: StalledTaskWatchdogItem[];
  error?: string;
}

/**
 * Resuelve el identificador de la organizacion garantizando aislamiento multitenant estricto.
 */
async function resolveOrgId(providedOrgId?: string): Promise<string> {
  const currentOrgId = await getCurrentOrganizationId();
  let orgId = currentOrgId;

  if (providedOrgId && providedOrgId !== currentOrgId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No autorizado");

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", providedOrgId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      throw new Error("No autorizado para la organizacion indicada");
    }
    orgId = providedOrgId;
  }

  if (!orgId) throw new Error("Organizacion no encontrada en el contexto actual");
  return orgId;
}

/**
 * Consulta todas las tareas estancadas de la organizacion con calculo de horas habiles.
 */
export async function getStalledTasksWatchdog(
  orgId?: string,
  thresholdHours: number = 48
): Promise<{ success: boolean; data: StalledTaskWatchdogItem[]; error?: string }> {
  try {
    const verifiedOrgId = await resolveOrgId(orgId);
    const now = new Date();
    const safeThreshold =
      typeof thresholdHours === "number" && !isNaN(thresholdHours) && thresholdHours > 0
        ? thresholdHours
        : 48;

    const { data: rawTasks, error } = await supabaseAdmin
      .from("task_items")
      .select(`
        *,
        project:task_projects!task_items_project_id_fkey(
          id,
          name,
          color,
          key,
          workspace:task_workspaces!task_projects_workspace_id_fkey(id, name, key_prefix)
        ),
        assigned_staff:organization_staff!task_items_assigned_staff_id_fkey(id, first_name, last_name, photo_url, role, task_role),
        qa_staff:organization_staff!task_items_qa_staff_id_fkey(id, first_name, last_name, photo_url, role, task_role),
        blocked_by:task_items!task_items_blocked_by_task_id_fkey(id, ticket_code, title, status)
      `)
      .eq("organization_id", verifiedOrgId)
      .neq("type", "meeting")
      .in("status", ["in_progress", "in_review", "blocked"])
      .order("updated_at", { ascending: true });

    if (error) {
      console.error("[Watchdog Actions] Error al consultar tareas estancadas:", error);
      return { success: false, data: [], error: error.message };
    }

    const normalizedList: TaskItem[] = (rawTasks || []).map(normalizeTask);
    const stalledItems: StalledTaskWatchdogItem[] = [];

    for (const t of normalizedList) {
      if (isTaskStalled(t, now, safeThreshold)) {
        stalledItems.push({
          task: t,
          stalledInfo: getTaskStalledInfo(t, now, safeThreshold),
        });
      }
    }

    // Ordenar de mayor a menor estancamiento
    stalledItems.sort((a, b) => b.stalledInfo.businessHours - a.stalledInfo.businessHours);

    return { success: true, data: stalledItems };
  } catch (err: any) {
    console.error("[Watchdog Actions] Excepcion en getStalledTasksWatchdog:", err);
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Ejecuta un barrido manual del Guardian para la organizacion, generando alertas de auditoria idempotentes.
 */
export async function runWatchdogManualScanAction(
  orgId?: string,
  thresholdHours: number = 48,
  createAuditAlerts: boolean = true
): Promise<WatchdogScanResult> {
  try {
    const verifiedOrgId = await resolveOrgId(orgId);
    const now = new Date();
    const safeThreshold =
      typeof thresholdHours === "number" && !isNaN(thresholdHours) && thresholdHours > 0
        ? thresholdHours
        : 48;

    const { data: rawTasks, error } = await supabaseAdmin
      .from("task_items")
      .select(`
        id,
        organization_id,
        ticket_code,
        title,
        status,
        type,
        updated_at,
        created_at,
        assigned_staff_id,
        qa_staff_id
      `)
      .eq("organization_id", verifiedOrgId)
      .neq("type", "meeting")
      .in("status", ["in_progress", "in_review", "blocked"]);

    if (error) {
      throw error;
    }

    const tasks = rawTasks || [];
    const stalledList = tasks.filter((t) => isTaskStalled(t, now, safeThreshold));
    let alertsCreated = 0;
    const stalledResults: StalledTaskWatchdogItem[] = [];

    // Pre-cargar alertas previas del Guardian en lote para eliminar patron N+1
    const lastAlertByTaskId = new Map<string, Date>();
    if (createAuditAlerts && stalledList.length > 0) {
      const taskIds = stalledList.map((t) => t.id);
      const { data: allExistingComments } = await supabaseAdmin
        .from("task_comments")
        .select("task_id, created_at")
        .in("task_id", taskIds)
        .eq("author_type", "system")
        .ilike("content", "%[Guardián de Tareas Estancadas]%")
        .order("created_at", { ascending: false });

      if (allExistingComments) {
        for (const c of allExistingComments) {
          const tid = c.task_id || (taskIds.length === 1 ? taskIds[0] : null);
          if (tid && !lastAlertByTaskId.has(tid)) {
            lastAlertByTaskId.set(tid, new Date(c.created_at));
          }
        }
      }
    }

    for (const task of stalledList) {
      const stalledInfo = getTaskStalledInfo(task, now, safeThreshold);
      const statusLabel = TASK_STATUS_LABELS[task.status as TaskStatus] || task.status;

      stalledResults.push({
        task: normalizeTask(task as any),
        stalledInfo,
      });

      if (!createAuditAlerts) continue;

      // Comprobar idempotencia en comentarios
      const lastAlertDate = lastAlertByTaskId.get(task.id);
      let shouldAlert = true;
      if (lastAlertDate) {
        const hoursSinceLastAlert = calculateBusinessHours(lastAlertDate, now);
        if (hoursSinceLastAlert < safeThreshold) {
          shouldAlert = false;
        }
      }

      if (shouldAlert) {
        const alertContent = `[Guardián de Tareas Estancadas] El ticket ${task.ticket_code ? `#${task.ticket_code}` : ""} "${task.title}" acumula ${stalledInfo.formattedTime} en estado "${statusLabel}" sin actividad registrada. Se requiere atención operativa o desbloqueo de impedimentos.`;

        const { error: insertErr } = await supabaseAdmin.from("task_comments").insert({
          organization_id: verifiedOrgId,
          task_id: task.id,
          author_type: "system",
          author_id: "system",
          author_name: "Guardián de Tareas",
          author_avatar: null,
          content: alertContent,
          mentions: [],
        });

        if (!insertErr) {
          alertsCreated++;
        }
      }
    }

    stalledResults.sort((a, b) => b.stalledInfo.businessHours - a.stalledInfo.businessHours);
    revalidatePath("/operations/tasks");

    return {
      success: true,
      timestamp: now.toISOString(),
      organizationId: verifiedOrgId,
      totalActiveTasks: tasks.length,
      totalStalledTasks: stalledList.length,
      alertsCreated,
      stalledTasks: stalledResults,
    };
  } catch (err: any) {
    console.error("[Watchdog Actions] Error en runWatchdogManualScanAction:", err);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      organizationId: orgId || "",
      totalActiveTasks: 0,
      totalStalledTasks: 0,
      alertsCreated: 0,
      stalledTasks: [],
      error: err.message,
    };
  }
}

/**
 * Registra una intervencion formal o recordatorio sobre un ticket estancado,
 * actualizando updated_at para certificar actividad viva y reiniciar el contador.
 */
export async function nudgeStalledTaskAction(
  taskId: string,
  note?: string
): Promise<{ success: boolean; comment?: TaskComment; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Obtener la tarea para validar tenencia y organizacion
    const { data: task, error: taskErr } = await supabaseAdmin
      .from("task_items")
      .select("id, organization_id, ticket_code, title")
      .eq("id", taskId)
      .single();

    if (taskErr || !task) {
      return { success: false, error: "Tarea no encontrada" };
    }

    const verifiedOrgId = await resolveOrgId(task.organization_id);

    const authorName = user?.user_metadata?.full_name || user?.email || "Gestor de Proyecto";
    const authorId = user?.id || "pm";
    const reminderText = note?.trim()
      ? `[Seguimiento PM] ${note.trim()}`
      : `[Seguimiento PM] Se solicita reporte de avance sobre este ticket para continuar el flujo del sprint.`;

    const { data: comment, error: commentErr } = await supabaseAdmin
      .from("task_comments")
      .insert({
        organization_id: verifiedOrgId,
        task_id: taskId,
        author_type: "owner",
        author_id: authorId,
        author_name: authorName,
        author_avatar: null,
        content: reminderText,
        mentions: [],
      })
      .select("*")
      .single();

    if (commentErr) {
      throw commentErr;
    }

    // Actualizar updated_at para certificar seguimiento activo
    const { error: updateErr } = await supabaseAdmin
      .from("task_items")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("organization_id", verifiedOrgId);

    if (updateErr) {
      throw updateErr;
    }

    revalidatePath("/operations/tasks");
    return { success: true, comment: comment as TaskComment };
  } catch (err: any) {
    console.error("[Watchdog Actions] Error en nudgeStalledTaskAction:", err);
    return { success: false, error: err.message };
  }
}

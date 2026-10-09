import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireCronSecret } from "@/app/api/_guards/request-guards";
import {
  calculateBusinessHours,
  isTaskStalled,
  getTaskStalledInfo,
} from "@/modules/features/tasks/utils/business-hours-utils";
import { TASK_STATUS_LABELS, TaskStatus } from "@/modules/features/tasks/types";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Credenciales de Supabase no configuradas para service role");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(req: NextRequest) {
  return handleWatchdog(req);
}

export async function POST(req: NextRequest) {
  return handleWatchdog(req);
}

async function handleWatchdog(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const supabase = getServiceClient();
    const now = new Date();

    const { searchParams } = new URL(req.url);
    const paramThreshold = searchParams.get("threshold_hours");
    const paramOrgId = searchParams.get("org_id");
    const isDryRun = searchParams.get("dry_run") === "true" || searchParams.get("dry_run") === "1";

    const parsedThreshold = paramThreshold ? parseInt(paramThreshold, 10) : NaN;
    const thresholdHours = !isNaN(parsedThreshold) && parsedThreshold > 0 ? parsedThreshold : 48;

    // 1. Consultar tareas activas elegibles para evaluacion de estancamiento
    let query = supabase
      .from("task_items")
      .select(`
        id,
        organization_id,
        project_id,
        ticket_code,
        title,
        status,
        type,
        updated_at,
        created_at,
        assigned_staff_id,
        qa_staff_id,
        blocked_reason
      `)
      .neq("type", "meeting")
      .in("status", ["in_progress", "in_review", "blocked"]);

    if (paramOrgId) {
      query = query.eq("organization_id", paramOrgId);
    }

    const { data: tasks, error: fetchErr } = await query;

    if (fetchErr) {
      console.error("[Cron Watchdog] Error al consultar tareas activas:", fetchErr);
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay tareas activas en los estados monitoreados",
        processed: 0,
        stalledCount: 0,
        alertsCreated: 0,
        thresholdHours,
        dryRun: isDryRun,
      });
    }

    // 2. Identificar tareas estancadas segun horas habiles
    const stalledTasks = tasks.filter((task) => isTaskStalled(task, now, thresholdHours));

    let alertsCreated = 0;
    const alertAuditDetails: Array<{
      taskId: string;
      ticketCode: string;
      title: string;
      businessHours: number;
      formattedTime: string;
      alertCreated: boolean;
      skipReason?: string;
    }> = [];

    // Pre-cargar alertas previas del Guardian en lote para eliminar el patron N+1
    const lastAlertByTaskId = new Map<string, Date>();
    if (!isDryRun && stalledTasks.length > 0) {
      const taskIds = stalledTasks.map((t) => t.id);
      const { data: allExistingComments } = await supabase
        .from("task_comments")
        .select("task_id, created_at")
        .in("task_id", taskIds)
        .eq("author_type", "system")
        .ilike("content", "%[Guardián de Tareas Estancadas]%")
        .order("created_at", { ascending: false });

      if (allExistingComments) {
        for (const c of allExistingComments) {
          if (!lastAlertByTaskId.has(c.task_id)) {
            lastAlertByTaskId.set(c.task_id, new Date(c.created_at));
          }
        }
      }
    }

    // 3. Procesar alertas idempotentes para tareas estancadas
    for (const task of stalledTasks) {
      const stalledInfo = getTaskStalledInfo(task, now, thresholdHours);
      const statusLabel = TASK_STATUS_LABELS[task.status as TaskStatus] || task.status;

      if (isDryRun) {
        alertAuditDetails.push({
          taskId: task.id,
          ticketCode: task.ticket_code,
          title: task.title,
          businessHours: stalledInfo.businessHours,
          formattedTime: stalledInfo.formattedTime,
          alertCreated: false,
          skipReason: "Modo simulacion (dry_run)",
        });
        continue;
      }

      // Validar si ya existe una alerta del Guardian en la ventana reciente para evitar spam
      const lastAlertDate = lastAlertByTaskId.get(task.id);
      let shouldAlert = true;
      if (lastAlertDate) {
        const hoursSinceLastAlert = calculateBusinessHours(lastAlertDate, now);
        if (hoursSinceLastAlert < thresholdHours) {
          shouldAlert = false;
        }
      }

      if (!shouldAlert) {
        alertAuditDetails.push({
          taskId: task.id,
          ticketCode: task.ticket_code,
          title: task.title,
          businessHours: stalledInfo.businessHours,
          formattedTime: stalledInfo.formattedTime,
          alertCreated: false,
          skipReason: "Alerta previa vigente dentro del umbral de horas habiles",
        });
        continue;
      }

      // Generar comentario de auditoria del Guardian (estrictamente CERO EMOJIS)
      const alertContent = `[Guardián de Tareas Estancadas] El ticket ${task.ticket_code ? `#${task.ticket_code}` : ""} "${task.title}" acumula ${stalledInfo.formattedTime} en estado "${statusLabel}" sin actividad registrada. Se requiere atención operativa o desbloqueo de impedimentos.`;

      const { error: insertErr } = await supabase.from("task_comments").insert({
        organization_id: task.organization_id,
        task_id: task.id,
        author_type: "system",
        author_id: "system",
        author_name: "Guardián de Tareas",
        author_avatar: null,
        content: alertContent,
        mentions: [],
      });

      if (insertErr) {
        console.error(`[Cron Watchdog] Error al insertar alerta para tarea ${task.id}:`, insertErr);
        alertAuditDetails.push({
          taskId: task.id,
          ticketCode: task.ticket_code,
          title: task.title,
          businessHours: stalledInfo.businessHours,
          formattedTime: stalledInfo.formattedTime,
          alertCreated: false,
          skipReason: `Fallo de insercion: ${insertErr.message}`,
        });
      } else {
        alertsCreated++;
        alertAuditDetails.push({
          taskId: task.id,
          ticketCode: task.ticket_code,
          title: task.title,
          businessHours: stalledInfo.businessHours,
          formattedTime: stalledInfo.formattedTime,
          alertCreated: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      processedTotal: tasks.length,
      stalledCount: stalledTasks.length,
      alertsCreated,
      thresholdHours,
      dryRun: isDryRun,
      details: alertAuditDetails,
    });
  } catch (err: any) {
    console.error("[Cron Watchdog] Excepcion inesperada:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

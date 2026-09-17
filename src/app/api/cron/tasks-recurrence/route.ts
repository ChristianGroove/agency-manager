import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isProductionRuntime, requireCronSecret } from "@/app/api/_guards/request-guards";
import type { RecurrenceInterval, TaskChecklistItem } from "@/modules/features/tasks/types";
import { calculateNextRecurrence } from "@/modules/features/tasks/utils/recurrence-utils";

export const dynamic = "force-dynamic";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase credentials for service role");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(req: NextRequest) {
  return handleRecurrence(req);
}

export async function POST(req: NextRequest) {
  return handleRecurrence(req);
}

async function handleRecurrence(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const supabase = getServiceClient();
    const now = new Date();

    // 1. Fetch recurring tasks that are due for renewal
    const { data: dueTasks, error: fetchErr } = await supabase
      .from("task_items")
      .select(`
        *,
        project:task_projects!task_items_project_id_fkey(
          id,
          workspace:task_workspaces!task_projects_workspace_id_fkey(key_prefix)
        )
      `)
      .eq("is_recurring", true)
      .lte("next_recurrence_at", now.toISOString());

    if (fetchErr) {
      console.error("[Cron Recurrence] Error fetching due tasks:", fetchErr);
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    if (!dueTasks || dueTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No recurring tasks due at this time",
        processed: 0,
      });
    }

    const createdTasks = [];

    for (const oldTask of dueTasks) {
      const interval: RecurrenceInterval = oldTask.recurrence_interval || "monthly";
      const dayOfMonth = oldTask.recurrence_day || 1;
      const nextRun = calculateNextRecurrence(interval, now, dayOfMonth);

      // Determine ticket code prefix
      let prefix = "TK";
      if ((oldTask as any).project?.workspace?.key_prefix) {
        prefix = (oldTask as any).project.workspace.key_prefix;
      }

      // Calculate sequential ticket code
      const { data: latestItems } = await supabase
        .from("task_items")
        .select("ticket_code")
        .eq("organization_id", oldTask.organization_id)
        .ilike("ticket_code", `${prefix}-%`)
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNum = 101;
      if (latestItems && latestItems.length > 0 && latestItems[0].ticket_code) {
        const match = latestItems[0].ticket_code.match(/(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      const newTicketCode = `${prefix}-${nextNum}`;

      // Reset checklist items for the new cycle while preserving target_week
      const freshChecklist = Array.isArray(oldTask.checklist)
        ? oldTask.checklist.map((c: TaskChecklistItem) => ({
            id: crypto.randomUUID(),
            title: c.title,
            completed: false,
            completed_at: null,
            completed_by: null,
            target_week: c.target_week || null,
          }))
        : [];

      const parentRecurringId = oldTask.parent_recurring_id || oldTask.id;

      // Insert new cycle instance
      const { data: newInstance, error: insertErr } = await supabase
        .from("task_items")
        .insert({
          organization_id: oldTask.organization_id,
          project_id: oldTask.project_id,
          ticket_code: newTicketCode,
          title: oldTask.title,
          description: oldTask.description,
          status: "todo",
          priority: oldTask.priority,
          type: oldTask.type,
          progress_percentage: 0,
          assigned_staff_id: oldTask.assigned_staff_id,
          created_by_staff_id: oldTask.created_by_staff_id,
          qa_staff_id: oldTask.qa_staff_id,
          due_date: nextRun.toISOString().split("T")[0],
          estimated_hours: oldTask.estimated_hours,
          actual_hours: 0,
          checklist: freshChecklist,
          tags: oldTask.tags || [],
          attachments: oldTask.attachments || [],
          is_recurring: true,
          recurrence_interval: interval,
          recurrence_day: dayOfMonth,
          parent_recurring_id: parentRecurringId,
          last_recurred_at: now.toISOString(),
          next_recurrence_at: nextRun.toISOString(),
        })
        .select("id, ticket_code, title")
        .single();

      if (insertErr) {
        console.error(`[Cron Recurrence] Error creating new cycle for task ${oldTask.id}:`, insertErr);
        continue;
      }

      // Mark old instance as non-recurring (historical cycle instance)
      await supabase
        .from("task_items")
        .update({
          is_recurring: false,
          last_recurred_at: now.toISOString(),
          parent_recurring_id: parentRecurringId,
        })
        .eq("id", oldTask.id);

      createdTasks.push(newInstance);
    }

    return NextResponse.json({
      success: true,
      processed: createdTasks.length,
      created: createdTasks,
    });
  } catch (error) {
    console.error("[Cron Recurrence] Unexpected failure:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

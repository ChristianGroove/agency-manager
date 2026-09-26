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
      const recurrenceDays = Array.isArray(oldTask.recurrence_days) ? oldTask.recurrence_days : null;
      const nextRun = calculateNextRecurrence(interval, now, dayOfMonth, recurrenceDays);

      // Atomic CAS claim: advance next_recurrence_at into the future immediately
      // If a concurrent cron run already picked this up, the .lte condition matches 0 rows
      const { data: claimedTask, error: claimErr } = await supabase
        .from("task_items")
        .update({
          next_recurrence_at: nextRun.toISOString(),
          last_recurred_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", oldTask.id)
        .lte("next_recurrence_at", now.toISOString())
        .select("id")
        .maybeSingle();

      if (claimErr || !claimedTask) {
        // Concurrently claimed by another worker; skip cleanly to prevent duplicates
        continue;
      }

      // Determine ticket code prefix
      let prefix = "TK";
      if ((oldTask as any).project?.workspace?.key_prefix) {
        prefix = (oldTask as any).project.workspace.key_prefix;
      }

      // Calculate sequential ticket code across latest 20 items to find true max integer
      const { data: latestItems } = await supabase
        .from("task_items")
        .select("ticket_code")
        .eq("organization_id", oldTask.organization_id)
        .ilike("ticket_code", `${prefix}-%`)
        .order("created_at", { ascending: false })
        .limit(20);

      let maxNum = 100;
      if (latestItems && latestItems.length > 0) {
        for (const item of latestItems) {
          if (!item.ticket_code) continue;
          const match = item.ticket_code.match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) {
              maxNum = num;
            }
          }
        }
      }
      const newTicketCode = `${prefix}-${maxNum + 1}`;

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

      // Reset meeting attendees for the new cycle (fresh attendance tracking)
      const durationHours = oldTask.meeting_duration_minutes ? Number(oldTask.meeting_duration_minutes) / 60 : 0.5;
      const freshMeetingAttendees = Array.isArray(oldTask.meeting_attendees)
        ? oldTask.meeting_attendees.map((a: any) => ({
            staff_id: a.staff_id,
            status: "pending",
            attended_at: null,
            check_in_method: null,
            hours_allocated: durationHours,
            notes: null,
          }))
        : [];

      // Calculate new meeting start time preserving original session hour/minute
      let newMeetingStartAt: string | null = null;
      if (oldTask.meeting_start_at) {
        const prevStart = new Date(oldTask.meeting_start_at);
        const scheduledNext = new Date(nextRun);
        if (!isNaN(prevStart.getTime())) {
          scheduledNext.setHours(prevStart.getHours(), prevStart.getMinutes(), 0, 0);
        }
        newMeetingStartAt = scheduledNext.toISOString();
      }

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
          recurrence_days: recurrenceDays,
          parent_recurring_id: parentRecurringId,
          last_recurred_at: now.toISOString(),
          next_recurrence_at: nextRun.toISOString(),
          meeting_modality: oldTask.meeting_modality || (oldTask.type === "meeting" ? "virtual" : null),
          meeting_url: oldTask.meeting_url || null,
          meeting_location: oldTask.meeting_location || null,
          meeting_start_at: newMeetingStartAt,
          meeting_duration_minutes: oldTask.meeting_duration_minutes ?? (oldTask.type === "meeting" ? 30 : null),
          meeting_attendees: freshMeetingAttendees,
        })
        .select("id, ticket_code, title")
        .single();

      if (insertErr) {
        console.error(`[Cron Recurrence] Error creating new cycle for task ${oldTask.id}:`, insertErr);
        // Rollback next_recurrence_at so it can retry later
        await supabase
          .from("task_items")
          .update({ next_recurrence_at: oldTask.next_recurrence_at })
          .eq("id", oldTask.id);
        continue;
      }

      // Mark old instance as non-recurring (historical cycle instance)
      const oldInstanceUpdates: any = {
        is_recurring: false,
        last_recurred_at: now.toISOString(),
        parent_recurring_id: parentRecurringId,
      };

      // If old meeting was not yet completed, mark it done to prevent duplicate open sessions
      if (oldTask.type === "meeting" && oldTask.status !== "done") {
        oldInstanceUpdates.status = "done";
        oldInstanceUpdates.progress_percentage = 100;
      }

      await supabase
        .from("task_items")
        .update(oldInstanceUpdates)
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

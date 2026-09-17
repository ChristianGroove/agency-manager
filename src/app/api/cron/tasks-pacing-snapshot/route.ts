import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireCronSecret } from "@/app/api/_guards/request-guards";
import { parseTaskChecklist } from "@/modules/features/tasks/types";

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
  return handleSnapshot(req);
}

export async function POST(req: NextRequest) {
  return handleSnapshot(req);
}

async function handleSnapshot(req: NextRequest) {
  const unauthorized = requireCronSecret(req);
  if (unauthorized) return unauthorized;

  try {
    const supabase = getServiceClient();
    const now = new Date();
    const currentDay = now.getDate();

    // Determine target week to freeze (can be explicitly provided or inferred)
    const { searchParams } = new URL(req.url);
    const paramWeek = searchParams.get("week");

    let targetWeek: 1 | 2 | 3 | 4;
    if (paramWeek && ["1", "2", "3", "4"].includes(paramWeek)) {
      targetWeek = parseInt(paramWeek, 10) as 1 | 2 | 3 | 4;
    } else {
      targetWeek = currentDay <= 7 ? 1 : currentDay <= 14 ? 2 : currentDay <= 21 ? 3 : 4;
    }

    const weekKey = `s${targetWeek}` as "s1" | "s2" | "s3" | "s4";

    // 1. Fetch active tasks for snapshot recording
    const { data: tasks, error: fetchErr } = await supabase
      .from("task_items")
      .select("id, checklist, progress_percentage, status, weekly_snapshots")
      .neq("status", "archived");

    if (fetchErr) {
      console.error("[Cron Pacing Snapshot] Error fetching tasks:", fetchErr);
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tasks found to snapshot",
        processed: 0,
      });
    }

    let updatedCount = 0;

    for (const task of tasks) {
      const checklist = parseTaskChecklist(task.checklist);
      const itemsInWeek = checklist.filter((c) => c.target_week === targetWeek);

      let weekProgress: number;

      if (task.status === "done" || task.progress_percentage === 100) {
        weekProgress = 100;
      } else if (itemsInWeek.length > 0) {
        // Has explicit deliverables for this week
        const completedCount = itemsInWeek.filter((c) => c.completed).length;
        weekProgress = Math.round((completedCount / itemsInWeek.length) * 100);
      } else {
        // Standard slider task
        weekProgress = task.progress_percentage || 0;
      }

      const currentSnapshots = task.weekly_snapshots && typeof task.weekly_snapshots === "object"
        ? task.weekly_snapshots
        : {};

      const nextSnapshots = {
        ...currentSnapshots,
        [weekKey]: weekProgress,
      };

      const { error: updateErr } = await supabase
        .from("task_items")
        .update({
          weekly_snapshots: nextSnapshots,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (!updateErr) {
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pacing snapshot successfully recorded for Week ${targetWeek}`,
      targetWeek,
      weekKey,
      totalTasks: tasks.length,
      updatedCount,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error("[Cron Pacing Snapshot] Unhandled error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

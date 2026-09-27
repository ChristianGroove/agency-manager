// ==============================================================================
// PIXY EDU — SCHOOL SCHEDULES SERVER ACTIONS (HORARIOS SEMANALES)
// Module: module_school (School Space)
// Path: src/modules/features/school/actions/schedule-actions.ts
// ==============================================================================

"use server";

import { createClient } from "@/modules/core/database/supabase-server";
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions";
import { revalidatePath } from "next/cache";
import { SchoolScheduleSchema } from "../schemas/school.schema";
import type { SchoolSchedule, ActionResponse } from "../types/school.types";

async function resolveOrgId(providedOrgId?: string): Promise<string> {
  if (providedOrgId) return providedOrgId;
  const orgId = await getCurrentOrganizationId();
  if (!orgId) throw new Error("No se pudo resolver la organización activa");
  return orgId;
}

/**
 * Retrieves all schedule blocks for a specific course
 */
export async function getSchedulesByCourseAction(
  courseId: string
): Promise<ActionResponse<SchoolSchedule[]>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("school_schedules")
      .select(`
        *,
        course:school_courses (
          id,
          subject_name,
          color,
          icon,
          lead_teacher:organization_staff (
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq("organization_id", orgId)
      .eq("course_id", courseId)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("block_start_time", { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: (data || []) as unknown as SchoolSchedule[],
    };
  } catch (err: any) {
    console.error("[ACTION:getSchedulesByCourseAction] Error:", err);
    return { success: false, error: err?.message || "Error al obtener horario del curso" };
  }
}

/**
 * Retrieves full weekly timetable (Lunes-Viernes) for an entire grade/section
 */
export async function getSectionWeeklyTimetableAction(
  sectionId: string
): Promise<ActionResponse<SchoolSchedule[]>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    // 1. Get courses in this section
    const { data: courses, error: coursesErr } = await supabase
      .from("school_courses")
      .select("id")
      .eq("organization_id", orgId)
      .eq("section_id", sectionId);

    if (coursesErr) throw coursesErr;

    const courseIds = (courses || []).map((c) => c.id);
    if (courseIds.length === 0) {
      return { success: true, data: [] };
    }

    // 2. Fetch all active schedules for these courses
    const { data, error } = await supabase
      .from("school_schedules")
      .select(`
        *,
        course:school_courses (
          id,
          subject_name,
          color,
          icon,
          lead_teacher:organization_staff (
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq("organization_id", orgId)
      .in("course_id", courseIds)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("block_start_time", { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: (data || []) as unknown as SchoolSchedule[],
    };
  } catch (err: any) {
    console.error("[ACTION:getSectionWeeklyTimetableAction] Error:", err);
    return { success: false, error: err?.message || "Error al cargar grilla de horarios del grupo" };
  }
}

/**
 * Creates a single weekly schedule block
 */
export async function createScheduleBlockAction(
  rawInput: unknown
): Promise<ActionResponse<SchoolSchedule>> {
  try {
    const orgId = await resolveOrgId();
    const validated = SchoolScheduleSchema.parse(rawInput);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("school_schedules")
      .insert({
        organization_id: orgId,
        course_id: validated.course_id,
        day_of_week: validated.day_of_week,
        block_start_time: validated.block_start_time,
        block_end_time: validated.block_end_time,
        block_number: validated.block_number || null,
        classroom_location: validated.classroom_location || null,
        recurrence: validated.recurrence || "weekly",
        is_active: validated.is_active ?? true,
      })
      .select(`
        *,
        course:school_courses (
          id,
          subject_name,
          color,
          icon
        )
      `)
      .single();

    if (error) throw error;

    revalidatePath("/school");

    return {
      success: true,
      data: data as unknown as SchoolSchedule,
    };
  } catch (err: any) {
    console.error("[ACTION:createScheduleBlockAction] Error:", err);
    return { success: false, error: err?.message || "Error al programar bloque de clase" };
  }
}

/**
 * Deletes or deactivates a schedule block
 */
export async function deleteScheduleBlockAction(
  scheduleId: string
): Promise<ActionResponse<boolean>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("school_schedules")
      .delete()
      .eq("id", scheduleId)
      .eq("organization_id", orgId);

    if (error) throw error;

    revalidatePath("/school");

    return { success: true, data: true };
  } catch (err: any) {
    console.error("[ACTION:deleteScheduleBlockAction] Error:", err);
    return { success: false, error: err?.message || "Error al eliminar bloque de clase" };
  }
}

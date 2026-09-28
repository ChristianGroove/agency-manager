// ==============================================================================
// PIXY EDU — STUDENT OBSERVER SERVER ACTIONS (LEY 115)
// Module: module_school (School Space)
// Path: src/modules/features/school/actions/observer-actions.ts
// ==============================================================================

"use server";

import { createClient } from "@/modules/core/database/supabase-server";
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions";
import { revalidatePath } from "next/cache";
import { SchoolObserverLogSchema } from "../schemas/school.schema";
import { resolveOrEnsureStaff } from "./staff-resolver";
import type { SchoolObserverLog, ActionResponse } from "../types/school.types";

async function resolveOrgId(providedOrgId?: string): Promise<string> {
  if (providedOrgId) return providedOrgId;
  const orgId = await getCurrentOrganizationId();
  if (!orgId) throw new Error("No se pudo resolver la organización activa");
  return orgId;
}

/**
 * Retrieves all observer logs for a specific student enrollment
 */
export async function getStudentObserverLogsAction(
  enrollmentId: string
): Promise<ActionResponse<SchoolObserverLog[]>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("school_student_observer_logs")
      .select(`
        *,
        logged_by_staff:organization_staff (
          id,
          first_name,
          last_name,
          email
        ),
        period:school_periods (
          id,
          name,
          period_number
        )
      `)
      .eq("organization_id", orgId)
      .eq("enrollment_id", enrollmentId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: (data || []) as unknown as SchoolObserverLog[],
    };
  } catch (err: any) {
    console.error("[ACTION:getStudentObserverLogsAction] Error:", err);
    return { success: false, error: err?.message || "Error al obtener anotaciones del observador" };
  }
}

/**
 * Creates a new pedagogical / disciplinary note in student observer (Ley 115)
 */
export async function createStudentObserverLogAction(
  rawInput: unknown
): Promise<ActionResponse<SchoolObserverLog>> {
  try {
    const orgId = await resolveOrgId();
    const validated = SchoolObserverLogSchema.parse(rawInput);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Resolve logged_by_staff_id from current session
    const staff = await resolveOrEnsureStaff(supabase, orgId, user, "docente");
    const staffId = staff.id;

    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("school_student_observer_logs")
      .insert({
        organization_id: orgId,
        enrollment_id: validated.enrollment_id,
        period_id: validated.period_id || null,
        logged_by_staff_id: staffId,
        log_type: validated.log_type,
        title: validated.title,
        description: validated.description,
        context_location: validated.context_location || null,
        student_statement: validated.student_statement || null,
        student_commitment: validated.student_commitment || null,
        guardian_commitment: validated.guardian_commitment || null,
        institutional_actions: validated.institutional_actions || null,
        is_resolved: validated.is_resolved || false,
        follow_up_date: validated.follow_up_date || null,
        student_signed_at: validated.student_signed ? nowIso : null,
        guardian_signed_at: validated.guardian_signed ? nowIso : null,
        staff_signed_at: nowIso,
      })
      .select(`
        *,
        logged_by_staff:organization_staff (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    revalidatePath("/school");

    return {
      success: true,
      data: data as unknown as SchoolObserverLog,
    };
  } catch (err: any) {
    console.error("[ACTION:createStudentObserverLogAction] Error:", err);
    return { success: false, error: err?.message || "Error al crear anotación en el observador" };
  }
}

/**
 * Updates commitments, descargos, or resolution state of an existing log
 */
export async function updateStudentObserverLogAction(
  logId: string,
  updates: {
    student_statement?: string;
    student_commitment?: string;
    guardian_commitment?: string;
    institutional_actions?: string;
    is_resolved?: boolean;
    follow_up_date?: string | null;
  }
): Promise<ActionResponse<SchoolObserverLog>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("school_student_observer_logs")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logId)
      .eq("organization_id", orgId)
      .select(`
        *,
        logged_by_staff:organization_staff (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (error) throw error;

    revalidatePath("/school");

    return {
      success: true,
      data: data as unknown as SchoolObserverLog,
    };
  } catch (err: any) {
    console.error("[ACTION:updateStudentObserverLogAction] Error:", err);
    return { success: false, error: err?.message || "Error al actualizar registro del observador" };
  }
}

/**
 * Records electronic signature (due process compliance Ley 115)
 */
export async function signStudentObserverLogAction(
  logId: string,
  signer: "student" | "guardian" | "staff"
): Promise<ActionResponse<{ signedAt: string }>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();
    const nowIso = new Date().toISOString();

    const updatePayload: Record<string, string> = {
      updated_at: nowIso,
    };

    if (signer === "student") {
      updatePayload.student_signed_at = nowIso;
    } else if (signer === "guardian") {
      updatePayload.guardian_signed_at = nowIso;
    } else {
      updatePayload.staff_signed_at = nowIso;
    }

    const { error } = await supabase
      .from("school_student_observer_logs")
      .update(updatePayload)
      .eq("id", logId)
      .eq("organization_id", orgId);

    if (error) throw error;

    revalidatePath("/school");

    return {
      success: true,
      data: { signedAt: nowIso },
    };
  } catch (err: any) {
    console.error("[ACTION:signStudentObserverLogAction] Error:", err);
    return { success: false, error: err?.message || "Error al estampar firma en el observador" };
  }
}

/**
 * Retrieves organization-wide observer logs (for Academic Coordination radar)
 */
export async function getObserverLogsByOrganizationAction(filters?: {
  periodId?: string;
  logType?: string;
  isResolved?: boolean;
}): Promise<ActionResponse<SchoolObserverLog[]>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    let query = supabase
      .from("school_student_observer_logs")
      .select(`
        *,
        enrollment:school_enrollments (
          id,
          student_code,
          student:leads (
            id,
            name
          ),
          section:school_sections (
            id,
            name
          )
        ),
        logged_by_staff:organization_staff (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (filters?.periodId) {
      query = query.eq("period_id", filters.periodId);
    }
    if (filters?.logType) {
      query = query.eq("log_type", filters.logType);
    }
    if (filters?.isResolved !== undefined) {
      query = query.eq("is_resolved", filters.isResolved);
    }

    const { data, error } = await query.limit(100);

    if (error) throw error;

    const logs = (data || []).map((log: any) => {
      const en = log.enrollment;
      if (en?.student) {
        const parts = (en.student.name || "").trim().split(" ");
        en.student.first_name = parts[0] || en.student.first_name || "";
        en.student.last_name = parts.slice(1).join(" ") || en.student.last_name || "";
      }
      return log;
    });

    return {
      success: true,
      data: logs as unknown as SchoolObserverLog[],
    };
  } catch (err: any) {
    console.error("[ACTION:getObserverLogsByOrganizationAction] Error:", err);
    return { success: false, error: err?.message || "Error al consultar bitácora general del observador" };
  }
}

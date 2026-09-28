// ==============================================================================
// PIXY EDU — PIAR SERVER ACTIONS (DECRETO 1421 DE 2017)
// Module: module_school (School Space)
// Path: src/modules/features/school/actions/piar-actions.ts
// ==============================================================================

"use server";

import { createClient } from "@/modules/core/database/supabase-server";
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions";
import { revalidatePath } from "next/cache";
import { SchoolPiarPlanSchema } from "../schemas/school.schema";
import { resolveOrEnsureStaff } from "./staff-resolver";
import type { SchoolPiarPlan, CurricularAdaptation, ActionResponse } from "../types/school.types";

async function resolveOrgId(providedOrgId?: string): Promise<string> {
  if (providedOrgId) return providedOrgId;
  const orgId = await getCurrentOrganizationId();
  if (!orgId) throw new Error("No se pudo resolver la organización activa");
  return orgId;
}

/**
 * Retrieves the PIAR plan for an enrolled student
 */
export async function getPiarPlanByEnrollmentAction(
  enrollmentId: string,
  academicYearId?: string
): Promise<ActionResponse<SchoolPiarPlan | null>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    let query = supabase
      .from("school_piar_plans")
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
        created_by_staff:organization_staff!created_by_staff_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq("organization_id", orgId)
      .eq("enrollment_id", enrollmentId);

    if (academicYearId) {
      query = query.eq("academic_year_id", academicYearId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    if (data && (data as any).enrollment?.student) {
      const en = (data as any).enrollment;
      const parts = (en.student.name || "").trim().split(" ");
      en.student.first_name = parts[0] || en.student.first_name || "";
      en.student.last_name = parts.slice(1).join(" ") || en.student.last_name || "";
    }

    return {
      success: true,
      data: (data || null) as unknown as SchoolPiarPlan | null,
    };
  } catch (err: any) {
    console.error("[ACTION:getPiarPlanByEnrollmentAction] Error:", err);
    return { success: false, error: err?.message || "Error al cargar Plan PIAR" };
  }
}

/**
 * Retrieves all PIAR plans for the school inclusion and counseling department
 */
export async function getAllPiarPlansAction(filters?: {
  status?: string;
  academicYearId?: string;
}): Promise<ActionResponse<SchoolPiarPlan[]>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    let query = supabase
      .from("school_piar_plans")
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
        created_by_staff:organization_staff!created_by_staff_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.academicYearId) {
      query = query.eq("academic_year_id", filters.academicYearId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const plans = (data || []).map((p: any) => {
      const en = p.enrollment;
      if (en?.student) {
        const parts = (en.student.name || "").trim().split(" ");
        en.student.first_name = parts[0] || en.student.first_name || "";
        en.student.last_name = parts.slice(1).join(" ") || en.student.last_name || "";
      }
      return p;
    });

    return {
      success: true,
      data: plans as unknown as SchoolPiarPlan[],
    };
  } catch (err: any) {
    console.error("[ACTION:getAllPiarPlansAction] Error:", err);
    return { success: false, error: err?.message || "Error al obtener planes PIAR institucionales" };
  }
}

/**
 * Creates or updates a student's PIAR (Decreto 1421)
 */
export async function savePiarPlanAction(
  rawInput: unknown
): Promise<ActionResponse<SchoolPiarPlan>> {
  try {
    const orgId = await resolveOrgId();
    const validated = SchoolPiarPlanSchema.parse(rawInput);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Resolve staff id for creator/orientador
    const staff = await resolveOrEnsureStaff(supabase, orgId, user, "orientador");
    const staffId = staff.id;

    const payload = {
      organization_id: orgId,
      enrollment_id: validated.enrollment_id,
      academic_year_id: validated.academic_year_id,
      medical_diagnosis: validated.medical_diagnosis || null,
      diagnosed_barriers: validated.diagnosed_barriers,
      individual_strengths: validated.individual_strengths || null,
      curricular_adaptations: validated.curricular_adaptations,
      pedagogical_goals: validated.pedagogical_goals,
      family_commitments: validated.family_commitments || null,
      school_commitments: validated.school_commitments || null,
      review_period: validated.review_period,
      status: validated.status || "draft",
      created_by_staff_id: staffId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("school_piar_plans")
      .upsert(payload, { onConflict: "enrollment_id,academic_year_id" })
      .select(`
        *,
        enrollment:school_enrollments (
          id,
          student_code,
          student:leads (
            id,
            name
          )
        )
      `)
      .single();

    if (error) throw error;

    if (data && (data as any).enrollment?.student) {
      const en = (data as any).enrollment;
      const parts = (en.student.name || "").trim().split(" ");
      en.student.first_name = parts[0] || en.student.first_name || "";
      en.student.last_name = parts.slice(1).join(" ") || en.student.last_name || "";
    }

    revalidatePath("/school");

    return {
      success: true,
      data: data as unknown as SchoolPiarPlan,
    };
  } catch (err: any) {
    console.error("[ACTION:savePiarPlanAction] Error:", err);
    return { success: false, error: err?.message || "Error al guardar Plan PIAR" };
  }
}

/**
 * Approves a PIAR plan making it officially active for the academic cohort
 */
export async function approvePiarPlanAction(
  piarId: string
): Promise<ActionResponse<SchoolPiarPlan>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: staff } = await supabase
      .from("organization_staff")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", user?.id)
      .maybeSingle();

    const staffId = staff?.id || null;
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("school_piar_plans")
      .update({
        status: "active",
        approved_by_staff_id: staffId,
        last_reviewed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", piarId)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/school");

    return {
      success: true,
      data: data as unknown as SchoolPiarPlan,
    };
  } catch (err: any) {
    console.error("[ACTION:approvePiarPlanAction] Error:", err);
    return { success: false, error: err?.message || "Error al validar y activar Plan PIAR" };
  }
}

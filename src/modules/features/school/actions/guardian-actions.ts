// ==============================================================================
// PIXY EDU — SCHOOL GUARDIANS SERVER ACTIONS (MULTI-ACUDIENTE LEY 115 / DIAN)
// Module: module_school (School Space)
// Path: src/modules/features/school/actions/guardian-actions.ts
// ==============================================================================

"use server";

import { createClient } from "@/modules/core/database/supabase-server";
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions";
import { revalidatePath } from "next/cache";
import { SchoolGuardianSchema } from "../schemas/school.schema";
import type { SchoolGuardian, ActionResponse } from "../types/school.types";

async function resolveOrgId(providedOrgId?: string): Promise<string> {
  if (providedOrgId) return providedOrgId;
  const orgId = await getCurrentOrganizationId();
  if (!orgId) throw new Error("No se pudo resolver la organización activa");
  return orgId;
}

/**
 * Retrieves all registered guardians for a student
 */
export async function getStudentGuardiansAction(
  studentId: string
): Promise<ActionResponse<SchoolGuardian[]>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("school_guardians")
      .select("*")
      .eq("organization_id", orgId)
      .eq("student_id", studentId)
      .order("is_financial_responsible", { ascending: false })
      .order("is_primary_contact", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: (data || []) as unknown as SchoolGuardian[],
    };
  } catch (err: any) {
    console.error("[ACTION:getStudentGuardiansAction] Error:", err);
    return { success: false, error: err?.message || "Error al obtener acudientes del estudiante" };
  }
}

/**
 * Adds or updates a guardian (Madre, Padre, Acudiente Legal o Responsable Financiero DIAN)
 */
export async function saveGuardianAction(
  rawInput: unknown
): Promise<ActionResponse<SchoolGuardian>> {
  try {
    const orgId = await resolveOrgId();
    const validated = SchoolGuardianSchema.parse(rawInput);
    const supabase = await createClient();

    // If this guardian is marked as financial responsible, unmark any previous financial responsible for this student
    if (validated.is_financial_responsible) {
      await supabase
        .from("school_guardians")
        .update({ is_financial_responsible: false })
        .eq("organization_id", orgId)
        .eq("student_id", validated.student_id);
    }

    const payload = {
      organization_id: orgId,
      student_id: validated.student_id,
      relationship: validated.relationship,
      first_name: validated.first_name,
      last_name: validated.last_name,
      document_type: validated.document_type,
      document_number: validated.document_number,
      email: validated.email || null,
      phone: validated.phone,
      whatsapp_enabled: validated.whatsapp_enabled ?? true,
      is_primary_contact: validated.is_primary_contact ?? false,
      is_emergency_contact: validated.is_emergency_contact ?? false,
      is_financial_responsible: validated.is_financial_responsible ?? false,
      occupation: validated.occupation || null,
      company_name: validated.company_name || null,
      billing_address: validated.billing_address || null,
      city: validated.city || "Bogotá D.C.",
      notes: validated.notes || null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (validated.id) {
      result = await supabase
        .from("school_guardians")
        .update(payload)
        .eq("id", validated.id)
        .eq("organization_id", orgId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("school_guardians")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    revalidatePath("/school");

    return {
      success: true,
      data: result.data as unknown as SchoolGuardian,
    };
  } catch (err: any) {
    console.error("[ACTION:saveGuardianAction] Error:", err);
    return { success: false, error: err?.message || "Error al registrar acudiente" };
  }
}

/**
 * Deletes a guardian
 */
export async function deleteGuardianAction(
  guardianId: string
): Promise<ActionResponse<boolean>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("school_guardians")
      .delete()
      .eq("id", guardianId)
      .eq("organization_id", orgId);

    if (error) throw error;

    revalidatePath("/school");

    return { success: true, data: true };
  } catch (err: any) {
    console.error("[ACTION:deleteGuardianAction] Error:", err);
    return { success: false, error: err?.message || "Error al eliminar acudiente" };
  }
}

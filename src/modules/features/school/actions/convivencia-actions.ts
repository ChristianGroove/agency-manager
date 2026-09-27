// ==============================================================================
// PIXY EDU — CONVIVENCIA ESCOLAR SERVER ACTIONS (LEY 1620 DE 2013)
// Module: module_school (School Space)
// Path: src/modules/features/school/actions/convivencia-actions.ts
// ==============================================================================

"use server";

import { createClient } from "@/modules/core/database/supabase-server";
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions";
import { revalidatePath } from "next/cache";
import { SchoolConvivenciaIncidentSchema } from "../schemas/school.schema";
import { resolveOrEnsureStaff } from "./staff-resolver";
import type { SchoolConvivenciaIncident, ConvivenciaProtocolStep, ActionResponse } from "../types/school.types";

async function resolveOrgId(providedOrgId?: string): Promise<string> {
  if (providedOrgId) return providedOrgId;
  const orgId = await getCurrentOrganizationId();
  if (!orgId) throw new Error("No se pudo resolver la organización activa");
  return orgId;
}

/**
 * Retrieves all Convivencia incidents for the institution
 */
export async function getConvivenciaIncidentsAction(filters?: {
  incidentType?: string;
  status?: string;
}): Promise<ActionResponse<SchoolConvivenciaIncident[]>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    let query = supabase
      .from("school_convivencia_incidents")
      .select(`
        *,
        reporter_staff:organization_staff!reporter_staff_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq("organization_id", orgId)
      .order("date_occurred", { ascending: false });

    if (filters?.incidentType) {
      query = query.eq("incident_type", filters.incidentType);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: (data || []) as unknown as SchoolConvivenciaIncident[],
    };
  } catch (err: any) {
    console.error("[ACTION:getConvivenciaIncidentsAction] Error:", err);
    return { success: false, error: err?.message || "Error al obtener casos de convivencia escolar" };
  }
}

/**
 * Reports a new convivencia incident (Falta Tipo I, II o III)
 */
export async function createConvivenciaIncidentAction(
  rawInput: unknown
): Promise<ActionResponse<SchoolConvivenciaIncident>> {
  try {
    const orgId = await resolveOrgId();
    const validated = SchoolConvivenciaIncidentSchema.parse(rawInput);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Resolve staff id and staff name
    const staff = await resolveOrEnsureStaff(supabase, orgId, user, "coordinacion");
    const staffId = staff.id;
    const staffName = staff.name || "Coordinación";

    // Auto-generate sequential incident number (e.g., SEC-2026-001)
    const { count } = await supabase
      .from("school_convivencia_incidents")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);

    const yearStr = new Date().getFullYear();
    const seq = String((count || 0) + 1).padStart(3, "0");
    const incidentNumber = validated.incident_number || `SEC-${yearStr}-${seq}`;

    // Build initial protocol step
    const initialStep: ConvivenciaProtocolStep = {
      step_name: "Recepción y Registro de Situación",
      executed_at: new Date().toISOString(),
      executed_by_name: staffName,
      details: `Registro inicial clasificado como Falta ${validated.incident_type.toUpperCase().replace("_", " ")}.`,
    };

    const steps = validated.protocol_steps_applied.length > 0
      ? validated.protocol_steps_applied
      : [initialStep];

    const { data, error } = await supabase
      .from("school_convivencia_incidents")
      .insert({
        organization_id: orgId,
        incident_number: incidentNumber,
        incident_type: validated.incident_type,
        title: validated.title,
        description: validated.description,
        date_occurred: validated.date_occurred,
        location: validated.location || null,
        involved_students: validated.involved_students,
        reporter_staff_id: staffId,
        status: validated.status || "reported",
        protocol_steps_applied: steps,
        conciliation_agreements: validated.conciliation_agreements || null,
        committee_minutes: validated.committee_minutes || null,
        siuce_report_number: validated.siuce_report_number || null,
        reported_to_external_entities: validated.reported_to_external_entities || false,
      })
      .select(`
        *,
        reporter_staff:organization_staff!reporter_staff_id (
          id,
          first_name,
          last_name
        )
      `)
      .single();

    if (error) throw error;

    revalidatePath("/school");

    return {
      success: true,
      data: data as unknown as SchoolConvivenciaIncident,
    };
  } catch (err: any) {
    console.error("[ACTION:createConvivenciaIncidentAction] Error:", err);
    return { success: false, error: err?.message || "Error al radicar caso de convivencia" };
  }
}

/**
 * Appends a protocol action step (Ruta de Atención Integral)
 */
export async function addConvivenciaProtocolStepAction(
  incidentId: string,
  stepName: string,
  details?: string
): Promise<ActionResponse<SchoolConvivenciaIncident>> {
  try {
    const orgId = await resolveOrgId();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: staff } = await supabase
      .from("organization_staff")
      .select("first_name, last_name")
      .eq("organization_id", orgId)
      .eq("user_id", user?.id)
      .maybeSingle();

    const staffName = staff ? `${staff.first_name} ${staff.last_name}` : "Orientación Escolar";

    // Fetch existing incident
    const { data: current, error: fetchErr } = await supabase
      .from("school_convivencia_incidents")
      .select("protocol_steps_applied")
      .eq("id", incidentId)
      .eq("organization_id", orgId)
      .single();

    if (fetchErr) throw fetchErr;

    const currentSteps: ConvivenciaProtocolStep[] = (current.protocol_steps_applied as any) || [];
    const newStep: ConvivenciaProtocolStep = {
      step_name: stepName,
      executed_at: new Date().toISOString(),
      executed_by_name: staffName,
      details,
    };

    const updatedSteps = [...currentSteps, newStep];

    const { data, error } = await supabase
      .from("school_convivencia_incidents")
      .update({
        protocol_steps_applied: updatedSteps,
        updated_at: new Date().toISOString(),
      })
      .eq("id", incidentId)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/school");

    return {
      success: true,
      data: data as unknown as SchoolConvivenciaIncident,
    };
  } catch (err: any) {
    console.error("[ACTION:addConvivenciaProtocolStepAction] Error:", err);
    return { success: false, error: err?.message || "Error al agregar paso de protocolo" };
  }
}

/**
 * Registers official committee minutes or conciliation agreements and updates incident status
 */
export async function updateConvivenciaResolutionAction(
  incidentId: string,
  payload: {
    status: 'under_investigation' | 'conciliation_session' | 'committee_review' | 'sanctioned' | 'closed' | 'referred_siuce';
    conciliation_agreements?: string;
    committee_minutes?: string;
    siuce_report_number?: string;
    reported_to_external_entities?: boolean;
  }
): Promise<ActionResponse<SchoolConvivenciaIncident>> {
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

    const isClosing = payload.status === "closed";
    const updateData: Record<string, any> = {
      status: payload.status,
      updated_at: new Date().toISOString(),
    };

    if (payload.conciliation_agreements !== undefined) {
      updateData.conciliation_agreements = payload.conciliation_agreements;
    }
    if (payload.committee_minutes !== undefined) {
      updateData.committee_minutes = payload.committee_minutes;
    }
    if (payload.siuce_report_number !== undefined) {
      updateData.siuce_report_number = payload.siuce_report_number;
    }
    if (payload.reported_to_external_entities !== undefined) {
      updateData.reported_to_external_entities = payload.reported_to_external_entities;
    }
    if (isClosing) {
      updateData.closed_at = new Date().toISOString();
      updateData.closed_by_staff_id = staffId;
    }

    const { data, error } = await supabase
      .from("school_convivencia_incidents")
      .update(updateData)
      .eq("id", incidentId)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/school");

    return {
      success: true,
      data: data as unknown as SchoolConvivenciaIncident,
    };
  } catch (err: any) {
    console.error("[ACTION:updateConvivenciaResolutionAction] Error:", err);
    return { success: false, error: err?.message || "Error al actualizar resolución del caso" };
  }
}

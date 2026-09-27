// ==============================================================================
// PIXY EDU — ORGANIZATION STAFF RESOLVER
// Module: module_school (School Space)
// Path: src/modules/features/school/actions/staff-resolver.ts
// ==============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ResolvedStaff {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
}

/**
 * Resolves a valid organization_staff record for the authenticated user.
 * 1. Checks if the user already has a row in organization_staff.
 * 2. Checks by email if available.
 * 3. If none exists, provisions a staff profile for the user.
 * 4. Falls back to any active staff in the organization.
 * Guarantees that foreign key constraints on organization_staff(id) are satisfied.
 */
export async function resolveOrEnsureStaff(
  supabase: SupabaseClient<any, any, any>,
  orgId: string,
  user?: { id?: string; email?: string; user_metadata?: Record<string, any> } | null,
  fallbackRole: string = "docente"
): Promise<ResolvedStaff> {
  // 1. Check if user already has an active staff profile in this organization
  if (user?.id) {
    const { data: staff } = await supabase
      .from("organization_staff")
      .select("id, first_name, last_name, email, role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (staff) {
      return {
        id: staff.id,
        name: `${staff.first_name} ${staff.last_name}`.trim(),
        email: staff.email,
        role: staff.role,
      };
    }
  }

  // 2. Try to find by email if available
  if (user?.email) {
    const { data: staffByEmail } = await supabase
      .from("organization_staff")
      .select("id, first_name, last_name, email, role")
      .eq("organization_id", orgId)
      .eq("email", user.email)
      .maybeSingle();

    if (staffByEmail) {
      return {
        id: staffByEmail.id,
        name: `${staffByEmail.first_name} ${staffByEmail.last_name}`.trim(),
        email: staffByEmail.email,
        role: staffByEmail.role,
      };
    }
  }

  // 3. Auto-provision staff member if user is authenticated
  if (user?.id) {
    const firstName = user.user_metadata?.first_name || (user.email ? user.email.split("@")[0] : "Docente");
    const lastName = user.user_metadata?.last_name || "Institucional";

    const { data: createdStaff } = await supabase
      .from("organization_staff")
      .insert({
        organization_id: orgId,
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: user.email || null,
        role: fallbackRole,
        is_active: true,
      })
      .select("id, first_name, last_name, email, role")
      .maybeSingle();

    if (createdStaff) {
      return {
        id: createdStaff.id,
        name: `${createdStaff.first_name} ${createdStaff.last_name}`.trim(),
        email: createdStaff.email,
        role: createdStaff.role,
      };
    }
  }

  // 4. Fallback to any active staff in this organization
  const { data: anyStaff } = await supabase
    .from("organization_staff")
    .select("id, first_name, last_name, email, role")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (anyStaff) {
    return {
      id: anyStaff.id,
      name: `${anyStaff.first_name} ${anyStaff.last_name}`.trim(),
      email: anyStaff.email,
      role: anyStaff.role,
    };
  }

  throw new Error(
    "No se encontró personal institucional (organization_staff) registrado para asociar este registro académico"
  );
}

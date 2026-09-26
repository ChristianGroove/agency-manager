"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"
import {
  TenantTaskTag,
  DEFAULT_TENANT_TASK_TAGS,
  isStaffLeadOrPmRole
} from "../types"

/**
 * Resolve organization ID and permissions for tag operations
 */
async function resolveOrgAndAuthority(providedOrgId?: string, portalToken?: string) {
  if (portalToken) {
    const { data: staff, error } = await supabaseAdmin
      .from("organization_staff")
      .select("id, role, task_role, organization_id, is_active")
      .eq("access_token", portalToken)
      .eq("is_active", true)
      .maybeSingle()

    if (error || !staff) {
      throw new Error("Acceso de colaborador no autorizado o token inválido")
    }

    const isLeadOrPm = isStaffLeadOrPmRole(staff.role, (staff as any).task_role)

    return {
      organizationId: staff.organization_id,
      canManageCatalog: isLeadOrPm,
      staffId: staff.id,
      isPortal: true
    }
  }

  // Platform context: verify session and membership
  const currentOrgId = await getCurrentOrganizationId()
  let orgId = currentOrgId

  if (providedOrgId && providedOrgId !== currentOrgId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("No autorizado")

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", providedOrgId)
      .eq("user_id", user.id)
      .maybeSingle()

    const { isSuperAdmin } = await import("@/modules/core/iam/services/platform-roles")
    if (!membership && !(await isSuperAdmin(user.id))) {
      throw new Error("No tienes acceso a la organización especificada")
    }
    orgId = providedOrgId
  }

  if (!orgId) {
    throw new Error("No se pudo resolver la organización activa en plataforma")
  }

  // Platform users always have catalog management permissions
  return {
    organizationId: orgId,
    canManageCatalog: true,
    staffId: null,
    isPortal: false
  }
}

/**
 * Fetch all tags for the organization/tenant
 * Returns tags sorted: favorites (is_favorite: true) first, then alphabetical.
 */
export async function getTenantTaskTags(
  orgId?: string,
  portalToken?: string
): Promise<{ success: boolean; tags: TenantTaskTag[]; canManageCatalog: boolean; error?: string }> {
  try {
    const { organizationId, canManageCatalog } = await resolveOrgAndAuthority(orgId, portalToken)

    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select("id, app_metadata")
      .eq("id", organizationId)
      .single()

    if (error || !org) {
      throw error || new Error("Organización no encontrada")
    }

    const meta = (org.app_metadata || {}) as Record<string, any>
    let tags: TenantTaskTag[] = Array.isArray(meta.task_tags) ? meta.task_tags : []

    // If no tags exist yet, seed with defaults and persist
    if (tags.length === 0) {
      tags = [...DEFAULT_TENANT_TASK_TAGS]
      await supabaseAdmin
        .from("organizations")
        .update({
          app_metadata: {
            ...meta,
            task_tags: tags
          }
        })
        .eq("id", organizationId)
    }

    // Sort: favorites first, then by label/name
    const sorted = [...tags].sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1
      if (!a.is_favorite && b.is_favorite) return 1
      return (a.label || a.name).localeCompare(b.label || b.name)
    })

    return {
      success: true,
      tags: sorted,
      canManageCatalog
    }
  } catch (err: any) {
    console.error("Error al obtener etiquetas del tenant:", err)
    return {
      success: false,
      tags: DEFAULT_TENANT_TASK_TAGS,
      canManageCatalog: false,
      error: err.message
    }
  }
}

/**
 * Create a new global tag in the tenant
 * ONLY allowed for Platform and Portal Project Managers (isLeadOrPm)
 */
export async function createTenantTaskTag(
  params: {
    name: string
    label?: string
    color?: string
    is_favorite?: boolean
    orgId?: string
  },
  portalToken?: string
): Promise<{ success: boolean; tag?: TenantTaskTag; error?: string }> {
  try {
    const { organizationId, canManageCatalog, staffId } = await resolveOrgAndAuthority(params.orgId, portalToken)

    if (!canManageCatalog) {
      throw new Error("Solo los Gestores de Proyecto o la Plataforma pueden crear nuevas etiquetas globales.")
    }

    const rawName = (params.name || "").trim()
    const cleanId = rawName
      .toLowerCase()
      .replace(/^[#@]+/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "")

    if (!cleanId) {
      throw new Error("El nombre de la etiqueta no es válido.")
    }

    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select("id, app_metadata")
      .eq("id", organizationId)
      .single()

    if (error || !org) throw error || new Error("Organización no encontrada")

    const meta = (org.app_metadata || {}) as Record<string, any>
    const currentTags: TenantTaskTag[] = Array.isArray(meta.task_tags) ? meta.task_tags : [...DEFAULT_TENANT_TASK_TAGS]

    // Check if tag already exists
    const existingIndex = currentTags.findIndex(
      (t) => t.id.toLowerCase() === cleanId || t.name.toLowerCase() === cleanId
    )

    if (existingIndex >= 0) {
      return { success: true, tag: currentTags[existingIndex] }
    }

    const newTag: TenantTaskTag = {
      id: cleanId,
      name: cleanId,
      label: params.label?.trim() || rawName.replace(/^[#@]+/, ""),
      color: params.color || "blue",
      is_favorite: params.is_favorite ?? false,
      created_at: new Date().toISOString(),
      created_by: staffId || "platform"
    }

    const updatedTags = [...currentTags, newTag]

    await supabaseAdmin
      .from("organizations")
      .update({
        app_metadata: {
          ...meta,
          task_tags: updatedTags
        }
      })
      .eq("id", organizationId)

    revalidatePath("/operations/tasks")

    return {
      success: true,
      tag: newTag
    }
  } catch (err: any) {
    console.error("Error al crear etiqueta en tenant:", err)
    return { success: false, error: err.message }
  }
}

/**
 * Toggle favorite status of a tag
 * ONLY allowed for Platform and Portal Project Managers
 */
export async function toggleFavoriteTenantTaskTag(
  tagId: string,
  orgId?: string,
  portalToken?: string
): Promise<{ success: boolean; tags?: TenantTaskTag[]; error?: string }> {
  try {
    const { organizationId, canManageCatalog } = await resolveOrgAndAuthority(orgId, portalToken)

    if (!canManageCatalog) {
      throw new Error("Solo los Gestores de Proyecto o la Plataforma pueden modificar etiquetas favoritas.")
    }

    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select("id, app_metadata")
      .eq("id", organizationId)
      .single()

    if (error || !org) throw error || new Error("Organización no encontrada")

    const meta = (org.app_metadata || {}) as Record<string, any>
    const currentTags: TenantTaskTag[] = Array.isArray(meta.task_tags) ? meta.task_tags : [...DEFAULT_TENANT_TASK_TAGS]

    const updatedTags = currentTags.map((t) => {
      if (t.id === tagId || t.name === tagId) {
        return { ...t, is_favorite: !t.is_favorite }
      }
      return t
    })

    await supabaseAdmin
      .from("organizations")
      .update({
        app_metadata: {
          ...meta,
          task_tags: updatedTags
        }
      })
      .eq("id", organizationId)

    revalidatePath("/operations/tasks")

    return {
      success: true,
      tags: updatedTags
    }
  } catch (err: any) {
    console.error("Error al alternar favorita de etiqueta:", err)
    return { success: false, error: err.message }
  }
}

/**
 * Delete a tag from the tenant catalog
 * ONLY allowed for Platform and Portal Project Managers
 */
export async function deleteTenantTaskTag(
  tagId: string,
  orgId?: string,
  portalToken?: string
): Promise<{ success: boolean; tags?: TenantTaskTag[]; error?: string }> {
  try {
    const { organizationId, canManageCatalog } = await resolveOrgAndAuthority(orgId, portalToken)

    if (!canManageCatalog) {
      throw new Error("Solo los Gestores de Proyecto o la Plataforma pueden eliminar etiquetas del catálogo.")
    }

    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select("id, app_metadata")
      .eq("id", organizationId)
      .single()

    if (error || !org) throw error || new Error("Organización no encontrada")

    const meta = (org.app_metadata || {}) as Record<string, any>
    const currentTags: TenantTaskTag[] = Array.isArray(meta.task_tags) ? meta.task_tags : [...DEFAULT_TENANT_TASK_TAGS]

    const updatedTags = currentTags.filter((t) => t.id !== tagId && t.name !== tagId)

    await supabaseAdmin
      .from("organizations")
      .update({
        app_metadata: {
          ...meta,
          task_tags: updatedTags
        }
      })
      .eq("id", organizationId)

    revalidatePath("/operations/tasks")

    return {
      success: true,
      tags: updatedTags
    }
  } catch (err: any) {
    console.error("Error al eliminar etiqueta del catálogo:", err)
    return { success: false, error: err.message }
  }
}

/**
 * Check how many tasks currently have this tag assigned
 */
export async function getTagUsageCount(
  tagId: string,
  orgId?: string,
  portalToken?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { organizationId } = await resolveOrgAndAuthority(orgId, portalToken)

    const { count, error } = await supabaseAdmin
      .from("task_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .contains("tags", [tagId])

    if (error) throw error

    return {
      success: true,
      count: count || 0
    }
  } catch (err: any) {
    console.error("Error consultando uso de etiqueta:", err)
    return { success: false, count: 0, error: err.message }
  }
}


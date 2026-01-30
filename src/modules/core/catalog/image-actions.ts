"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { requireOrgRole } from "@/lib/auth/org-roles"
import { trackStorageUpload, validateStorageLimit } from "@/modules/core/storage/actions"

/**
 * Upload Service Catalog Image to Storage
 */
export async function uploadCatalogImage(formData: FormData) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        throw new Error("No organization context found")
    }

    // 1. Verify Authorization (Requires Admin/Owner)
    try {
        await requireOrgRole('admin')
    } catch (e) {
        throw new Error("Unauthorized: Solo administradores pueden subir archivos.")
    }

    const file = formData.get("file") as File
    if (!file) {
        throw new Error("No se ha seleccionado ningún archivo")
    }

    // 2. Validate against Org Storage Limits
    const validation = await validateStorageLimit(orgId, file.size)
    if (!validation.allowed) {
        throw new Error(validation.message || "Límite de almacenamiento alcanzado.")
    }

    // 3. Prepare File Path
    const fileExt = file.name.split(".").pop()
    const fileName = `${orgId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`
    const bucket = "catalog" // Should exist in Supabase

    // 4. Upload to Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
            upsert: true,
            contentType: file.type
        })

    if (uploadError) {
        // Fallback to 'branding' bucket if 'catalog' doesn't exist yet
        const { data: brandingData, error: brandingError } = await supabase.storage
            .from("branding")
            .upload(fileName, file, {
                upsert: true,
                contentType: file.type
            })

        if (brandingError) {
            console.error("Upload error in both buckets:", brandingError)
            throw new Error("Error al subir imagen al servidor de almacenamiento.")
        }

        // track usage
        await trackStorageUpload(orgId, file.size)

        const { data: { publicUrl } } = supabase.storage
            .from("branding")
            .getPublicUrl(fileName)

        return { success: true, url: publicUrl }
    }

    // 5. Track Storage Usage
    await trackStorageUpload(orgId, file.size)

    // 6. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

    return { success: true, url: publicUrl }
}

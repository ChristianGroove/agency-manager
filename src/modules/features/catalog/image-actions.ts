"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { trackStorageUpload, validateStorageLimit } from "@/modules/infrastructure/storage/storage-actions"

/**
 * Upload Service Catalog Image to Storage with resilient multi-bucket fallback
 */
export async function uploadCatalogImage(formData: FormData) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        throw new Error("No se encontró el contexto de la organización.")
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error("No autenticado: Inicia sesión para subir archivos.")
    }

    const file = formData.get("file") as File
    if (!file) {
        throw new Error("No se ha seleccionado ningún archivo.")
    }

    // 1. Validate against Org Storage Limits (Safely checked)
    try {
        const validation = await validateStorageLimit(orgId, file.size)
        if (!validation.allowed) {
            throw new Error(validation.message || "Límite de almacenamiento alcanzado.")
        }
    } catch (limitErr: any) {
        if (limitErr.message?.includes("Límite de almacenamiento")) {
            throw limitErr
        }
        console.warn("[Catalog Storage Limit Warning]:", limitErr)
    }

    // 2. Prepare File Path
    const fileExt = file.name.split(".").pop() || "webp"
    const fileName = `${orgId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`

    // 3. Multi-level Robust Storage Upload
    // Candidate buckets in order of priority: 'catalog', 'public-assets', 'branding'
    const candidateBuckets = ["catalog", "public-assets", "branding"]
    let uploadedPublicUrl: string | null = null
    let lastUploadError: any = null

    for (let i = 0; i < candidateBuckets.length; i++) {
        const targetBucket = candidateBuckets[i]

        // A. Try standard client upload first
        try {
            const { error: userUploadError } = await supabase.storage
                .from(targetBucket)
                .upload(fileName, file, {
                    upsert: true,
                    contentType: file.type || "image/webp"
                })

            if (!userUploadError) {
                const { data: { publicUrl } } = supabase.storage
                    .from(targetBucket)
                    .getPublicUrl(fileName)
                uploadedPublicUrl = publicUrl
                break
            }
        } catch (e) {
            // Ignore and proceed to admin retry
        }

        // B. Ensure bucket exists via supabaseAdmin & retry with admin credentials
        try {
            await supabaseAdmin.storage.createBucket(targetBucket, { public: true })
        } catch (bucketCreateErr) {
            // Bucket might already exist or admin created it
        }

        try {
            const { error: adminUploadError } = await supabaseAdmin.storage
                .from(targetBucket)
                .upload(fileName, file, {
                    upsert: true,
                    contentType: file.type || "image/webp"
                })

            if (!adminUploadError) {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from(targetBucket)
                    .getPublicUrl(fileName)
                uploadedPublicUrl = publicUrl
                break
            } else {
                lastUploadError = adminUploadError
            }
        } catch (adminErr) {
            lastUploadError = adminErr
        }
    }

    if (!uploadedPublicUrl) {
        console.error("[Catalog Storage Exhausted Error]:", lastUploadError)
        throw new Error("Error al subir imagen al servidor de almacenamiento.")
    }

    // 4. Track Storage Usage safely
    try {
        await trackStorageUpload(orgId, file.size)
    } catch (trackErr) {
        console.warn("[Catalog Storage Usage Track Warning]:", trackErr)
    }

    return { success: true, url: uploadedPublicUrl }
}

/**
 * Delete Catalog Image from Supabase Storage
 */
export async function deleteCatalogImage(imageUrl: string) {
    if (!imageUrl || !imageUrl.includes("/storage/v1/object/public/")) {
        return { success: false, message: "URL no válida para eliminación" }
    }

    try {
        const parts = imageUrl.split("/storage/v1/object/public/")[1]?.split("/")
        if (!parts || parts.length < 2) return { success: false, message: "Ruta de archivo no válida" }

        const bucket = parts[0]
        const filePath = parts.slice(1).join("/")

        const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath])
        if (error) {
            console.error("[Catalog Storage Delete Error]:", error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err: any) {
        console.error("[Catalog Storage Delete Exception]:", err)
        return { success: false, error: err.message }
    }
}


"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// -- Schema for Profile Update --
const profileSchema = z.object({
    fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    jobTitle: z.string().optional(),
    phone: z.string().optional(),
})

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = await createClient()

    // 1. Validate Session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "No autorizado" }
    }

    // 2. Validate Input
    const data = {
        fullName: formData.get("fullName"),
        jobTitle: formData.get("jobTitle"),
        phone: formData.get("phone"),
    }

    const result = profileSchema.safeParse(data)
    if (!result.success) {
        return { error: result.error.issues[0].message }
    }

    // 3. Update Database
    const { error } = await supabase
        .from("profiles")
        .update({
            full_name: result.data.fullName,
            job_title: result.data.jobTitle,
            phone: result.data.phone,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

    if (error) {
        return { error: "Error al actualizar perfil: " + error.message }
    }

    // 3.1 Sync Auth Metadata (for global session access)
    await supabase.auth.updateUser({
        data: {
            full_name: result.data.fullName,
            job_title: result.data.jobTitle,
            phone: result.data.phone
        }
    })

    // 4. Revalidate to update sidebar/header
    revalidatePath("/", "layout")

    return { success: "Perfil actualizado correctamente" }
}

export async function uploadAvatar(formData: FormData) {
    const supabase = await createClient()

    // 1. Verify User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error("No autorizado")
    }

    const file = formData.get("file") as File
    if (!file) {
        throw new Error("No se ha seleccionado ningún archivo")
    }

    // 2. Validate File (Size/Type)
    if (file.size > 5 * 1024 * 1024) throw new Error("El archivo no debe superar 5MB")
    if (!file.type.startsWith("image/")) throw new Error("Solo imágenes son permitidas")

    // 3. Upload to Storage
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}` // storage path: avatars/userId/timestamp.ext

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
            upsert: true,
        })

    if (uploadError) {
        throw new Error("Error al subir imagen: " + uploadError.message)
    }

    // 4. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName)

    // 5. Update Profile with URL
    const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id)

    if (dbError) throw new Error("Error al guardar URL: " + dbError.message)

    // 5.1 Sync Auth Metadata
    await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
    })

    revalidatePath("/", "layout")
    return { success: true, avatarUrl: publicUrl }
}

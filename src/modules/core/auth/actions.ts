'use server'

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

/**
 * =======================
 * LOGIN & LOGOUT
 * =======================
 */

export async function login(formData: FormData) {
    const supabase = await createClient()

    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

/**
 * =======================
 * PASSWORD MANAGEMENT
 * =======================
 */

export async function resetPasswordRequest(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    // NUCLEAR OPTION: Force production URL logic to prevent localhost leaks
    let redirectBase = 'https://app.pixy.com.co' // Default production

    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        redirectBase = process.env.NEXT_PUBLIC_APP_URL.startsWith('http')
            ? process.env.NEXT_PUBLIC_APP_URL
            : `https://${process.env.NEXT_PUBLIC_APP_URL}`
    } else if (process.env.NODE_ENV === 'development') {
        redirectBase = 'http://localhost:3000'
    }

    const redirectUrl = `${redirectBase}/update-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
    })

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string

    const { error } = await supabase.auth.updateUser({
        password: password,
    })

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * =======================
 * USER PROFILE
 * =======================
 */

export async function getCurrentUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = await createClient()

    // 1. Validate Session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: "No autorizado" }
    }

    // 2. Extract and update data
    const fullName = formData.get("fullName") as string
    const jobTitle = formData.get("jobTitle") as string | null
    const phone = formData.get("phone") as string | null

    if (!fullName || fullName.length < 2) {
        return { error: "El nombre debe tener al menos 2 caracteres" }
    }

    // 3. Update Database
    const { error } = await supabase
        .from("profiles")
        .update({
            full_name: fullName,
            job_title: jobTitle,
            phone: phone,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

    if (error) {
        return { error: "Error al actualizar perfil: " + error.message }
    }

    // 4. Sync Auth Metadata (for global session access)
    await supabase.auth.updateUser({
        data: {
            full_name: fullName,
            job_title: jobTitle,
            phone: phone
        }
    })

    // 5. Revalidate to update sidebar/header
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
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

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

    // 6. Sync Auth Metadata
    await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
    })

    revalidatePath("/", "layout")
    return { success: true, avatarUrl: publicUrl }
}

/**
 * =======================
 * ADMIN AUTH (Platform)
 * =======================
 */

export async function adminImpersonateUser(userId: string) {
    const supabase = await createClient()

    // This is a simplified version - in production you'd want more security checks
    const { data, error } = await supabase.auth.admin.getUserById(userId)

    if (error) {
        return { success: false, error: error.message }
    }

    // In a real implementation, you'd use a service role key for this
    // and manage impersonation sessions differently
    return { success: true, user: data }
}

export async function getCurrentUserId(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
}

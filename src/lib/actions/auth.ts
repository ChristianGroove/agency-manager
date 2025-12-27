"use server"

import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    redirect("/dashboard")
}

export async function resetPassword(formData: FormData) {
    const email = formData.get("email") as string
    const supabase = await createClient()
    const headersList = await (await import('next/headers')).headers()
    const origin = headersList.get('origin')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/update-password`,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function updatePassword(formData: FormData) {
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (!password || !confirmPassword) {
        return { error: "Ambas contraseñas son requeridas" }
    }

    if (password !== confirmPassword) {
        return { error: "Las contraseñas no coinciden" }
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { error: error.message }
    }

    redirect("/dashboard")
}

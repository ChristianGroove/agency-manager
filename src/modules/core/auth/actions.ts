'use server'

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"

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

    const { data: { user }, error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return { error: error.message }
    }

    if (user && !user.email_confirmed_at) {
        // Force logout just in case
        await supabase.auth.signOut()
        return { error: "Por favor confirma tu correo electrónico antes de ingresar." }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const captchaToken = formData.get('captchaToken') as string

    // 0. Captcha Verification
    if (process.env.TURNSTILE_SECRET_KEY) {
        if (!captchaToken) {
            return { error: "Por favor completa el captcha." }
        }

        const ip = (await headers()).get('x-forwarded-for') || '127.0.0.1'

        const verifyFormData = new FormData()
        verifyFormData.append('secret', process.env.TURNSTILE_SECRET_KEY)
        verifyFormData.append('response', captchaToken)
        verifyFormData.append('remoteip', ip)

        const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            body: verifyFormData,
            method: 'POST',
        })

        const outcome = await verification.json()
        if (!outcome.success) {
            console.error("Captcha verification failed:", outcome)
            return { error: "Verificación de seguridad fallida. Por favor recarga e intenta de nuevo." }
        }
    }

    // 1. Sign Up (Custom Flow using Admin to bypass Native SMTP limits & enforce branding)
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    // NUCLEAR OPTION: Force production URL
    let redirectBase = 'https://app.pixy.com.co'
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        redirectBase = process.env.NEXT_PUBLIC_APP_URL.startsWith('http')
            ? process.env.NEXT_PUBLIC_APP_URL
            : `https://${process.env.NEXT_PUBLIC_APP_URL}`
    }
    const redirectUrl = `${redirectBase}/auth/callback?next=/onboarding`

    try {
        // Generate Signup Link (Creates user if not exists + returns link)
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email,
            password,
            options: {
                redirectTo: redirectUrl,
                data: {
                    full_name: fullName,
                    onboarding_completed: false
                }
            }
        })

        if (linkError) {
            if (linkError.message.includes('already registered')) {
                return { error: "Este correo ya está registrado." }
            }
            if (linkError.message.includes('weak_password')) {
                return { error: "La contraseña es muy débil." }
            }
            console.error("Signup Link Gen Error:", linkError)
            return { error: linkError.message }
        }

        let actionLink = linkData.properties?.action_link
        if (!actionLink) return { error: "Error generando enlace de confirmación" }

        // SANITIZATION & BRANDING: Replace Supabase URL with our Custom Confirm Route
        // We extract the token and type to build our own link
        try {
            const supabaseUrlObj = new URL(actionLink)
            const token = supabaseUrlObj.searchParams.get('token')
            const type = supabaseUrlObj.searchParams.get('type') || 'signup'
            const redirectParam = supabaseUrlObj.searchParams.get('redirect_to')

            if (token) {
                // Construct our own safe URL
                // We use /auth/verify?token_hash=...&type=signup&next=...
                const nextPath = '/onboarding' // Default next
                actionLink = `${redirectBase}/auth/verify?token_hash=${token}&type=${type}&next=${encodeURIComponent(nextPath)}`
            }
        } catch (e) {
            console.error("Error parsing/rewriting Supabase link:", e)
            // Fallback to simple replacement if URL parsing fails
            if (actionLink.includes('localhost') || actionLink.includes('127.0.0.1')) {
                actionLink = actionLink.replace('http://localhost:3000', redirectBase)
                actionLink = actionLink.replace('http://127.0.0.1:3000', redirectBase)
                actionLink = actionLink.replace('redirect_to=http%3A%2F%2Flocalhost%3A3000', `redirect_to=${encodeURIComponent(redirectBase)}`)
            }
        }

        // 2. Send Custom Confirmation Email
        const { EmailService } = await import('@/modules/core/notifications/email.service')

        await EmailService.send({
            to: email,
            subject: 'Confirma tu cuenta en Pixy',
            html: `
                <h1>¡Bienvenido a Pixy!</h1>
                <p>Gracias por registrarte. Para comenzar, por favor confirma tu correo electrónico.</p>
                <p><a href="${actionLink}" style="padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-top: 10px;">Confirmar Cuenta</a></p>
                <p>O copia y pega este enlace: <br/> <span style="font-size: 10px; color: #666;">${actionLink}</span></p>
            `,
            organizationId: 'PLATFORM'
        })

        return {
            success: true,
            message: "Cuenta creada. Por favor revisa tu correo para confirmarla."
        }

    } catch (e: any) {
        console.error("Signup Error:", e)
        return { error: e.message || "Error al registrar usuario" }
    }
}

/**
 * Send Magic Link for Passwordless Login
 */
export async function sendMagicLink(formData: FormData) {
    const email = formData.get('email') as string
    if (!email) return { error: "Email requerido" }

    // 1. Generate Link using Admin API (to get the URL)
    // We reuse the logic from resetPasswordRequest/inviteMember to ensure custom branding
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    // NUCLEAR OPTION: Force production URL logic strictly
    let redirectBase = 'https://app.pixy.com.co'
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        redirectBase = process.env.NEXT_PUBLIC_APP_URL.startsWith('http')
            ? process.env.NEXT_PUBLIC_APP_URL
            : `https://${process.env.NEXT_PUBLIC_APP_URL}`
    }
    const redirectUrl = `${redirectBase}/auth/callback?next=/dashboard`

    try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: {
                redirectTo: redirectUrl
            }
        })

        if (linkError) {
            // If user not found, we should probably not reveal it? 
            // But for UX, if it says "User not found", user knows to register.
            // Supabase returns specific error instructions. 
            // If it fails, standard error.
            return { error: linkError.message }
        }

        let actionLink = linkData.properties?.action_link
        if (!actionLink) return { error: "Error generando enlace" }

        // SANITIZATION: If Supabase returns localhost (due to config), force overwrite it to production/env
        if (actionLink.includes('localhost') || actionLink.includes('127.0.0.1')) {
            actionLink = actionLink.replace('http://localhost:3000', redirectBase)
            actionLink = actionLink.replace('http://127.0.0.1:3000', redirectBase)
            actionLink = actionLink.replace('redirect_to=http%3A%2F%2Flocalhost%3A3000', `redirect_to=${encodeURIComponent(redirectBase)}`)
        }

        // 2. Send Custom Email
        const { EmailService } = await import('@/modules/core/notifications/email.service')

        // We use organizationId='PLATFORM' for generic login, OR try to find user's org?
        // Let's use 'PLATFORM' unless we want to look up their main org. 
        // Simpler is better for Login.

        await EmailService.send({
            to: email,
            subject: 'Ingresa a Pixy (Magic Link)',
            html: `
                <h1>Acceso Rápido</h1>
                <p>Has solicitado ingresar a Pixy sin contraseña.</p>
                <p>Haz clic en el siguiente enlace para entrar:</p>
                <p><a href="${actionLink}" style="padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-top: 10px;">Ingresar Ahora</a></p>
                <p>Si no solicitaste esto, ignora este mensaje.</p>
            `,
            organizationId: 'PLATFORM'
        })

        return { success: true, message: "Enlace enviado. Revisa tu correo." }

    } catch (e: any) {
        console.error("Magic Link Error:", e)
        return { error: e.message || "Error inesperado" }
    }
}

/**
 * =======================
 * PASSWORD MANAGEMENT
 * =======================
 */

export async function resetPasswordRequest(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    // NUCLEAR OPTION: Force production URL logic strictly
    // We intentionally ignore NODE_ENV=development here to prevent localhost leaks in password emails
    let redirectBase = 'https://app.pixy.com.co'

    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        redirectBase = process.env.NEXT_PUBLIC_APP_URL.startsWith('http')
            ? process.env.NEXT_PUBLIC_APP_URL
            : `https://${process.env.NEXT_PUBLIC_APP_URL}`
    }

    const redirectUrl = `${redirectBase}/update-password`

    // 1. Generate Link (Admin API) - We do NOT ask Supabase to send the email
    // We import admin client dynamically or use a service role helper if available here. 
    // Since this is a server action, let's use the admin client directly.
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
            redirectTo: redirectUrl
        }
    })

    if (linkError) {
        console.error("Link generation failed:", linkError)
        return { success: false, error: linkError.message }
    }

    let actionLink = linkData.properties?.action_link
    if (!actionLink) {
        return { success: false, error: "Failed to generate recovery link" }
    }

    // SANITIZATION: If Supabase returns localhost (due to config), force overwrite it to production/env
    if (actionLink.includes('localhost') || actionLink.includes('127.0.0.1')) {
        console.log(`SANITIZE: Replacing localhost in actionLink with ${redirectBase}`)
        actionLink = actionLink.replace('http://localhost:3000', redirectBase)
        actionLink = actionLink.replace('http://127.0.0.1:3000', redirectBase)
        // Also fix encoded redirect_to if present
        actionLink = actionLink.replace('redirect_to=http%3A%2F%2Flocalhost%3A3000', `redirect_to=${encodeURIComponent(redirectBase)}`)
    }

    try {
        // 2. Send Email (Custom Service)
        const { EmailService } = await import('@/modules/core/notifications/email.service')

        const sendResult = await EmailService.send({
            to: email,
            subject: 'Restablecer Contraseña - Pixy',
            html: `
                <h1>Solicitud de Restablecimiento</h1>
                <p>Has solicitado restablecer tu contraseña en Pixy.</p>
                <p>Haz clic en el siguiente enlace para continuar:</p>
                <p><a href="${actionLink}" style="color: #F205E2; font-weight: bold;">Restablecer Contraseña</a></p>
                <p>Si no solicitaste esto, ignora este mensaje.</p>
            `,
            organizationId: 'PLATFORM' // Password reset is a global/platform action
        })

        if (!sendResult.success) {
            console.error("Email send failed:", sendResult.error)
            return { success: false, error: `Error enviando correo: ${sendResult.error}` }
        }

        return { success: true }
    } catch (err: any) {
        console.error("Critical error in resetPasswordRequest:", err)
        // DEBUG: Exposing full error to UI for diagnosis
        return { success: false, error: err.message || "Unknown error" }
    }
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

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

    const { getAuthRedirectBase } = await import('@/lib/auth-utils')
    const redirectBase = getAuthRedirectBase()
    const redirectUrl = `${redirectBase}/auth/confirm?next=/onboarding`

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
                // IMPROVEMENT: If user exists but is not confirmed, re-send the link instead of failing
                const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
                const existingUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
                
                if (existingUser && !existingUser.email_confirmed_at) {
                    console.log("[signup] User exists but unconfirmed. Re-generating link.")
                    const { data: reLink, error: reError } = await supabaseAdmin.auth.admin.generateLink({
                        type: 'signup',
                        email,
                        password,
                        options: { redirectTo: redirectUrl }
                    })
                    if (reError || !(reLink as any).properties?.action_link) {
                        return { error: "No se pudo re-enviar el enlace. Contacte a soporte." }
                    }
                    // Continue flow with the new link
                    const { getSecureAuthLink } = await import('@/lib/auth-link-utils')
                    const reInviteLink = getSecureAuthLink((reLink as any).properties.action_link, 'signup', redirectBase, '/onboarding')
                    
                    // Recursive-like block or just handle here. Let's handle here to keep it flat.
                    const { getAuthConfirmationEmailHtml } = await import('@/lib/email-templates')
                    const { EmailService } = await import('@/modules/core/notifications/email.service')
                    const identity = await (EmailService as any).getSenderIdentity('PLATFORM')
                    const confirmationHtml = getAuthConfirmationEmailHtml(reInviteLink, identity.branding, identity.style)

                    await EmailService.send({
                        to: email,
                        subject: 'Re: Confirma tu cuenta en Pixy',
                        html: confirmationHtml,
                        organizationId: 'PLATFORM'
                    })
                    return { success: true, message: "Este correo ya estaba registrado pero no confirmado. Hemos re-enviado el enlace de activación." }
                }
                
                return { error: "Este correo ya está registrado y activo. Por favor inicia sesión." }
            }
            if (linkError.message.includes('weak_password')) {
                return { error: "La contraseña es muy débil." }
            }
            console.error("Signup Link Gen Error:", linkError)
            return { error: linkError.message }
        }
        const props = (linkData as any).properties
        const actionLink = props?.action_link
        if (!actionLink) return { error: "Error generando enlace de confirmación" }

        // SANITIZATION & BRANDING: Replace Supabase URL with our Custom Confirm Route
        const { getSecureAuthLink } = await import('@/lib/auth-link-utils')
        const inviteLink = getSecureAuthLink(actionLink, 'signup', redirectBase, '/onboarding')

        // 2. Resolve Template & Branding
        const { getAuthConfirmationEmailHtml } = await import('@/lib/email-templates')
        const { EmailService } = await import('@/modules/core/notifications/email.service')
        
        const identity = await (EmailService as any).getSenderIdentity('PLATFORM')
        const confirmationHtml = getAuthConfirmationEmailHtml(inviteLink, identity.branding, identity.style)

        await EmailService.send({
            to: email,
            subject: 'Confirma tu cuenta en Pixy',
            html: confirmationHtml,
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

    const { getAuthRedirectBase } = await import('@/lib/auth-utils')
    const redirectBase = getAuthRedirectBase()
    const redirectUrl = `${redirectBase}/auth/confirm?next=/dashboard`

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

        const props = (linkData as any).properties
        const actionLink = props?.action_link
        if (!actionLink) return { error: "Error generando enlace" }

        // SANITIZATION & TOKEN EXTRACTION
        // We extract token_hash to point to /auth/confirm instead of /auth/callback (PKCE)
        const { getSecureAuthLink } = await import('@/lib/auth-link-utils')
        const magicLink = getSecureAuthLink(actionLink, 'magiclink', redirectBase, '/dashboard')

        // 2. Send Custom Email
        const { EmailService } = await import('@/modules/core/notifications/email.service')
        const { getAuthMagicLinkEmailHtml } = await import('@/lib/email-templates')
        
        // Resolve identity to build template with correct style
        const identity = await (EmailService as any).getSenderIdentity('PLATFORM')
        const magicLinkHtml = getAuthMagicLinkEmailHtml(magicLink, identity.branding, identity.style)

        await EmailService.send({
            to: email,
            subject: 'Ingresa a Pixy (Magic Link)',
            html: magicLinkHtml,
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

    const { getAuthRedirectBase } = await import('@/lib/auth-utils')
    const redirectBase = getAuthRedirectBase()
    const redirectUrl = `${redirectBase}/auth/confirm?next=/update-password`

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

    const props = (linkData as any).properties
    const actionLink = props?.action_link
    if (!actionLink) {
        return { success: false, error: "Failed to generate recovery link" }
    }

    // SANITIZATION & TOKEN EXTRACTION
    const { getSecureAuthLink } = await import('@/lib/auth-link-utils')
    const recoveryLink = getSecureAuthLink(actionLink, 'recovery', redirectBase, '/update-password')

    try {
        // 2. Send Email (Custom Service)
        const { EmailService } = await import('@/modules/core/notifications/email.service')
        const { getAuthRecoveryEmailHtml } = await import('@/lib/email-templates')

        // Resolve identity for template
        const identity = await (EmailService as any).getSenderIdentity('PLATFORM')
        const recoveryHtml = getAuthRecoveryEmailHtml(recoveryLink, identity.branding, identity.style)

        const finalSendResult = await EmailService.send({
            to: email,
            subject: 'Restablecer Contraseña - Pixy',
            html: recoveryHtml,
            organizationId: 'PLATFORM' // Password reset is a global/platform action
        })

        if (!finalSendResult.success) {
            console.error("Email send failed:", finalSendResult.error)
            return { success: false, error: `Error enviando correo: ${finalSendResult.error}` }
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

    revalidatePath('/', 'layout')
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

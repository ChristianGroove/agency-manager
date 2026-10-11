"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { encrypt, decrypt } from "@/modules/core/security/encryption"
import nodemailer from "nodemailer"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export type SmtpConfigFull = {
    id?: string
    organization_id: string
    provider: 'gmail' | 'outlook' | 'office365' | 'zoho' | 'custom'
    host: string
    port: number
    user_email: string
    password?: string // Optional when reading back (masked)
    from_email: string
    from_name: string
    is_verified?: boolean
}

/**
 * Saves and Verifies SMTP Configuration
 */
export async function saveSmtpConfig(config: SmtpConfigFull, plainPassword?: string) {
    config = z.object({ organization_id: z.string().uuid(), provider: z.enum(['gmail', 'outlook', 'office365', 'zoho', 'custom']), host: z.string().trim().min(1).max(253).regex(/^[a-z0-9.-]+$/i), port: z.number().int().min(1).max(65535), user_email: z.string().trim().min(1).max(254), from_email: z.string().email(), from_name: z.string().trim().min(1).max(160) }).parse(config)
    const supabase = await createClient()

    // 1. Validate Permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Verify user belongs to org
    const { data: member } = await supabase.from('organization_members')
        .select('role,status')
        .eq('organization_id', config.organization_id)
        .eq('user_id', user.id)
        .single()

    if (!member || member.status !== 'active') throw new Error("Unauthorized access to organization")

    // Keeping the existing password is safe only for the same verified endpoint.
    // Changing host or identity must not silently mark an untested server verified.
    if (!plainPassword) {
        const { data: existing } = await supabase.from('organization_smtp_configs').select('host,port,user_email,from_email,is_verified').eq('organization_id', config.organization_id).maybeSingle()
        if (!existing?.is_verified || ['host', 'port', 'user_email', 'from_email'].some(key => existing[key as keyof typeof existing] !== config[key as keyof SmtpConfigFull])) return { success: false, error: 'Introduce la contraseña para verificar el nuevo servidor o remitente antes de guardarlo.' }
    }

    // 2. Test Connection BEFORE Saving
    if (plainPassword) {
        try {
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.port === 465, // true for 465, false for other ports
                requireTLS: [465, 587].includes(config.port),
                connectionTimeout: 8000, greetingTimeout: 5000, socketTimeout: 15000,
                logger: false, debug: false,
                auth: {
                    user: config.user_email,
                    pass: plainPassword,
                },
            })

            await transporter.verify()
        } catch (error: any) {
            return {
                success: false,
                error: 'No se pudo verificar el servidor SMTP. Revisa las credenciales, el puerto y la configuración del proveedor.'
            }
        }
    }

    // 3. Encrypt Password
    let updateData: any = {
        organization_id: config.organization_id,
        provider: config.provider,
        host: config.host,
        port: config.port,
        user_email: config.user_email,
        from_email: config.from_email,
        from_name: config.from_name,
        is_verified: true,
        last_verified_at: new Date().toISOString()
    }

    if (plainPassword) {
        const { encryptedData, iv } = encrypt(plainPassword)
        updateData.password_encrypted = encryptedData
        updateData.iv = iv
    }

    // 4. Upsert Config
    const { error } = await supabase
        .from('organization_smtp_configs')
        .upsert(updateData, { onConflict: 'organization_id' })

    if (error) {
        console.error("DB Error:", error)
        return { success: false, error: "Error guardando en base de datos" }
    }

    revalidatePath('/platform/settings/email')
    return { success: true }
}

/**
 * Get current configuration (without password)
 */
export async function getSmtpConfig(organizationId: string): Promise<SmtpConfigFull | null> {
    const supabase = await createClient()

    // Auth check implied by RLS but good to be explicit/safe in server action

    const { data, error } = await supabase
        .from('organization_smtp_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

    if (error || !data) return null

    return {
        id: data.id,
        organization_id: data.organization_id,
        provider: data.provider,
        host: data.host,
        port: data.port,
        user_email: data.user_email,
        from_email: data.from_email,
        from_name: data.from_name,
        is_verified: data.is_verified,
        // NEVER return password_encrypted or iv
    }
}

/**
 * Delete configuration (Revert to System Default)
 */
export async function deleteSmtpConfig(organizationId: string) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Explicit delete with org filter to prevent any cross-tenant accidents
    const { error } = await supabase
        .from('organization_smtp_configs')
        .delete()
        .eq('organization_id', organizationId)

    if (error) {
        console.error("Delete Error:", error)
        throw new Error("Error al eliminar la configuración")
    }

    revalidatePath('/platform/settings/email')
    return { success: true }
}

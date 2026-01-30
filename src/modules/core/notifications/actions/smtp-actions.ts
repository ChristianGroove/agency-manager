"use server"

import { createClient } from "@/lib/supabase-server"
import { encrypt, decrypt } from "@/lib/encryption"
import nodemailer from "nodemailer"
import { revalidatePath } from "next/cache"

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
    const supabase = await createClient()

    // 1. Validate Permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // Verify user belongs to org
    const { data: member } = await supabase.from('organization_members')
        .select('role')
        .eq('organization_id', config.organization_id)
        .eq('user_id', user.id)
        .single()

    if (!member) throw new Error("Unauthorized access to organization")

    // 2. Test Connection BEFORE Saving
    if (plainPassword) {
        try {
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.port === 465, // true for 465, false for other ports
                auth: {
                    user: config.user_email,
                    pass: plainPassword,
                },
            })

            await transporter.verify()
            console.log("✅ SMTP Connection Verified")
        } catch (error: any) {
            console.error("❌ SMTP Verification Failed:", error)
            return {
                success: false,
                error: `Error de conexión: ${error.message || "Credenciales inválidas o servidor inalcanzable"}`
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
    await supabase.from('organization_smtp_configs').delete().eq('organization_id', organizationId)
    revalidatePath('/platform/settings/email')
    return { success: true }
}

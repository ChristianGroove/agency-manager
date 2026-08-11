"use server"

import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions/crud"

export interface InviteValidationResult {
    isValid: boolean
    error?: string
    invitation?: {
        id: string
        code: string
        target_app_id?: string | null
        target_organization_type?: 'client' | 'reseller' | null
        reseller_org_id?: string | null
        recipient_email?: string | null
        max_uses: number
        uses_count: number
    }
}

export interface CreateInviteParams {
    code?: string
    target_app_id?: string
    target_organization_type?: 'client' | 'reseller'
    recipient_email?: string
    max_uses?: number
    expires_in_days?: number
}

/**
 * Validate an invitation code for client registration.
 */
export async function validateInviteCode(code?: string | null): Promise<InviteValidationResult> {
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return { isValid: false, error: "Código de invitación requerido" }
    }

    const cleanCode = code.trim().toUpperCase()

    try {
        const { data: invite, error } = await supabaseAdmin
            .from('platform_access_invitations')
            .select('*')
            .eq('code', cleanCode)
            .maybeSingle()

        if (error || !invite) {
            return { isValid: false, error: "Código de invitación no encontrado o no válido" }
        }

        if (invite.status !== 'active') {
            return { isValid: false, error: "Este código de invitación ha expirado o sido desactivado" }
        }

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            // Update status to expired
            await supabaseAdmin
                .from('platform_access_invitations')
                .update({ status: 'expired' })
                .eq('id', invite.id)
            return { isValid: false, error: "La invitación ha expirado" }
        }

        if (invite.max_uses > 0 && invite.uses_count >= invite.max_uses) {
            // Update status to exhausted
            await supabaseAdmin
                .from('platform_access_invitations')
                .update({ status: 'exhausted' })
                .eq('id', invite.id)
            return { isValid: false, error: "Esta invitación ha alcanzado su límite máximo de usos" }
        }

        return {
            isValid: true,
            invitation: {
                id: invite.id,
                code: invite.code,
                target_app_id: invite.target_app_id,
                target_organization_type: (invite as any).target_organization_type || 'client',
                reseller_org_id: invite.reseller_org_id,
                recipient_email: invite.recipient_email,
                max_uses: invite.max_uses,
                uses_count: invite.uses_count
            }
        }
    } catch (e: any) {
        console.error("Failed to validate invite code:", e)
        return { isValid: false, error: "Error al validar el código de invitación" }
    }
}

/**
 * Create a new invitation link/code (Admins & Resellers).
 */
export async function createInviteLink(params: CreateInviteParams = {}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const currentOrgId = await getCurrentOrganizationId()

    let resellerOrgIdToSave: string | null = null
    if (currentOrgId) {
        const { data: creatorOrg } = await supabaseAdmin
            .from('organizations')
            .select('organization_type')
            .eq('id', currentOrgId)
            .maybeSingle()
        
        if (creatorOrg?.organization_type === 'reseller') {
            resellerOrgIdToSave = currentOrgId
        }
    }

    // Generate random code if not provided
    const generatedCode = params.code 
        ? params.code.trim().toUpperCase() 
        : `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    let expiresAt: string | null = null
    if (params.expires_in_days && params.expires_in_days > 0) {
        const date = new Date()
        date.setDate(date.getDate() + params.expires_in_days)
        expiresAt = date.toISOString()
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('platform_access_invitations')
            .insert({
                code: generatedCode,
                created_by: user.id,
                reseller_org_id: resellerOrgIdToSave,
                target_app_id: params.target_app_id || null,
                target_organization_type: params.target_organization_type || 'client',
                recipient_email: params.recipient_email || null,
                max_uses: params.max_uses || 1,
                uses_count: 0,
                expires_at: expiresAt,
                status: 'active'
            })
            .select()
            .single()

        if (error) {
            console.error("Failed to create invite link:", error)
            return { success: false, error: error.message }
        }

        const { headers } = await import('next/headers')
        const reqHeaders = await headers()
        const host = reqHeaders.get('host')
        
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.pixy.com.co'
        
        if (host) {
            const isLocal = host.includes('localhost') || host.includes('127.0.0.1')
            const protocol = isLocal ? 'http' : 'https'
            // In local dev, use active request host so testing on localhost:3000 works out of the box
            if (process.env.NODE_ENV === 'development' || isLocal) {
                baseUrl = `${protocol}://${host}`
            }
        }

        return {
            success: true,
            data: {
                ...data,
                invite_url: `${baseUrl}/register?invite=${data.code}`
            }
        }
    } catch (e: any) {
        console.error("Error creating invite link:", e)
        return { success: false, error: e.message }
    }
}

/**
 * Atomically consume an invitation code upon successful signup.
 */
export async function consumeInviteCode(code: string) {
    const cleanCode = code.trim().toUpperCase()
    const { data: invite } = await supabaseAdmin
        .from('platform_access_invitations')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle()

    if (!invite) return false

    const newCount = (invite.uses_count || 0) + 1
    const newStatus = (invite.max_uses > 0 && newCount >= invite.max_uses) ? 'exhausted' : 'active'

    await supabaseAdmin
        .from('platform_access_invitations')
        .update({
            uses_count: newCount,
            status: newStatus
        })
        .eq('id', invite.id)

    return true
}

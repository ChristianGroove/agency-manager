'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * Token Management and Security for the Portal
 */
export async function regeneratePortalToken(clientId: string) {
    try {
        // 1. Generate new token using DB function
        const { data: newToken, error: tokenError } = await supabaseAdmin
            .rpc('generate_short_token')

        if (tokenError) throw tokenError

        // 2. Update client
        const { error: updateError } = await supabaseAdmin
            .from('leads')
            .update({
                portal_short_token: newToken,
                portal_token_created_at: new Date().toISOString()
            })
            .eq('id', clientId)

        if (updateError) throw updateError

        return { success: true, token: newToken }
    } catch (error) {
        console.error('regeneratePortalToken Error:', error)
        return { success: false, error: 'Error regenerating token' }
    }
}

export async function updatePortalTokenExpiration(
    clientId: string,
    neverExpires: boolean,
    expiresAt?: string | null
) {
    try {
        const updateData: Record<string, any> = {
            portal_token_never_expires: neverExpires
        }

        if (!neverExpires && expiresAt) {
            updateData.portal_token_expires_at = expiresAt
        } else if (neverExpires) {
            updateData.portal_token_expires_at = null
        }

        const { error } = await supabaseAdmin
            .from('leads')
            .update(updateData)
            .eq('id', clientId)

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error('updatePortalTokenExpiration Error:', error)
        return { success: false, error: 'Error updating token expiration' }
    }
}

export async function updateClientPortalConfig(clientId: string, config: any) {
    try {
        const { error } = await supabaseAdmin
            .from('leads')
            .update({ portal_config: config })
            .eq('id', clientId)

        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('updateClientPortalConfig Error:', error)
        throw error
    }
}

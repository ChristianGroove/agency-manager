"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

export interface QuoteSettings {
    organization_id: string
    vertical: 'agency' | 'ecommerce' | 'reservation' | 'custom'
    approve_label: string
    reject_label: string
    actions_config: {
        approve: {
            move_to_stage?: string
            notify_team: boolean
            send_message: boolean
        }
        reject: {
            ask_reason: boolean
            reasons: string[]
            acknowledgment_message?: string
        }
    }
    template_config: {
        header: string
        footer: string
    }
}

export async function getQuoteSettings(): Promise<{ success: boolean; settings?: QuoteSettings; error?: string }> {
    const supabase = await createClient()

    try {
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) return { success: false, error: "Unauthorized" }

        // Get Org ID - try via membership first, then fallback to first available org
        let orgId: string | null = null

        const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.user.id)
            .single()

        if (member) {
            orgId = member.organization_id
        } else {
            // Fallback: get first organization (using admin to ensure we can read it)
            const { data: firstOrg } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .limit(1)
                .single()

            if (firstOrg) {
                orgId = firstOrg.id
                console.log("[getQuoteSettings] Using fallback org:", orgId)
            }
        }

        if (!orgId) return { success: false, error: "No organization found" }

        const { data, error } = await supabase
            .from('quote_settings')
            .select('*')
            .eq('organization_id', orgId)
            .single()

        if (error) {
            // If not found, create default using admin client to bypass RLS issues
            if (error.code === 'PGRST116') {
                const defaultSettings: Partial<QuoteSettings> = {
                    organization_id: orgId,
                    vertical: 'custom',
                    approve_label: '✅ Aprobar Presupuesto',
                    reject_label: '❌ Rechazar / Cambios',
                    actions_config: {
                        approve: { move_to_stage: 'won', notify_team: true, send_message: true },
                        reject: { ask_reason: true, reasons: ["Precio Alto", "Alcance Incorrecto", "Otro"] }
                    },
                    template_config: { header: 'COTIZACIÓN FORMAL', footer: 'Gracias por su confianza.' }
                }

                // Use admin client to bypass RLS for initial creation
                const { data: newSettings, error: createError } = await supabaseAdmin
                    .from('quote_settings')
                    .insert(defaultSettings)
                    .select()
                    .single()

                if (createError) {
                    console.error("[getQuoteSettings] Create Error:", createError.message)
                    return { success: false, error: "Could not init settings: " + createError.message }
                }
                return { success: true, settings: newSettings }
            }
            return { success: false, error: error.message }
        }

        return { success: true, settings: data }
    } catch (e: any) {
        console.error("[getQuoteSettings] Server Error:", e?.message || e)
        return { success: false, error: "Server Error" }
    }
}

export async function updateQuoteSettings(settings: Partial<QuoteSettings>) {
    const supabase = await createClient()

    try {
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) return { success: false, error: "Unauthorized" }

        // Get Org ID - try via membership first, then fallback to first available org
        let orgId: string | null = null

        const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.user.id)
            .single()

        if (member) {
            orgId = member.organization_id
        } else {
            // Fallback: get first organization
            const { data: firstOrg } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .limit(1)
                .single()

            if (firstOrg) {
                orgId = firstOrg.id
            }
        }

        if (!orgId) return { success: false, error: "No organization found" }

        // Use admin client to bypass RLS for update
        const { error } = await supabaseAdmin
            .from('quote_settings')
            .update(settings)
            .eq('organization_id', orgId)

        if (error) return { success: false, error: error.message }

        revalidatePath('/settings/quotes')
        return { success: true }
    } catch (e: any) {
        console.error("[updateQuoteSettings] Error:", e?.message || e)
        return { success: false, error: "Server Error" }
    }
}

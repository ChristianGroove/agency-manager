"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { revalidatePath } from "next/cache"

export interface QuoteSettings {
    organization_id: string
    vertical: string // Changed from strict union to string to support many templates
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

// Templates moved to ./templates.ts

const PUBLIC_QUOTE_SETTINGS_LOAD_ERROR = "No se pudo cargar la configuracion de cotizaciones"
const PUBLIC_QUOTE_SETTINGS_SAVE_ERROR = "No se pudo guardar la configuracion de cotizaciones"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeQuoteSettingsError(error: unknown) {
    if (error instanceof Error) return { name: error.name }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logQuoteSettingsError(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizeQuoteSettingsError(error) : error)
}

function quoteSettingsFailure(label: string, error: unknown, fallback: string) {
    logQuoteSettingsError(label, error)
    if (isDeployedRuntime()) return { success: false, error: fallback }
    if (error instanceof Error) return { success: false, error: error.message }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return { success: false, error: error.message }
    }
    return { success: false, error: fallback }
}

export async function getQuoteSettings(overrideOrgId?: string): Promise<{ success: boolean; settings?: QuoteSettings; error?: string }> {
    const supabase = await createClient()

    try {
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) return { success: false, error: "Unauthorized" }

        // Get Org ID - prioritizing active membership
        let orgId: string | null = overrideOrgId || null

        if (!orgId) {
            const { data: members, error: membersError } = await supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', user.user.id)
                .limit(1) // Get the first one found

            if (members && members.length > 0) {
                orgId = members[0].organization_id
            }
        }

        // Only use fallback if NO memberships found (should not happen for valid users)
        if (!orgId) {
            console.warn("[getQuoteSettings] No memberships found for user, checking fallback...")
            // Fallback: get first organization (using admin to ensure we can read it)
            const { data: firstOrg } = await (await createClient())
                .from('organizations')
                .select('id')
                .limit(1)
                .single()

            if (firstOrg) {
                orgId = firstOrg.id
            }
        }

        console.log("[getQuoteSettings] Resolved organization", { orgIdPresent: !!orgId })

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
                const { data: newSettings, error: createError } = await (await createClient())
                    .from('quote_settings')
                    .insert(defaultSettings)
                    .select()
                    .single()

                if (createError) {
                    return quoteSettingsFailure("[getQuoteSettings] Create Error:", createError, PUBLIC_QUOTE_SETTINGS_LOAD_ERROR)
                }
                return { success: true, settings: newSettings }
            }
            return quoteSettingsFailure("[getQuoteSettings] Read Error:", error, PUBLIC_QUOTE_SETTINGS_LOAD_ERROR)
        }

        return { success: true, settings: data }
    } catch (e: any) {
        return quoteSettingsFailure("[getQuoteSettings] Server Error:", e, PUBLIC_QUOTE_SETTINGS_LOAD_ERROR)
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
            const { data: firstOrg } = await (await createClient())
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
        const { error } = await (await createClient())
            .from('quote_settings')
            .update(settings)
            .eq('organization_id', orgId)

        if (error) return quoteSettingsFailure("[updateQuoteSettings] Update Error:", error, PUBLIC_QUOTE_SETTINGS_SAVE_ERROR)

        revalidatePath('/settings/quotes')
        return { success: true }
    } catch (e: any) {
        return quoteSettingsFailure("[updateQuoteSettings] Error:", e, PUBLIC_QUOTE_SETTINGS_SAVE_ERROR)
    }
}

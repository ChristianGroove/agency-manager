"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getActiveModules } from "@/modules/core/saas/saas-actions"
import { requireOrgRole } from "@/modules/core/iam/services/org-roles"
import { cache } from "react"

const PUBLIC_SETTINGS_UPDATE_ERROR = "No se pudo actualizar la configuracion"
const MASKED_SECRET_VALUE = '●●●●●●●●'
const SECRET_SETTING_FIELDS = [
    'stripe_private_key',
    'wompi_integrity_secret',
] as const
const CLIENT_ONLY_SETTING_FIELDS = new Set(
    SECRET_SETTING_FIELDS.map(field => `${field}_present`)
)

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeSettingsActionError(error: unknown) {
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

function logSettingsActionError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeSettingsActionError(error))
}

function settingsActionErrorMessage(error: unknown, publicMessage: string) {
    if (isDeployedRuntime()) return publicMessage
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    return publicMessage
}

function sanitizeSettingsForClient<T extends Record<string, any> | null>(settings: T): T {
    if (!settings) return settings

    const safeSettings = { ...settings }
    for (const field of SECRET_SETTING_FIELDS) {
        const hasSecret = Boolean(safeSettings[field])
        safeSettings[`${field}_present`] = hasSecret
        safeSettings[field] = ''
    }

    return safeSettings as T
}

function stripClientOnlySettingsFields(data: Record<string, any>) {
    const cleanData = { ...data }

    for (const field of SECRET_SETTING_FIELDS) {
        const value = cleanData[field]
        if (value === undefined || value === null || value === '' || value === MASKED_SECRET_VALUE) {
            delete cleanData[field]
        }
    }

    for (const field of CLIENT_ONLY_SETTING_FIELDS) {
        delete cleanData[field]
    }

    return cleanData
}

export const getSettings = cache(async () => {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq('organization_id', orgId)
        .maybeSingle()

    if (error) {
        logSettingsActionError("[getSettings] Error:", error)
        return null
    }

    if (!data) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const { data: member } = await supabase
            .from('organization_members')
            .select('id')
            .eq('organization_id', orgId)
            .eq('user_id', user.id)
            .maybeSingle()

        if (!member) return null

        const defaultSettings = {
            organization_id: orgId,
            agency_name: 'My Agency',
            agency_currency: 'USD',
            default_language: 'es',
            portal_enabled: true
        }

        const { data: newData, error: createError } = await (await createClient())
            .from("organization_settings")
            .insert(defaultSettings)
            .select()
            .single()

        if (createError) {
            if (createError.code === '23505') {
                const { data: existingData } = await (await createClient())
                    .from("organization_settings")
                    .select("*")
                    .eq('organization_id', orgId)
                    .single()
                return sanitizeSettingsForClient(existingData)
            }
            logSettingsActionError("[getSettings] Default settings create error:", createError)
            return null
        }
        return sanitizeSettingsForClient(newData)
    }

    return sanitizeSettingsForClient(data)
})

export async function updateSettings(data: any) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { error: "No organization selected" }

    const { id, ...updateData } = data
    if (!id) return { error: "Settings ID is required" }

    await requireOrgRole('admin')

    const activeModules = await getActiveModules(orgId)
    const validatedData = await validateSettingsData(stripClientOnlySettingsFields(updateData), activeModules || [])

    const { error } = await supabase
        .from("organization_settings")
        .update({
            ...validatedData.data,
            updated_at: new Date().toISOString()
        })
        .eq("id", id)

    if (error) {
        logSettingsActionError("[updateSettings] Error:", error)
        return { error: settingsActionErrorMessage(error, PUBLIC_SETTINGS_UPDATE_ERROR) }
    }

    revalidatePath("/settings")
    revalidatePath("/", "layout")

    return { success: true }
}

async function validateSettingsData(data: any, activeModules: string[]) {
    const validatedData: any = {}
    const fieldModuleMap: Record<string, string> = {
        'invoice_prefix': 'module_invoicing',
        'invoice_next_number': 'module_invoicing',
        'quote_prefix': 'module_invoicing',
        'stripe_public_key': 'module_payments',
        'stripe_private_key': 'module_payments',
        'email_sender_name': 'module_communications'
    }

    for (const [key, value] of Object.entries(data)) {
        const requiredModule = fieldModuleMap[key]
        if (!requiredModule || activeModules.includes(requiredModule)) {
            validatedData[key] = value
        }
    }
    return { data: validatedData }
}

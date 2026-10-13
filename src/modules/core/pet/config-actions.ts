'use server'

import { cache } from 'react'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/modules/core/database/supabase-server'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { requireSuperAdmin } from '@/modules/core/iam/services/platform-roles'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { DEFAULT_PET_SETTINGS, resolveDashboardPetConfig } from './config'
import { petSettingsSchema, readPetSettings } from './schema'

const readGlobalPetSettings = cache(async () => {
    try {
        const { data, error } = await (await createClient()).from('platform_settings').select('pet_config').eq('id', 1).maybeSingle()
        return { settings: error ? { ...DEFAULT_PET_SETTINGS } : readPetSettings(data?.pet_config), available: !error && !!data }
    } catch {
        // Optional UI must not prevent the dashboard from loading, including before migration.
        return { settings: { ...DEFAULT_PET_SETTINGS }, available: false }
    }
})

export async function getDashboardPetConfig() {
    const [global, organizationId] = await Promise.all([readGlobalPetSettings(), getCurrentOrganizationId()])
    return resolveDashboardPetConfig(global.settings, organizationId)
}

export async function getPetAdminSettings() {
    await requireSuperAdmin()
    const [global, organizations] = await Promise.all([
        readGlobalPetSettings(),
        supabaseAdmin.from('organizations').select('id,name,slug').order('name'),
    ])
    if (organizations.error) throw new Error('No se pudieron cargar las organizaciones.')
    const options = (organizations.data || []) as { id: string; name: string; slug: string }[]
    return {
        settings: {
            ...global.settings,
            pixyOrganizationId: global.settings.pixyOrganizationId || options.find(org => org.slug === 'pixy-agency')?.id || null,
        },
        available: global.available,
        organizations: options,
    }
}

export async function savePetSettings(input: unknown) {
    await requireSuperAdmin()
    const result = petSettingsSchema.safeParse(input)
    if (!result.success) return { success: false, error: result.error.issues[0]?.message || 'Configuración inválida.' }
    const settings = result.data
    if (settings.pixyOrganizationId) {
        const { data, error } = await supabaseAdmin.from('organizations').select('id').eq('id', settings.pixyOrganizationId).maybeSingle()
        if (error || !data) return { success: false, error: 'La organización Pixy seleccionada no está disponible.' }
    }
    // Write only the mascot configuration after explicit authorization; never replace branding.
    const { data, error } = await supabaseAdmin.from('platform_settings')
        .update({ pet_config: settings, updated_at: new Date().toISOString() })
        .eq('id', 1).select('id').maybeSingle()
    if (error || !data) return { success: false, error: 'No se pudo guardar la configuración de la mascota.' }
    revalidatePath('/', 'layout')
    return { success: true }
}

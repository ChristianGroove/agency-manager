"use server"

/**
 * FEATURE FLAGS
 * 
 * Granular control of features within modules.
 * Allows organizations to enable/disable specific functionality
 * without disabling entire modules.
 * 
 * Usage:
 *   const enabled = await isFeatureEnabled('crm', 'lead_scoring')
 *   const config = await getFeatureConfig<LeadScoringConfig>('crm', 'lead_scoring')
 */

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

// ============================================
// TYPES
// ============================================

export interface FeatureFlag {
    id: string
    organization_id: string
    module_key: string
    feature_key: string
    enabled: boolean
    config: Record<string, any>
    created_at: string
    updated_at: string
}

export interface FeatureFlagInput {
    module_key: string
    feature_key: string
    enabled: boolean
    config?: Record<string, any>
}

// ============================================
// COMMON FEATURE DEFINITIONS
// ============================================

/**
 * Registry of available features per module.
 * This serves as documentation and for UI generation.
 */
export const FEATURE_REGISTRY: Record<string, {
    key: string
    name: string
    description: string
    defaultEnabled: boolean
}[]> = {
    crm: [
        { key: 'lead_scoring', name: 'Lead Scoring', description: 'Puntuación automática de leads según actividad', defaultEnabled: true },
        { key: 'ai_suggestions', name: 'Sugerencias AI', description: 'Recomendaciones de próximos pasos basadas en IA', defaultEnabled: true },
        { key: 'auto_assignment', name: 'Auto-Asignación', description: 'Asignar leads automáticamente a agentes', defaultEnabled: false },
        { key: 'duplicate_detection', name: 'Detección Duplicados', description: 'Alertar sobre leads duplicados', defaultEnabled: true },
    ],
    invoicing: [
        { key: 'auto_reminders', name: 'Recordatorios Automáticos', description: 'Enviar recordatorios de pago automáticamente', defaultEnabled: true },
        { key: 'recurring', name: 'Facturas Recurrentes', description: 'Crear facturas de forma recurrente', defaultEnabled: false },
        { key: 'pdf_branding', name: 'PDF con Marca', description: 'Incluir logo y colores en PDFs', defaultEnabled: true },
    ],
    marketing: [
        { key: 'ab_testing', name: 'Tests A/B', description: 'Pruebas A/B en campañas', defaultEnabled: false },
        { key: 'smart_scheduling', name: 'Programación Inteligente', description: 'Enviar en horarios óptimos', defaultEnabled: true },
        { key: 'link_tracking', name: 'Tracking de Links', description: 'Rastrear clicks en enlaces', defaultEnabled: true },
    ],
    ai: [
        { key: 'sentiment_analysis', name: 'Análisis de Sentimiento', description: 'Detectar tono de mensajes', defaultEnabled: true },
        { key: 'agent_qa', name: 'QA de Agentes', description: 'Evaluar calidad de respuestas', defaultEnabled: false },
        { key: 'auto_responses', name: 'Respuestas Automáticas', description: 'Generar borradores de respuesta', defaultEnabled: true },
    ],
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Check if a feature is enabled for the current organization.
 * Returns true if the feature flag doesn't exist (default enabled).
 */
export async function isFeatureEnabled(
    moduleKey: string,
    featureKey: string
): Promise<boolean> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return true // Default to enabled if no org

    const supabase = await createClient()

    const { data } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('organization_id', orgId)
        .eq('module_key', moduleKey)
        .eq('feature_key', featureKey)
        .single()

    // If no record exists, check default from registry
    if (!data) {
        const registry = FEATURE_REGISTRY[moduleKey]
        const feature = registry?.find(f => f.key === featureKey)
        return feature?.defaultEnabled ?? true
    }

    return data.enabled
}

/**
 * Get feature configuration (JSONB config field).
 */
export async function getFeatureConfig<T = Record<string, any>>(
    moduleKey: string,
    featureKey: string
): Promise<T | null> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const supabase = await createClient()

    const { data } = await supabase
        .from('feature_flags')
        .select('config')
        .eq('organization_id', orgId)
        .eq('module_key', moduleKey)
        .eq('feature_key', featureKey)
        .single()

    return (data?.config as T) || null
}

/**
 * Get all feature flags for an organization.
 */
export async function getOrganizationFeatureFlags(
    organizationId?: string
): Promise<FeatureFlag[]> {
    const orgId = organizationId || await getCurrentOrganizationId()
    if (!orgId) return []

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('organization_id', orgId)
        .order('module_key')

    if (error) {
        console.error('Error fetching feature flags:', error)
        return []
    }

    return data as FeatureFlag[]
}

/**
 * Get features for a specific module.
 */
export async function getModuleFeatureFlags(
    moduleKey: string,
    organizationId?: string
): Promise<FeatureFlag[]> {
    const orgId = organizationId || await getCurrentOrganizationId()
    if (!orgId) return []

    const supabase = await createClient()

    const { data } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('organization_id', orgId)
        .eq('module_key', moduleKey)

    return data as FeatureFlag[] || []
}

// ============================================
// WRITE OPERATIONS (Admin Only)
// ============================================

/**
 * Set a feature flag value.
 * Creates the flag if it doesn't exist.
 */
export async function setFeatureFlag(
    input: FeatureFlagInput & { organization_id?: string }
): Promise<{ success: boolean, error?: string }> {
    const orgId = input.organization_id || await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization context' }

    try {
        const { error } = await supabaseAdmin
            .from('feature_flags')
            .upsert({
                organization_id: orgId,
                module_key: input.module_key,
                feature_key: input.feature_key,
                enabled: input.enabled,
                config: input.config || {},
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'organization_id,module_key,feature_key'
            })

        if (error) throw error

        revalidatePath('/platform/settings')
        return { success: true }
    } catch (error: any) {
        console.error('Error setting feature flag:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Toggle a feature flag.
 */
export async function toggleFeatureFlag(
    moduleKey: string,
    featureKey: string,
    organizationId?: string
): Promise<{ success: boolean, newValue?: boolean, error?: string }> {
    const orgId = organizationId || await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization context' }

    const currentValue = await isFeatureEnabled(moduleKey, featureKey)
    const newValue = !currentValue

    const result = await setFeatureFlag({
        organization_id: orgId,
        module_key: moduleKey,
        feature_key: featureKey,
        enabled: newValue
    })

    return { ...result, newValue }
}

/**
 * Bulk update feature flags.
 */
export async function bulkSetFeatureFlags(
    flags: FeatureFlagInput[],
    organizationId?: string
): Promise<{ success: boolean, error?: string }> {
    const orgId = organizationId || await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization context' }

    try {
        const records = flags.map(flag => ({
            organization_id: orgId,
            module_key: flag.module_key,
            feature_key: flag.feature_key,
            enabled: flag.enabled,
            config: flag.config || {},
            updated_at: new Date().toISOString()
        }))

        const { error } = await supabaseAdmin
            .from('feature_flags')
            .upsert(records, {
                onConflict: 'organization_id,module_key,feature_key'
            })

        if (error) throw error

        revalidatePath('/platform/settings')
        return { success: true }
    } catch (error: any) {
        console.error('Error bulk setting feature flags:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Delete a feature flag (resets to default).
 */
export async function deleteFeatureFlag(
    moduleKey: string,
    featureKey: string,
    organizationId?: string
): Promise<{ success: boolean, error?: string }> {
    const orgId = organizationId || await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: 'No organization context' }

    try {
        const { error } = await supabaseAdmin
            .from('feature_flags')
            .delete()
            .eq('organization_id', orgId)
            .eq('module_key', moduleKey)
            .eq('feature_key', featureKey)

        if (error) throw error

        revalidatePath('/platform/settings')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting feature flag:', error)
        return { success: false, error: error.message }
    }
}

'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

export interface SystemModule {
    key: string;
    name: string;
    description: string;
    category: string;
    price: number;
    currency: string;
    is_core: boolean;
    is_addon: boolean;
    parent_module_key?: string;
    dependencies: string[];
    benefits: string[];
    icon_name: string;
    visual_metadata: { x: number; y: number };
}

export interface OrganizationModuleState {
    module_key: string;
    is_active: boolean;
    is_trial?: boolean;
    expires_at?: string;
}

/**
 * Fetch all available system modules for the Store
 */
export async function getStoreModules(): Promise<SystemModule[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('system_modules')
        .select('*')
        .order('price', { ascending: true })

    if (error) {
        console.error('Error fetching store modules:', error)
        return []
    }

    return data.map((mod: any) => ({
        ...mod,
        dependencies: typeof mod.dependencies === 'string' ? JSON.parse(mod.dependencies) : mod.dependencies,
        benefits: typeof mod.benefits === 'string' ? JSON.parse(mod.benefits) : mod.benefits,
        visual_metadata: typeof mod.visual_metadata === 'string' ? JSON.parse(mod.visual_metadata) : mod.visual_metadata
    })) as SystemModule[]
}

/**
 * Fetch current organization's active modules
 */
export async function getActiveOrganizationModules(): Promise<OrganizationModuleState[]> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('organization_modules')
        .select('module_key, is_active, is_trial, expires_at')
        .eq('organization_id', orgId)

    if (error) {
        console.error('Error fetching active modules:', error)
        return []
    }

    return data as OrganizationModuleState[]
}

/**
 * Toggle a module state (Purchase/Activate simulation)
 */
export async function toggleModule(moduleKey: string, isActive: boolean) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: 'Unauthorized' }

    // In a real app, this would trigger Stripe checkout if price > 0
    // For now, we just toggle the DB record

    // Check dependencies first
    if (isActive) {
        const modules = await getStoreModules()
        const targetMod = modules.find(m => m.key === moduleKey)
        if (targetMod && targetMod.dependencies.length > 0) {
            // Verify dependencies overlap with active modules
            // (Skipping for brevity in this MVP action, handled in UI)
        }
    }

    const { error } = await supabase
        .from('organization_modules')
        .upsert({
            organization_id: orgId,
            module_key: moduleKey,
            is_active: isActive,
            updated_at: new Date().toISOString()
        })

    if (error) {
        console.error('Error toggling module:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/apps')
    return { success: true }
}

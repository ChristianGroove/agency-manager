import { createClient } from "@/lib/supabase-server";
import { AiSettings } from "../types";

export class AiConfigService {

    /**
     * Retrieves the effective configuration for a given scope.
     * Hierarchy: Space > Tenant > Global
     */
    static async getEffectiveSettings(tenantId: string, spaceId?: string): Promise<AiSettings> {
        const supabase = await createClient();

        // 1. Try to get specific settings (Space or Tenant)
        let query = supabase.from('ai_settings').select('*');

        if (spaceId) {
            query = query.or(`and(scope_type.eq.space,scope_id.eq.${spaceId}),and(scope_type.eq.tenant,scope_id.eq.${tenantId}),and(scope_type.eq.global,scope_id.eq.system)`);
        } else {
            query = query.or(`and(scope_type.eq.tenant,scope_id.eq.${tenantId}),and(scope_type.eq.global,scope_id.eq.system)`);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching AI settings:", error);
            // Fallback to default safe settings
            return this.getDefaultSettings();
        }

        // 2. Merge Strategies (Deep Merge)
        // Order: Global (Base) -> Tenant (Override) -> Space (Override)
        const globalSettings = data.find((s: AiSettings) => s.scope_type === 'global') || this.getDefaultSettings();
        const tenantSettings = data.find((s: AiSettings) => s.scope_type === 'tenant' && s.scope_id === tenantId);
        const spaceSettings = spaceId ? data.find((s: AiSettings) => s.scope_type === 'space' && s.scope_id === spaceId) : null;

        return {
            ...globalSettings,
            ...tenantSettings,
            ...spaceSettings,
            // Ensure overrides exist
            model_overrides: {
                ...globalSettings.model_overrides,
                ...tenantSettings?.model_overrides,
                ...spaceSettings?.model_overrides
            }
        };
    }

    /**
     * Updates or creates settings for a specific scope.
     */
    static async updateSettings(scopeType: 'global' | 'tenant' | 'space', scopeId: string, settings: Partial<AiSettings>) {
        const supabase = await createClient();

        // Check if exists
        const { data: existing } = await supabase
            .from('ai_settings')
            .select('id')
            .eq('scope_type', scopeType)
            .eq('scope_id', scopeId)
            .single();

        if (existing) {
            return await supabase
                .from('ai_settings')
                .update(settings)
                .eq('id', existing.id);
        } else {
            return await supabase
                .from('ai_settings')
                .insert({
                    scope_type: scopeType,
                    scope_id: scopeId,
                    ...settings
                });
        }
    }

    private static getDefaultSettings(): AiSettings {
        return {
            is_voice_enabled: false, // Default off for safety
            is_clawdbot_enabled: true, // AUTO-ENABLE TEXT MODE
            is_personaplex_enabled: false,
            daily_token_limit: 1000,
            monthly_budget_usd: 0,
            model_overrides: {}
        } as AiSettings;
    }
}

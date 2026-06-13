import { requireProductionInternalAccess } from "@/app/api/_guards/request-guards"

import { NextResponse } from 'next/server';
import { createClient } from "@/modules/core/database/supabase-server";

export async function GET(req: Request) {
    const guard = requireProductionInternalAccess(req)
    if (guard) return guard;

    try {
        const providers = [
            {
                key: 'meta_business',
                name: 'Meta Business Suite',
                description: 'Conexión Omnicanal Unificada: Instagram, Facebook Messenger y WhatsApp Business API en una sola integración.',
                category: 'messaging',
                icon_url: null,
                is_premium: true,
                is_enabled: true,
                config_schema: {
                    required: [],
                    properties: {}
                },
                documentation_url: 'https://developers.facebook.com/docs/graph-api'
            }
        ];

        // 1. Clean up old fragmented providers (Surgical Cleanup)
        // We delete them if they exist to avoid UI redundancy
        await (await createClient()).from('integration_providers').delete().eq('key', 'meta_instagram');
        await (await createClient()).from('integration_providers').delete().eq('key', 'meta_whatsapp');
        await (await createClient()).from('integration_providers').delete().eq('key', 'meta_ads');
        await (await createClient()).from('integration_providers').delete().eq('key', 'evolution_api');

        const results = [];



        for (const provider of providers) {
            const { data: existing } = await (await createClient())
                .from('integration_providers')
                .select('id')
                .eq('key', provider.key)
                .single();

            if (existing) {
                // Update
                const { error } = await (await createClient())
                    .from('integration_providers')
                    .update(provider)
                    .eq('id', existing.id);
                results.push({ key: provider.key, action: 'updated', error: error?.message });
            } else {
                // Insert
                const { error } = await (await createClient())
                    .from('integration_providers')
                    .insert(provider);
                results.push({ key: provider.key, action: 'inserted', error: error?.message });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

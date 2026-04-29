
import { supabaseAdmin } from '@/modules/core/database/supabase-admin';
import { NextResponse } from 'next/server';
import { requireNonProductionRoute } from '@/modules/core/security/api-route-guards';

export async function GET() {
    const guard = requireNonProductionRoute();
    if (guard) return guard;

    try {
        // Get ALL WhatsApp connections (not just active)
        const { data: connections, error } = await supabaseAdmin
            .from('integration_connections')
            .select('id, name, organization_id, provider_key, status, updated_at, created_at')
            .eq('provider_key', 'meta_whatsapp');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ count: connections?.length || 0, connections });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

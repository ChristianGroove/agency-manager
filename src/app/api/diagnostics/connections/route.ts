import { requireProductionInternalAccess } from "@/app/api/_guards/request-guards"
import { NextResponse } from 'next/server';
import { createClient } from "@/modules/core/database/supabase-server";

export async function GET(req: Request) {
    const guard = requireProductionInternalAccess(req)
    if (guard) return guard;

    try {
        // Get ALL WhatsApp connections (not just active)
        const { data: connections, error } = await (await createClient())
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

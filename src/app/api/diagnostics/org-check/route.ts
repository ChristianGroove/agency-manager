import { requireProductionInternalAccess } from "@/app/api/_guards/request-guards"
import { NextResponse } from 'next/server';
import { createClient } from "@/modules/core/database/supabase-server";

export async function GET(req: Request) {
    const guard = requireProductionInternalAccess(req)
    if (guard) return guard;

    try {
        // Get all conversations with their org IDs
        const { data: convs } = await (await createClient())
            .from('conversations')
            .select('id, organization_id, channel, phone, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        // Get all workflows with their org IDs
        const { data: workflows } = await (await createClient())
            .from('workflows')
            .select('id, name, organization_id, is_active, trigger_type')
            .eq('is_active', true);

        return NextResponse.json({
            conversations: convs,
            workflows: workflows
        });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

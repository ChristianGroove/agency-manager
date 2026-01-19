
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const shouldDelete = searchParams.get('delete') === 'true';

    // Create Admin Client to bypass RLS
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log("🔍 [Admin] Checking Integration Connections...");

    // Get all connections to debug
    const { data: connections, error } = await supabase
        .from('integration_connections')
        .select('*');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let deletedCount = 0;
    if (shouldDelete) {
        // Delete BAD meta_business connections
        const { error: delError, count } = await supabase
            .from('integration_connections')
            .delete({ count: 'exact' })
            .eq('provider_key', 'meta_business');

        if (!delError) deletedCount = count || 0;
    }

    const simple = connections?.map(c => ({
        id: c.id,
        key: c.provider_key,
        name: c.connection_name,
        status: c.status,
        has_metadata: !!c.metadata,
        metadata_keys: c.metadata ? Object.keys(c.metadata) : []
    }));

    return NextResponse.json({
        count: connections?.length || 0,
        deleted: deletedCount,
        connections: simple
    });
}

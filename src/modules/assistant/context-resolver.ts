import { createClient } from "@/lib/supabase-server";
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions";
import { AssistantContext } from "./types";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { SupabaseClient } from "@supabase/supabase-js";

export async function resolveAssistantContext(): Promise<{ context: AssistantContext, supabase: SupabaseClient } | null> {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const orgIdHeader = headersList.get('x-organization-id') || headersList.get('x-space-id');

    let supabase;
    let user;
    let orgId: string | null = null;

    // A. API / Script Access (Bearer Token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        // Create stateless client with the token
        const client = createSupabaseClient(sbUrl, sbKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        supabase = client;

        // Validate Token & Get User
        const { data, error } = await client.auth.getUser(token);
        if (error || !data.user) return null;
        user = data.user;

        // Resolve Organization (Header > First Available)
        if (orgIdHeader) {
            orgId = orgIdHeader;
        } else {
            // Fetch first active org for user
            const { data: members } = await client
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', user.id)
                .limit(1)
                .single();
            orgId = members?.organization_id || null;
        }

    }
    // B. Browser / Dashboard Access (Cookies)
    else {
        supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        user = data.user;
        if (!user) return null;

        // Use core action for cookie-based resolution
        orgId = await getCurrentOrganizationId();
    }

    if (!user || !orgId) return null;

    // 3. Get Role/Permissions
    const { data: member } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .single();

    if (!member) return null; // Security: User must be member of the resolved org
    const role = member.role || 'member';

    // 4. Get Vertical (Space Type)
    const { data: org } = await supabase
        .from('organizations')
        .select('vertical')
        .eq('id', orgId)
        .single();

    // Default to 'agency' if column missing or null
    const vertical = org?.vertical || 'agency';

    // 5. Resolve Permissions (Mock mapping for Phase 0)
    const permissions: string[] = [];
    if (role === 'owner' || role === 'admin') {
        permissions.push(
            'clients.create',
            'clients.read',
            'quotes.create',
            'quotes.read',
            'billing.read',
            'flows.create',
            'communications.create',
            'forms.create'
        );
    }

    return {
        context: {
            tenant_id: orgId,
            space_id: orgId,
            user_id: user.id,
            role: role,
            allowed_actions: permissions,
            active_modules: ['core', 'crm', 'billing'],
            vertical: vertical
        },
        supabase: supabase // Return the authenticated client
    };
}

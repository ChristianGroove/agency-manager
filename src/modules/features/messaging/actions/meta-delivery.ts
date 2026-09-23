"use server"

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/modules/core/database/supabase-server'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { requireOrgRole } from '@/modules/core/iam/services/org-roles'

export type MetaDeliveryRow = {
    id: string
    status: string
    channel: string
    recipient: string
    created_at: string
    claimed_at: string | null
    error_kind: string | null
    connection_id: string
}

async function requireDeliveryOperator() {
    const organizationId = await getCurrentOrganizationId()
    if (!organizationId) redirect('/login')
    await requireOrgRole('admin')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')
    // The reconciliation RPC also requires direct tenant membership.
    const { data: member } = await supabase.from('organization_members')
        .select('user_id').eq('organization_id', organizationId).eq('user_id', user.id).maybeSingle()
    if (!member) throw new Error('A tenant admin membership is required')
    return { organizationId, userId: user.id }
}

export async function getMetaDeliveryOverview(): Promise<{
    counts: Record<'queued' | 'sending' | 'unknown' | 'failed', number>
    rows: MetaDeliveryRow[]
}> {
    const { organizationId } = await requireDeliveryOperator()
    const statuses = ['queued', 'sending', 'unknown', 'failed'] as const
    const [counts, unknown, pending] = await Promise.all([
        Promise.all(statuses.map(async status => {
            const { count, error } = await supabaseAdmin.from('meta_outbound_outbox')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', organizationId).eq('status', status)
            if (error) throw new Error('Could not read Meta delivery counts')
            return [status, count || 0] as const
        })),
        supabaseAdmin.from('meta_outbound_outbox')
            .select('id,status,channel,recipient,created_at,claimed_at,error_kind,connection_id')
            .eq('organization_id', organizationId).eq('status', 'unknown')
            .order('created_at', { ascending: true }).limit(50),
        supabaseAdmin.from('meta_outbound_outbox')
            .select('id,status,channel,recipient,created_at,claimed_at,error_kind,connection_id')
            .eq('organization_id', organizationId).in('status', ['queued', 'sending'])
            .order('created_at', { ascending: true }).limit(10),
    ])
    if (unknown.error || pending.error) throw new Error('Could not read Meta delivery queue')
    return { counts: Object.fromEntries(counts) as Record<typeof statuses[number], number>,
        rows: [...(unknown.data || []), ...(pending.data || [])] }
}

export async function reconcileUnknownMetaDelivery(formData: FormData): Promise<void> {
    const { organizationId, userId } = await requireDeliveryOperator()
    const outboxId = String(formData.get('outboxId') || '')
    const outcome = String(formData.get('outcome') || '')
    const externalId = String(formData.get('externalId') || '').trim()
    const evidence = String(formData.get('evidence') || '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(outboxId) || !['accepted', 'failed'].includes(outcome)
        || evidence.length < 30 || evidence.length > 2000
        || (outcome === 'accepted' && !externalId) || externalId.length > 255) {
        throw new Error('Invalid reconciliation request')
    }
    const { data, error } = await supabaseAdmin.rpc('reconcile_meta_outbound', {
        p_outbox_id: outboxId, p_organization_id: organizationId, p_actor_id: userId,
        p_outcome: outcome, p_external_id: outcome === 'accepted' ? externalId : null, p_evidence: evidence,
    })
    if (error || data !== true) throw new Error('Could not reconcile: check the Meta receipt and current state')
    revalidatePath('/platform/integrations/meta-delivery')
    redirect('/platform/integrations/meta-delivery?resolved=1')
}

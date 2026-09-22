import { supabaseAdmin } from '@/modules/core/database/supabase-admin'

export async function processMetaControlEvents(payload: any) {
    for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
            const value = change.value || {}
            if (change.field === 'account_update' && value.event === 'PARTNER_REMOVED') {
                const revoked = await supabaseAdmin.from('integration_connections').update({status:'action_required'})
                    .eq('provider_key','whatsapp_cloud').eq('metadata->>waba_id',entry.id).in('status',['active','connected'])
                if (revoked.error) throw new Error('Could not suspend the revoked channel')
            }
            const phoneId = value.metadata?.phone_number_id
            if (!phoneId) continue
            const { data: connection, error } = await supabaseAdmin.from('integration_connections')
                .select('id,organization_id,metadata').eq('provider_key','whatsapp_cloud')
                .eq('metadata->>asset_id',phoneId).in('status',['active','connected']).maybeSingle()
            if (error) throw new Error('Ambiguous Meta channel')
            if (!connection) continue
            for (const status of value.statuses || []) {
                const saved = await supabaseAdmin.rpc('record_meta_message_status', { p_connection_id: connection.id, p_status: status })
                if (saved.error) throw new Error('Could not reconcile Meta message status')
            }
            const patch: Record<string, unknown> = {}
            if (change.field === 'smb_message_echoes') patch.last_echo_at = new Date().toISOString()
            if (change.field === 'history') {
                patch.history_sync_status = [...(value.errors || []), ...(value.history || []).flatMap((h: any) => h.errors || [])].some((e: any) => e.code === 2593109) ? 'not_shared' : 'receiving'
                patch.history_last_event_at = new Date().toISOString()
                patch.history_progress = (value.history || []).map((h: any) => h.metadata || {})
                if ((value.history || []).some((h: any) => h.metadata?.progress === 100)) patch.history_sync_status = 'complete'
            }
            if (Object.keys(patch).length) {
                const saved = await supabaseAdmin.rpc('set_meta_connection_metadata', { p_connection_id: connection.id, p_organization_id: connection.organization_id, p_patch: patch })
                if (saved.error) throw new Error('Could not update channel progress')
            }
            for (const sync of value.state_sync || []) {
                if (sync.type !== 'contact' || !sync.contact?.phone_number) continue
                const saved = await supabaseAdmin.from('meta_app_contacts').upsert({
                    connection_id: connection.id, phone_number: sync.contact.phone_number,
                    contact: sync.contact, removed: sync.action === 'remove',
                    event_timestamp: new Date(Number(sync.metadata?.timestamp) * 1000).toISOString(),
                }, { onConflict: 'connection_id,phone_number' })
                if (saved.error) throw new Error('Could not synchronize contact')
            }
        }
    }
}

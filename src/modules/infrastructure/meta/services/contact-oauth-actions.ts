"use server"
import { createClient } from '@/modules/core/database/supabase-server'
import { issueMetaOAuthSession } from './oauth-session'
export async function getMetaContactAuthUrl(clientId: string) {
    const client = await createClient()
    const { data, error } = await client.from('clients').select('id,organization_id').eq('id', clientId).single()
    if (error || !data) throw new Error('Client not found')
    const state = await issueMetaOAuthSession(data.organization_id, { flow: 'contact_connect', clientId })
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appId || !appUrl) throw new Error('Meta configuration unavailable')
    const params = new URLSearchParams({ client_id: appId, redirect_uri: appUrl + '/api/integrations/meta/callback', state, scope: 'ads_read,pages_show_list,pages_read_engagement', response_type: 'code' })
    return 'https://www.facebook.com/v24.0/dialog/oauth?' + params
}

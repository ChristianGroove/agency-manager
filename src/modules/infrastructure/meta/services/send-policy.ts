import { supabaseAdmin } from '@/modules/core/database/supabase-admin'

export function evaluateWhatsAppWindow(lastInbound: string | null, now = Date.now()) {
    const received = lastInbound ? Date.parse(lastInbound) : NaN
    return Number.isFinite(received) && received <= now && now - received < 24 * 60 * 60 * 1000
}
export async function assertMetaSendAllowed(connection: any, conversation: any, content: any) {
    if (!connection || connection.status !== 'active' || !conversation || connection.organization_id !== conversation.organization_id || connection.id !== conversation.connection_id) {
        throw new Error('Conversation and active channel must belong to the same organization')
    }
    if (!['whatsapp_cloud','meta_whatsapp','meta_business','facebook_page','instagram_dm','instagram_dme'].includes(connection.provider_key)) return
    if (content?.type === 'template') {
        if (['facebook_page','instagram_dm','instagram_dme'].includes(connection.provider_key) || (conversation.channel && conversation.channel !== 'whatsapp')) throw new Error('WhatsApp templates cannot authorize a social channel send')
        // Suppression is enforced again at send time, including scheduled sends.
        if (conversation.lead_id) {
            const { data: lead, error } = await supabaseAdmin.from('leads').select('marketing_opted_out')
                .eq('id',conversation.lead_id).eq('organization_id',conversation.organization_id).single()
            if (error || !lead) throw new Error('Could not verify contact preferences')
            if (lead.marketing_opted_out) {
                const { data: template, error: templateError } = await supabaseAdmin.from('messaging_templates')
                    .select('category').eq('organization_id',conversation.organization_id)
                    .eq('name',content.templateName).eq('channel_id',connection.id).maybeSingle()
                if (templateError || !template || template.category?.toUpperCase() === 'MARKETING') throw new Error('Contact opted out of marketing')
            }
        }
        return
    }
    const { data, error } = await supabaseAdmin.from('messages').select('created_at,metadata')
        .eq('conversation_id',conversation.id).eq('organization_id',conversation.organization_id)
        .eq('direction','inbound').order('created_at',{ ascending: false }).limit(100)
    if (error) throw new Error('Could not verify the customer service window')
    const last = data?.find((message: any) => !message.metadata?.historical && !message.metadata?.metadata?.historical)
    if (!evaluateWhatsAppWindow(last?.created_at || null)) throw new Error(conversation.channel === 'instagram' || conversation.channel === 'messenger'
        ? 'La ventana de atención de 24 horas está cerrada. Espera un nuevo mensaje del cliente.'
        : 'La ventana de atención de 24 horas está cerrada. Envía una plantilla aprobada.')
}

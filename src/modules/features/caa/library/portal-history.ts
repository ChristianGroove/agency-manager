import 'server-only'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import type { StoredHelpMessage } from '../actions/help-history'
import type { TasksPortalHelpSession } from './tasks-portal-session'
import type { HelpArticle } from './schema'
import { publicHelpHistory } from './public-language'

export const portalHistoryCutoff = () => new Date(Date.now() - 30 * 86400000).toISOString()
export async function readPortalHelpMessages(session: TasksPortalHelpSession, id: string, recent = false): Promise<StoredHelpMessage[] | null> {
    const thread = await supabaseAdmin.from('help_portal_threads').select('id').eq('id', id)
        .eq('organization_id', session.tenantId).eq('staff_id', session.staffId).eq('surface', 'portal.tasks')
        .gte('last_activity', portalHistoryCutoff()).maybeSingle()
    if (thread.error || !thread.data) return null
    const messages = await supabaseAdmin.from('help_portal_messages').select('id,role,content,created_at,article_ids')
        .eq('thread_id', id).order('created_at', { ascending: !recent }).order('id', { ascending: !recent }).limit(recent ? 13 : 200)
    return messages.error ? null : recent ? (messages.data || []).reverse() : messages.data || []
}

export function restrictPortalHistory(messages: (StoredHelpMessage & { article_ids?: string[] })[], authorized: HelpArticle[]): StoredHelpMessage[] {
    const allowed = new Set(authorized.map(article => article.id))
    return publicHelpHistory(messages.map(message => message.role === 'assistant' && (message.article_ids || []).some(id => !allowed.has(id))
        ? { ...message, content: 'Este mensaje corresponde a una función que ya no está disponible con tu acceso actual.' } : message))
}

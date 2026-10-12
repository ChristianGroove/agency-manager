"use server"

import { z } from 'zod'
import { createClient } from '@/modules/core/database/supabase-server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'

export interface HelpThread { id: string; title: string; created_at: string }
export interface StoredHelpMessage { id: string; role: 'user' | 'assistant'; content: string; created_at: string }

export async function listHelpThreads(offset = 0): Promise<{ threads: HelpThread[]; hasMore: boolean; error?: string }> {
    const page = z.number().int().min(0).max(10000).safeParse(offset)
    if (!page.success) return { threads: [], hasMore: false, error: 'Página inválida.' }
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    const org = await getCurrentOrganizationId()
    if (!user || !org) return { threads: [], hasMore: false, error: 'Inicia sesión para consultar tu historial.' }
    const { data, error } = await client.from('help_chat_threads').select('id,title,created_at')
        .eq('user_id', user.id).eq('organization_id', org)
        .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 20)
    return error ? { threads: [], hasMore: false, error: 'El historial no está disponible. Puedes seguir usando la ayuda.' }
        : { threads: (data ?? []).slice(0, 20), hasMore: (data?.length ?? 0) > 20 }
}

export async function loadHelpThread(id: string): Promise<{ messages: StoredHelpMessage[]; error?: string }> {
    if (!z.string().uuid().safeParse(id).success) return { messages: [], error: 'Conversación inválida.' }
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    const org = await getCurrentOrganizationId()
    if (!user || !org) return { messages: [], error: 'Inicia sesión para consultar tu historial.' }
    const { data: thread, error: threadError } = await client.from('help_chat_threads').select('id')
        .eq('id', id).eq('user_id', user.id).eq('organization_id', org).maybeSingle()
    if (threadError || !thread) return { messages: [], error: 'No se pudo abrir esta conversación.' }
    const { data, error } = await client.from('help_chat_messages').select('id,role,content,created_at')
        .eq('thread_id', id).order('created_at').order('id').limit(200)
    return error ? { messages: [], error: 'No se pudieron cargar los mensajes.' } : { messages: (data ?? []) as StoredHelpMessage[] }
}

import { createHash, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { createClient } from '@/modules/core/database/supabase-server'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { getCurrentOrgRole } from '@/modules/core/iam/services/org-roles'
import { createMetaOAuthState, parseMetaOAuthState } from './oauth-state'

const COOKIE = 'pixy-meta-oauth'
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export async function issueMetaOAuthSession(orgId: string, extra: Record<string, unknown> = {}) {
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    const role = user && await getCurrentOrgRole(orgId)
    if (!user || !['owner', 'admin'].includes(role || '')) throw new Error('Forbidden')
    const state = createMetaOAuthState({ ...extra, orgId, userId: user.id })
    const { error } = await supabaseAdmin.from('meta_oauth_sessions').insert({
        state_hash: hash(state), organization_id: orgId, user_id: user.id,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    if (error) throw new Error('Could not start Meta authorization')
    const jar = await cookies()
    jar.set(COOKIE, hash(state), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 })
    return state
}
export async function consumeMetaOAuthSession(state: string) {
    const parsed = parseMetaOAuthState(state)
    if (!parsed.ok) throw new Error(parsed.error)
    const jar = await cookies()
    const actual = Buffer.from(jar.get(COOKIE)?.value || '')
    const expected = Buffer.from(hash(state))
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Meta authorization session mismatch')
    const client = await createClient()
    const { data: { user } } = await client.auth.getUser()
    const orgId = parsed.state.orgId
    if (!user || user.id !== parsed.state.userId || typeof orgId !== 'string') throw new Error('Unauthorized')
    const role = await getCurrentOrgRole(orgId)
    if (!['owner', 'admin'].includes(role || '')) throw new Error('Forbidden')
    const { data, error } = await supabaseAdmin.from('meta_oauth_sessions')
        .update({ consumed_at: new Date().toISOString() }).eq('state_hash', hash(state))
        .eq('user_id', user.id).eq('organization_id', orgId).is('consumed_at', null)
        .gt('expires_at', new Date().toISOString()).select('state_hash').maybeSingle()
    if (error || !data) throw new Error('Meta authorization session expired or already used')
    jar.delete(COOKIE)
    return parsed.state
}

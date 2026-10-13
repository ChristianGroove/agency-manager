import { beforeEach, expect, it, vi } from 'vitest'
import type { TasksPortalHelpSession } from './tasks-portal-session'
const mocks = vi.hoisted(() => ({ from: vi.fn(), eq: vi.fn(), exists: true, error: false }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from } }))
import { readPortalHelpMessages, restrictPortalHistory } from './portal-history'
const session = { tenantId: 'org', staffId: 'staff' } as TasksPortalHelpSession
beforeEach(() => {
    vi.clearAllMocks(); mocks.exists = true; mocks.error = false
    mocks.from.mockImplementation(table => {
        const q = { select: () => q, eq: (key: string, value: string) => { mocks.eq(table, key, value); return q }, gte: () => q, order: () => q,
            maybeSingle: async () => ({ data: mocks.exists ? { id: 'thread' } : null, error: mocks.error }),
            limit: async () => ({ data: [{ id: 'latest' }, { id: 'oldest' }], error: mocks.error }) }
        return q
    })
})
it('checks tenant, staff, surface and expiration before reading any messages', async () => {
    expect(await readPortalHelpMessages(session, 'thread', true)).toEqual([{ id: 'oldest' }, { id: 'latest' }])
    expect(mocks.eq).toHaveBeenCalledWith('help_portal_threads', 'organization_id', 'org')
    expect(mocks.eq).toHaveBeenCalledWith('help_portal_threads', 'staff_id', 'staff')
    expect(mocks.eq).toHaveBeenCalledWith('help_portal_threads', 'surface', 'portal.tasks')
    mocks.exists = false; mocks.from.mockClear()
    expect(await readPortalHelpMessages(session, 'another-thread')).toBeNull()
    expect(mocks.from).not.toHaveBeenCalledWith('help_portal_messages')
})
it('fails closed on database errors and masks assistants from revoked capabilities', async () => {
    mocks.error = true
    expect(await readPortalHelpMessages(session, 'thread')).toBeNull()
    const messages = [{ id: '1', role: 'assistant' as const, content: 'Restricted content', created_at: '', article_ids: ['tasks-portal.private'] },
        { id: '2', role: 'user' as const, content: 'My question', created_at: '' }]
    const filtered = restrictPortalHistory(messages, [])
    expect(filtered[0].content).not.toContain('Restricted content')
    expect(filtered[1].content).toBe('My question')
})

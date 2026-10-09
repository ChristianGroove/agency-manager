import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn(), setup: vi.fn(), markRead: vi.fn(), handlers: [] as any[] }))
vi.mock('@/modules/core/database/supabase', () => ({ supabase: { from: mocks.from } }))
vi.mock('@/modules/core/database/supabase-realtime-manager', () => ({ realtimeManager: {
    getOrCreateChannel: vi.fn((_name, setup) => {
        const channel = { on: vi.fn((event, filter, handler) => { mocks.handlers.push({ event, filter, handler }); return channel }) }
        setup(channel)
    }), releaseChannel: vi.fn(),
} }))
vi.mock('../actions/messages', () => ({ markConversationAsRead: mocks.markRead }))
vi.mock('../actions/calls', () => ({ getCallStatus: vi.fn(async () => null) }))
vi.mock('@/modules/core/i18n/use-translation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({}) }))
import { useChatLogic } from './use-chat-logic'

const row = (id: string, status = 'sent') => ({ id, conversation_id: 'conversation', status, created_at: '2026-10-09T12:00:00Z', direction: 'outbound', content: { type: 'text', text: id } })
let fetched: any[]
beforeEach(() => {
    mocks.handlers.length = 0
    fetched = [row('one')]
    mocks.from.mockImplementation((table: string) => {
        const query: any = { select: () => query, eq: () => query, order: () => query, lt: () => query, limit: () => query,
            single: async () => ({ data: { id: 'conversation', unread_count: 0 }, error: null }),
            then: (resolve: any) => Promise.resolve({ data: table === 'messages' ? [...fetched] : null, error: null }).then(resolve) }
        return query
    })
})

describe('active chat delivery reconciliation', () => {
    it('ignores INSERTs and UPDATEs from a released conversation channel during its cleanup delay', async () => {
        const { result, rerender } = renderHook(({ id }) => useChatLogic(id), { initialProps: { id: 'conversation' } })
        await waitFor(() => expect(result.current.messages).toHaveLength(1))
        const oldInsert = mocks.handlers.find(h => h.filter.table === 'messages' && h.filter.event === 'INSERT')
        const oldConversationUpdate = mocks.handlers.find(h => h.filter.table === 'conversations')
        fetched = [{ ...row('new-chat'), conversation_id: 'next' }]
        rerender({ id: 'next' })
        await waitFor(() => expect(result.current.messages[0]?.id).toBe('new-chat'))
        act(() => {
            oldInsert.handler({ new: row('late-old-message') })
            oldConversationUpdate.handler({ new: { id: 'conversation' } })
        })
        expect(result.current.messages.map(m => m.id)).toEqual(['new-chat'])
    })
    it('decreases the virtual index only when older messages are prepended', async () => {
        fetched = Array.from({ length: 50 }, (_, i) => row('message-' + i))
        const { result } = renderHook(() => useChatLogic('conversation'))
        await waitFor(() => expect(result.current.hasMoreMessages).toBe(true))
        const insert = mocks.handlers.find(h => h.filter.table === 'messages' && h.filter.event === 'INSERT')
        act(() => insert.handler({ new: row('newest') }))
        expect(result.current.firstItemIndex).toBe(1000000)
        fetched = [row('older-2'), row('older-1')]
        await act(async () => { await result.current.loadOlderMessages() })
        expect(result.current.firstItemIndex).toBe(999998)
        expect(result.current.messages.slice(0, 2).map(m => m.id)).toEqual(['older-1', 'older-2'])
    })
    it('replaces a pending optimistic INSERT and applies delivery UPDATEs without duplicating messages', async () => {
        const { result } = renderHook(() => useChatLogic('conversation'))
        await waitFor(() => expect(result.current.messages).toHaveLength(1))
        act(() => result.current.setMessages([row('one', 'sending') as any]))
        const insert = mocks.handlers.find(h => h.filter.table === 'messages' && h.filter.event === 'INSERT')
        const update = mocks.handlers.find(h => h.filter.table === 'messages' && h.filter.event === 'UPDATE')
        expect(update.filter.filter).toBe('conversation_id=eq.conversation')
        act(() => insert.handler({ new: row('one', 'queued') }))
        expect(result.current.messages).toHaveLength(1)
        expect(result.current.messages[0].status).toBe('queued')
        for (const status of ['sent', 'delivered', 'read', 'failed']) {
            act(() => update.handler({ new: row('one', status) }))
            expect(result.current.messages[0].status).toBe(status)
        }
        act(() => update.handler({ new: row('other', 'read') }))
        expect(result.current.messages).toHaveLength(1)
    })
    it('refreshes existing rows during sync while retaining loaded history and appending new messages', async () => {
        const { result } = renderHook(() => useChatLogic('conversation'))
        await waitFor(() => expect(result.current.messages).toHaveLength(1))
        act(() => result.current.setMessages([row('older') as any, row('one', 'sending') as any]))
        fetched = [row('two'), row('one', 'delivered')]
        const systemSync = mocks.handlers.find(h => h.event === 'broadcast' && h.filter.event === 'system_message_inserted')
        await act(async () => { systemSync.handler({}) })
        await waitFor(() => expect(result.current.messages.find(m => m.id === 'one')?.status).toBe('delivered'))
        expect(result.current.messages.map(m => m.id)).toEqual(['older', 'one', 'two'])
        expect(result.current.messages.find(m => m.id === 'one')?.status).toBe('delivered')
        expect(result.current.firstItemIndex).toBe(1000000)
    })
})

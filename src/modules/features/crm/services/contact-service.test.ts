import { describe, expect, it, vi } from 'vitest'
import { ContactService } from './contact-service'

const mocks = vi.hoisted(() => ({
    startProcess: vi.fn(),
}))

vi.mock('./process-engine/engine', () => ({
    ProcessEngine: {
        startProcess: mocks.startProcess,
    },
}))

function createQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {}
    query.insert = vi.fn(() => query)
    query.update = vi.fn(() => query)
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.single = vi.fn(async () => result)
    query.maybeSingle = vi.fn(async () => result)
    return query
}

function createSupabaseMock(queues: Record<string, any[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    return {
        from: vi.fn((table: string) => {
            const queue = tableQueues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    } as any
}

describe('ContactService tenant safety', () => {
    it('scopes process-start contact updates to the current organization', async () => {
        mocks.startProcess.mockResolvedValue({
            success: true,
            process: { current_state: 'qualified' },
        })

        const createContact = createQuery({
            data: { id: 'contact-1', contact_type: 'lead', name: 'Ada' },
            error: null,
        })
        const stageLookup = createQuery({
            data: { id: 'stage-1', status_key: 'qualified' },
            error: null,
        })
        const updateContact = createQuery({
            data: { id: 'contact-1', status: 'qualified' },
            error: null,
        })
        const supabase = createSupabaseMock({
            leads: [createContact, updateContact],
            pipeline_stages: [stageLookup],
        })

        const service = new ContactService(supabase, 'org-current')
        await service.createContact({ name: 'Ada', contact_type: 'lead' })

        expect(updateContact.eq).toHaveBeenCalledWith('id', 'contact-1')
        expect(updateContact.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })
})

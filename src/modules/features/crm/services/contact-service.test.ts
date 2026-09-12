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

    it('generates portal tokens when converting a lead to client', async () => {
        const findLead = createQuery({
            data: { id: 'lead-123', contact_type: 'lead', name: 'Carlos', portal_token: null, portal_short_token: null },
            error: null,
        })
        const updateLead = createQuery({
            data: { id: 'lead-123', contact_type: 'client', status: 'converted', portal_short_token: 'TOK123' },
            error: null,
        })
        const supabase = createSupabaseMock({
            leads: [findLead, updateLead],
        })
        supabase.rpc = vi.fn().mockResolvedValue({ data: 'TOK123', error: null })

        const service = new ContactService(supabase, 'org-current')
        const converted = await service.convertToClient('lead-123')

        expect(updateLead.update).toHaveBeenCalledWith(expect.objectContaining({
            contact_type: 'client',
            status: 'converted',
            portal_short_token: 'TOK123',
            portal_token_never_expires: true,
        }))
        expect(updateLead.eq).toHaveBeenCalledWith('id', 'lead-123')
        expect(updateLead.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('generates portal tokens when creating a contact with type client directly', async () => {
        const createContact = createQuery({
            data: { id: 'contact-client-1', contact_type: 'client', name: 'Diana', portal_short_token: 'CLI789' },
            error: null,
        })
        const supabase = createSupabaseMock({
            leads: [createContact],
        })
        supabase.rpc = vi.fn().mockResolvedValue({ data: 'CLI789', error: null })

        const service = new ContactService(supabase, 'org-current')
        await service.createContact({ name: 'Diana', contact_type: 'client' })

        expect(createContact.insert).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Diana',
            contact_type: 'client',
            portal_short_token: 'CLI789',
            portal_token_never_expires: true,
        }))
    })
})

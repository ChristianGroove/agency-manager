import { describe, expect, it, vi } from 'vitest'
import { TagsService } from './tags.service'

function maybeSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.maybeSingle = vi.fn(async () => result)
    return query
}

function singleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.single = vi.fn(async () => result)
    return query
}

function finalEqQuery(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
    const query: any = {}
    query.delete = vi.fn(() => query)
    query.update = vi.fn(() => query)
    query.eq = vi.fn(() => query)
    query.neq = vi.fn(() => query)
    query.then = (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject)
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

describe('logic TagsService tenant safety', () => {
    it('does not toggle tags for leads outside the current organization', async () => {
        const leadLookup = maybeSingleQuery({ data: null, error: null })
        const supabase = createSupabaseMock({
            leads: [leadLookup],
        })
        const service = new TagsService(supabase, 'org-current')

        await expect(service.toggleLeadTag('lead-other-org', 'tag-current')).rejects.toThrow('Lead not found')

        expect(leadLookup.eq).toHaveBeenCalledWith('id', 'lead-other-org')
        expect(leadLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(supabase.from).toHaveBeenCalledTimes(1)
    })

    it('does not toggle tags that are outside the current organization', async () => {
        const leadLookup = maybeSingleQuery({ data: { id: 'lead-current' }, error: null })
        const tagLookup = singleQuery({ data: null, error: null })
        const supabase = createSupabaseMock({
            leads: [leadLookup],
            crm_tags: [tagLookup],
        })
        const service = new TagsService(supabase, 'org-current')

        await expect(service.toggleLeadTag('lead-current', 'tag-other-org')).rejects.toThrow('Tag not found')

        expect(tagLookup.eq).toHaveBeenCalledWith('id', 'tag-other-org')
        expect(tagLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(supabase.from).not.toHaveBeenCalledWith('crm_lead_tags')
    })

    it('scopes lead tag clearing and conversation sync to the current organization', async () => {
        const leadLookup = maybeSingleQuery({ data: { id: 'lead-current' }, error: null })
        const leadTagDelete = finalEqQuery()
        const leadUpdate = finalEqQuery()
        const conversationUpdate = finalEqQuery()
        const supabase = createSupabaseMock({
            leads: [leadLookup, leadUpdate],
            crm_lead_tags: [leadTagDelete],
            conversations: [conversationUpdate],
        })
        const service = new TagsService(supabase, 'org-current')

        await service.clearLeadTags('lead-current')

        expect(leadTagDelete.eq).toHaveBeenCalledWith('lead_id', 'lead-current')
        expect(leadUpdate.eq).toHaveBeenCalledWith('id', 'lead-current')
        expect(leadUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(conversationUpdate.eq).toHaveBeenCalledWith('lead_id', 'lead-current')
        expect(conversationUpdate.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(conversationUpdate.neq).toHaveBeenCalledWith('state', 'archived')
    })
})

import { describe, expect, it, vi } from 'vitest'
import { TagService } from './tag-service'

function maybeSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {}
    query.select = vi.fn(() => query)
    query.eq = vi.fn(() => query)
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

describe('legacy TagService tenant safety', () => {
    it('does not toggle tags for leads outside the current organization', async () => {
        const leadLookup = maybeSingleQuery({ data: null, error: null })
        const supabase = createSupabaseMock({
            leads: [leadLookup],
        })
        const service = new TagService(supabase, 'org-current')

        await expect(service.toggleLeadTag('lead-other-org', 'tag-current')).rejects.toThrow('Lead not found')

        expect(leadLookup.eq).toHaveBeenCalledWith('id', 'lead-other-org')
        expect(leadLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(supabase.from).toHaveBeenCalledTimes(1)
    })

    it('does not toggle tags that are outside the current organization', async () => {
        const leadLookup = maybeSingleQuery({ data: { id: 'lead-current' }, error: null })
        const tagLookup = maybeSingleQuery({ data: null, error: null })
        const supabase = createSupabaseMock({
            leads: [leadLookup],
            crm_tags: [tagLookup],
        })
        const service = new TagService(supabase, 'org-current')

        await expect(service.toggleLeadTag('lead-current', 'tag-other-org')).rejects.toThrow('Tag not found')

        expect(tagLookup.eq).toHaveBeenCalledWith('id', 'tag-other-org')
        expect(tagLookup.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(supabase.from).not.toHaveBeenCalledWith('crm_lead_tags')
    })
})

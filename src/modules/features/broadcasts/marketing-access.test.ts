import { describe, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: vi.fn() }))
vi.mock('@/modules/core/organizations/organization-actions', () => ({ getCurrentOrganizationId: vi.fn() }))
import { allowsMarketing, assertMarketingChannelAccess, requireMarketingAccess } from './marketing-access'
import { createClient } from '@/modules/core/database/supabase-server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'

describe('Marketing permissions', () => {
    it('rejects removed and blocked members even when they were owners', () => {
        expect(allowsMarketing({role:'owner',status:'blocked'}, null, 'execute')).toBe(false)
        expect(allowsMarketing({role:'owner',status:'pending'}, null, 'execute')).toBe(false)
        expect(allowsMarketing({role:'owner',status:'invited'}, null, 'view')).toBe(false)
        expect(allowsMarketing({role:'owner',deleted_at:'2026-10-09'}, null, 'view')).toBe(false)
        expect(allowsMarketing(null, {hierarchy_level:100}, 'execute')).toBe(false)
    })
    it('does not give ordinary CRM members permission to send campaigns', () => {
        expect(allowsMarketing({role:'member',permissions:{'crm.leads.edit':true}}, null, 'execute')).toBe(false)
        expect(allowsMarketing({role:'member'}, {permissions:{'marketing.campaigns.view':true}}, 'execute')).toBe(false)
    })
    it('honors scoped grants and explicit denials', () => {
        expect(allowsMarketing({role:'member',permissions:{'marketing.campaigns.execute':true}}, null, 'execute')).toBe(true)
        expect(allowsMarketing({role:'admin',permissions:{'marketing.campaigns.execute':false}}, {permissions:{all:true}}, 'execute')).toBe(false)
        expect(allowsMarketing({role:'owner'}, {permissions:{'marketing.campaigns.execute':false}}, 'execute')).toBe(false)
    })
    it('requires channel permission independently of campaign permission', () => {
        const access = { inbox:{hasGlobalView:false,authorizedChannels:['channel-a']} } as any
        expect(()=>assertMarketingChannelAccess(access,'channel-a')).not.toThrow()
        expect(()=>assertMarketingChannelAccess(access,'channel-b')).toThrow('canal')
    })
    it('exposes contact import independently from permission to send or declare authorization', async () => {
        const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'owner', status: 'active', permissions: { 'marketing.campaigns.execute': false } }, error: null }) }
        vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'actor-a' } }, error: null }) }, from: vi.fn().mockReturnValue(query) } as any)
        vi.mocked(getCurrentOrganizationId).mockResolvedValue('tenant-a')
        const access = await requireMarketingAccess('view')
        expect(access.canImport).toBe(true)
        expect(access.canExecute).toBe(false)
    })
})

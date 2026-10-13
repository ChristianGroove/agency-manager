import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { reserveDashboardHelpQuota } from './dashboard-quota'

describe('shared dashboard quota adapter', () => {
    it.each(['allowed', 'rate_limited', 'denied'])('accepts only a known server status: %s', async status => {
        const rpc = vi.fn().mockResolvedValue({ data: { status }, error: null })
        expect(await reserveDashboardHelpQuota({ rpc } as unknown as SupabaseClient, 'tenant')).toBe(status)
        expect(rpc).toHaveBeenCalledWith('reserve_dashboard_help_request', { p_org: 'tenant' })
    })
    it.each([null, { status: 'unrecognized' }, { status: 'allowed', private: 'detail' }])('fails closed for an invalid response', async data => {
        const rpc = vi.fn().mockResolvedValue({ data, error: null })
        expect(await reserveDashboardHelpQuota({ rpc } as unknown as SupabaseClient, 'tenant')).toBe('unavailable')
    })
    it('fails closed for a returned error or a rejected RPC', async () => {
        const rpc = vi.fn().mockResolvedValueOnce({ data: { status: 'allowed' }, error: { message: 'details' } })
            .mockRejectedValueOnce(new Error('details'))
        const client = { rpc } as unknown as SupabaseClient
        expect(await reserveDashboardHelpQuota(client, 'tenant')).toBe('unavailable')
        expect(await reserveDashboardHelpQuota(client, 'tenant')).toBe('unavailable')
    })
})

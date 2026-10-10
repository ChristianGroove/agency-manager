'use server'

import { z } from 'zod'
import { requireMarketingAccess, assertMarketingChannelAccess } from './marketing-access'
import { publicMarketingError } from './marketing-contracts'
import { probeMarketingChannel } from './marketing-channel-health'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'

export async function refreshMarketingChannelHealth(connectionId: string) {
    try {
        const access = await requireMarketingAccess('execute')
        z.string().uuid().parse(connectionId)
        assertMarketingChannelAccess(access, connectionId)
        const quality = await probeMarketingChannel(access.organizationId, connectionId)
        if (quality === 'UNKNOWN') throw new Error('Meta no confirmó la calidad del número. Revisa su conexión y vuelve a comprobar.')
        return { success: true as const, quality }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

export async function acknowledgeMarketingHold(input: { connectionId: string; holdAt: string; reviewed: boolean }) {
    try {
        const access = await requireMarketingAccess('execute')
        const data = z.object({ connectionId: z.string().uuid(), holdAt: z.string().datetime({ offset: true }), reviewed: z.literal(true) }).strict().parse(input)
        assertMarketingChannelAccess(access, data.connectionId)
        const result = await supabaseAdmin.rpc('acknowledge_marketing_channel_hold', {
            p_org: access.organizationId, p_connection: data.connectionId, p_actor: access.userId, p_expected_hold: data.holdAt,
        })
        if (result.error) throw new Error('Comprueba el número y revisa la última restricción antes de continuar.')
        return { success: true as const }
    } catch (error) { return { success: false as const, error: publicMarketingError(error) } }
}

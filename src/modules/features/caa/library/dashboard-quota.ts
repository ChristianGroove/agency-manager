import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const resultSchema = z.object({ status: z.enum(['allowed', 'rate_limited', 'denied']) }).strict()
export type DashboardHelpQuota = z.infer<typeof resultSchema>['status'] | 'unavailable'

/** Uses the signed-in client's JWT. Neither the user ID nor the limit comes from the browser. */
export async function reserveDashboardHelpQuota(client: SupabaseClient, organizationId: string): Promise<DashboardHelpQuota> {
    try {
        const result = await client.rpc('reserve_dashboard_help_request', { p_org: organizationId })
        if (result.error) return 'unavailable'
        const parsed = resultSchema.safeParse(result.data)
        return parsed.success ? parsed.data.status : 'unavailable'
    } catch {
        return 'unavailable'
    }
}

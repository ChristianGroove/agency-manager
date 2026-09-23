import { inngest } from '@/modules/infrastructure/automation/inngest/client'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'

// The one-time SMB data requests must begin within 24 hours of Embedded Signup.
// The RPC only marks missed deadlines; clients must disconnect in the app and
// complete a fresh signup. A cron health check also invokes it as a fallback.
export const expireMetaCoexistenceOnboarding = inngest.createFunction(
    { id: 'expire-meta-coexistence-onboarding', retries: 3 },
    { cron: '*/15 * * * *' },
    async ({ step }) => step.run('expire-overdue-sync', async () => {
        const { data, error } = await supabaseAdmin.rpc('expire_meta_coexistence_onboarding')
        if (error) throw new Error('Could not expire overdue Meta coexistence onboarding')
        return { expired: data || 0 }
    }),
)

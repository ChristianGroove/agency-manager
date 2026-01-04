import { createClient } from "@/lib/supabase-server"
import { AutomationsView } from "@/modules/core/automation/components/automations-view"
import { getWorkflowStats, getExecutionHistory } from "@/modules/core/automation/actions"
import { GrowthEcosystemShell } from "@/modules/core/layout/growth-ecosystem-shell"

export const metadata = {
    title: "Centro de Control - Automations",
    description: "Gestiona y monitorea tus workflows de automatización",
}

export default async function AutomationsPage() {
    const supabase = await createClient()

    // Parallel data fetching for maximum performance
    const [workflowsResult, stats, executions] = await Promise.all([
        supabase
            .from('workflows')
            .select('*')
            .order('updated_at', { ascending: false }),
        getWorkflowStats().catch(() => null),
        getExecutionHistory(10).catch(() => [])
    ])

    return (
        <GrowthEcosystemShell>
            <AutomationsView
                workflows={workflowsResult.data || []}
                stats={stats ? {
                    totalExecutions: stats.total,
                    successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
                    avgExecutionTime: Math.round(stats.avgDuration / 1000), // convert to seconds
                    todayExecutions: stats.total, // fallback for now as API doesn't distinguish
                    failedToday: stats.failed,
                    activeWorkflows: workflowsResult.data?.filter(w => w.is_active).length || 0
                } : undefined}
                recentExecutions={executions || []}
            />
        </GrowthEcosystemShell>
    )
}

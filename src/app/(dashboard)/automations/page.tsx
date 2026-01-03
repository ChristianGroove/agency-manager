import { createClient } from "@/lib/supabase-server"
import { AutomationsView } from "@/modules/core/automation/components/automations-view"
import { getWorkflowStats, getExecutionHistory } from "@/modules/core/automation/actions"

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
        <AutomationsView
            workflows={workflowsResult.data || []}
            stats={stats || undefined}
            recentExecutions={executions || []}
        />
    )
}

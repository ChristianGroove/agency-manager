import { createClient } from "@/lib/supabase-server"
import { AutomationsView } from "@/modules/core/automation/components/automations-view"
import { getWorkflowStats, getExecutionHistory } from "@/modules/core/automation/actions"

export const metadata = {
    title: "Automatizaciones | CRM",
    description: "Gestiona y monitorea tus workflows de automatización",
}

export default async function CRMAutomationsPage() {
    const supabase = await createClient()

    const [workflowsResult, stats, executions] = await Promise.all([
        supabase
            .from('workflows')
            .select('*')
            .order('updated_at', { ascending: false }),
        getWorkflowStats().catch(() => null),
        getExecutionHistory(10).catch(() => [])
    ])

    return (
        <div className="-m-8">
            <AutomationsView
                workflows={workflowsResult.data || []}
                stats={stats ? {
                    totalExecutions: stats.total,
                    successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
                    avgExecutionTime: Math.round(stats.avgDuration / 1000),
                    todayExecutions: stats.total,
                    failedToday: stats.failed,
                    activeWorkflows: workflowsResult.data?.filter(w => w.is_active).length || 0
                } : undefined}
                recentExecutions={executions?.map((e: any) => ({
                    ...e,
                    workflow: Array.isArray(e.workflows) ? e.workflows[0] : e.workflows
                })) || []}
            />
        </div>
    )
}

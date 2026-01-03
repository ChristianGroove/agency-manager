
import { getWorkflowStats, getExecutionHistory } from "@/modules/core/automation/actions"
import { PerformanceStats } from "@/modules/core/automation/components/analytics/performance-stats"
import { ExecutionsChart } from "@/modules/core/automation/components/analytics/executions-chart"
import { RecentExecutionsTable } from "@/modules/core/automation/components/analytics/recent-executions-table"

export default async function AnalyticsPage() {
    const stats = await getWorkflowStats()
    const history = await getExecutionHistory(100) // Get last 100 for chart

    return (
        <div className="flex-1 space-y-4 bg-slate-50 dark:bg-slate-900 min-h-screen">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
            </div>

            <div className="space-y-4">
                <PerformanceStats stats={stats} />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <ExecutionsChart data={history} />

                    <div className="col-span-3">
                        <div className="rounded-xl border bg-card text-card-foreground shadow">
                            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                                <h3 className="tracking-tight text-sm font-medium">Ejecuciones Recientes</h3>
                            </div>
                            <div className="p-6 pt-0">
                                <RecentExecutionsTable executions={history.slice(0, 5)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Briefcase, CheckCircle2, Clock, DollarSign } from "lucide-react"
import { supabase } from "@/modules/core/database/supabase"

interface KPIData {
    jobsThisMonth: number
    completedJobs: number
    pendingJobs: number
    estimatedRevenue: number
    loading: boolean
}

export function CleaningKPIsWidget() {
    const [kpis, setKpis] = useState<KPIData>({
        jobsThisMonth: 0,
        completedJobs: 0,
        pendingJobs: 0,
        estimatedRevenue: 0,
        loading: true
    })

    useEffect(() => {
        loadKPIs()
    }, [])

    async function loadKPIs() {
        try {
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

            // Jobs this month
            const { count: totalCount } = await supabase
                .from('work_orders')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startOfMonth.toISOString())

            // Completed this month
            const { count: completedCount } = await supabase
                .from('work_orders')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')
                .gte('created_at', startOfMonth.toISOString())

            // Pending jobs (overall)
            const { count: pendingCount } = await supabase
                .from('work_orders')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending', 'scheduled'])

            // Estimated revenue (jobs with service_id this month)
            const { data: jobsWithService } = await supabase
                .from('work_orders')
                .select('service_id')
                .gte('created_at', startOfMonth.toISOString())
                .not('service_id', 'is', null)

            let revenue = 0
            if (jobsWithService && jobsWithService.length > 0) {
                const serviceIds = jobsWithService.map(j => j.service_id)
                const { data: services } = await supabase
                    .from('service_catalog')
                    .select('base_price')
                    .in('id', serviceIds)

                if (services) {
                    revenue = services.reduce((sum, s) => sum + (s.base_price || 0), 0)
                }
            }

            setKpis({
                jobsThisMonth: totalCount || 0,
                completedJobs: completedCount || 0,
                pendingJobs: pendingCount || 0,
                estimatedRevenue: revenue,
                loading: false
            })
        } catch (error) {
            console.error('Error loading KPIs:', error)
            setKpis(prev => ({ ...prev, loading: false }))
        }
    }

    if (kpis.loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-center h-20">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    const stats = [
        {
            title: 'Trabajos Este Mes',
            value: kpis.jobsThisMonth,
            icon: Briefcase,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100 dark:bg-blue-900/20'
        },
        {
            title: 'Completados',
            value: kpis.completedJobs,
            icon: CheckCircle2,
            color: 'text-green-600',
            bgColor: 'bg-green-100 dark:bg-green-900/20'
        },
        {
            title: 'Pendientes',
            value: kpis.pendingJobs,
            icon: Clock,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100 dark:bg-orange-900/20'
        },
        {
            title: 'Revenue Estimado',
            value: `$${kpis.estimatedRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100 dark:bg-emerald-900/20'
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stats.map((stat) => {
                const Icon = stat.icon
                return (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                <Icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold ${stat.color}`}>
                                {stat.value}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}

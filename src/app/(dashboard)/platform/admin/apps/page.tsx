import { getAllAppsAdmin, getAppUsageStats } from '@/modules/core/saas/app-management-actions'
import { requireSuperAdmin } from '@/lib/auth/platform-roles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Users, DollarSign, TrendingUp } from 'lucide-react'
import { CreateAppDialog } from './_components/create-app-dialog'
import { AppsList } from './_components/apps-list'
import { getDictionary } from "@/lib/i18n"

export default async function AppsGalleryPage() {
    await requireSuperAdmin()
    const t = await getDictionary()

    const [apps, usageStats] = await Promise.all([
        getAllAppsAdmin(),
        getAppUsageStats() // This returns { [appId]: { count: number } }
    ])

    // Enrich apps with active_org_count from usageStats
    const enrichedApps = apps.map(app => ({
        ...app,
        active_org_count: usageStats[app.id]?.count || 0
    }))

    // Calculate metrics
    const totalApps = apps.length
    const activeApps = apps.filter(a => a.is_active).length
    const totalRevenue = apps.reduce((sum, app) => {
        const count = usageStats[app.id]?.count || 0
        return sum + (count * Number(app.price_monthly))
    }, 0)
    const totalOrganizations = Object.values(usageStats).reduce((sum, stat) => sum + stat.count, 0)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t.admin.title}</h1>
                    <p className="text-muted-foreground mt-1">
                        {t.admin.description}
                    </p>
                </div>
                <CreateAppDialog dict={t.admin} />
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Templates</CardTitle>
                        <Package className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalApps}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {activeApps} active now
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOrganizations}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Active subscriptions
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Monthly MRR</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ${totalRevenue.toFixed(0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Estimated revenue
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Price</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${apps.length > 0 ? (apps.reduce((sum, a) => sum + Number(a.price_monthly), 0) / apps.length).toFixed(0) : '0'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Per template
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Interactive List */}
            <AppsList initialApps={enrichedApps} dict={t.admin} />
        </div>
    )
}

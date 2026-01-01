import { getAllAppsAdmin, getAppUsageStats, deleteApp } from '@/modules/core/saas/app-management-actions'
import { requireSuperAdmin } from '@/lib/auth/platform-roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Package, TrendingUp, Users, DollarSign, Search, Settings, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { CreateAppDialog } from './_components/create-app-dialog'

export default async function AppsGalleryPage() {
    await requireSuperAdmin()

    const [apps, usageStats] = await Promise.all([
        getAllAppsAdmin(),
        getAppUsageStats()
    ])

    // Calculate metrics
    const totalApps = apps.length
    const activeApps = apps.filter(a => a.is_active).length
    const totalRevenue = apps.reduce((sum, app) => {
        const usage = usageStats[app.id]
        return sum + (usage?.count || 0) * Number(app.price_monthly)
    }, 0)
    const totalOrganizations = Object.values(usageStats).reduce((sum, stat) => sum + stat.count, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">App Templates</h1>
                    <p className="text-muted-foreground">
                        Pre-configured bundles of modules for specific use cases
                    </p>
                </div>
                <CreateAppDialog />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Apps</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalApps}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeApps} active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOrganizations}</div>
                        <p className="text-xs text-muted-foreground">
                            Using apps
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ${totalRevenue.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            From app subscriptions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${apps.length > 0 ? (apps.reduce((sum, a) => sum + Number(a.price_monthly), 0) / apps.length).toFixed(2) : '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Per app/month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search apps..."
                        className="pl-10"
                    />
                </div>
                <Button variant="outline">
                    All Categories
                </Button>
            </div>

            {/* Apps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.map((app) => {
                    const usage = usageStats[app.id] || { count: 0, organizations: [] }
                    const monthlyRevenue = usage.count * Number(app.price_monthly)

                    return (
                        <Card key={app.id} className="relative overflow-hidden group hover:shadow-lg transition-all">
                            {/* Featured Badge */}
                            {app.is_featured && (
                                <div className="absolute top-3 right-3 z-10">
                                    <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 border-0">
                                        ⭐ Featured
                                    </Badge>
                                </div>
                            )}

                            {/* Status Badge */}
                            {!app.is_active && (
                                <div className="absolute top-3 left-3 z-10">
                                    <Badge variant="secondary">
                                        Inactive
                                    </Badge>
                                </div>
                            )}

                            <CardHeader>
                                {/* Icon and Title */}
                                <div className="flex items-start gap-3">
                                    <div
                                        className="p-3 rounded-lg"
                                        style={{
                                            backgroundColor: `${app.color}15`,
                                            color: app.color
                                        }}
                                    >
                                        <Package className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg truncate">
                                            {app.name}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs">
                                                {app.category}
                                            </Badge>
                                            <span className="text-sm font-semibold" style={{ color: app.color }}>
                                                ${app.price_monthly}/mo
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <CardDescription className="mt-3 line-clamp-2">
                                    {app.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="p-2 rounded-lg bg-muted/50">
                                        <div className="text-sm font-bold">{app.module_count}</div>
                                        <div className="text-xs text-muted-foreground">Modules</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-muted/50">
                                        <div className="text-sm font-bold">{usage.count}</div>
                                        <div className="text-xs text-muted-foreground">Active</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-muted/50">
                                        <div className="text-sm font-bold text-green-600">
                                            ${monthlyRevenue.toFixed(0)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">MRR</div>
                                    </div>
                                </div>

                                {/* Trial Badge */}
                                {app.trial_days > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{app.trial_days}-day free trial</span>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2 border-t">
                                    <Link href={`/platform/admin/apps/${app.slug}`} className="flex-1">
                                        <Button variant="outline" className="w-full" size="sm">
                                            <Settings className="mr-2 h-4 w-4" />
                                            Manage
                                        </Button>
                                    </Link>
                                    <form action={async () => {
                                        'use server'
                                        await deleteApp(app.id)
                                    }}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            disabled={usage.count > 0}
                                            title={usage.count > 0 ? 'Cannot delete app in use' : 'Delete app'}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>

                                {/* Organizations using this app */}
                                {usage.count > 0 && (
                                    <div className="text-xs text-muted-foreground pt-2 border-t">
                                        <div className="font-medium mb-1">Used by:</div>
                                        <div className="line-clamp-2">
                                            {usage.organizations.join(', ')}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Empty State */}
            {apps.length === 0 && (
                <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No apps found</h3>
                    <p className="text-muted-foreground mt-2">
                        Create your first app template to get started
                    </p>
                    <div className="mt-4">
                        <CreateAppDialog />
                    </div>
                </div>
            )}
        </div>
    )
}

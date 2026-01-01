import { getAppBySlug, deleteApp, updateApp } from '@/modules/core/saas/app-management-actions'
import { requireSuperAdmin } from '@/lib/auth/platform-roles'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package, Users, DollarSign, Settings } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
    params: Promise<{
        slug: string
    }>
}

export default async function AppDetailPage({ params }: PageProps) {
    await requireSuperAdmin()

    const { slug } = await params
    const app = await getAppBySlug(slug)

    if (!app) {
        notFound()
    }

    const monthlyRevenue = app.active_org_count * Number(app.price_monthly)

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/platform/admin/apps">
                <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Apps
                </Button>
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <div
                        className="p-4 rounded-xl"
                        style={{
                            backgroundColor: `${app.color}15`,
                            color: app.color
                        }}
                    >
                        <Package className="h-8 w-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold">{app.name}</h1>
                            {app.is_featured && (
                                <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 border-0">
                                    ⭐ Featured
                                </Badge>
                            )}
                            {!app.is_active && (
                                <Badge variant="secondary">Inactive</Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground mt-1">{app.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline">{app.category}</Badge>
                            <span className="text-sm font-semibold" style={{ color: app.color }}>
                                ${app.price_monthly}/month
                            </span>
                            {app.trial_days > 0 && (
                                <span className="text-sm text-muted-foreground">
                                    • {app.trial_days}-day trial
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Button disabled title="Edit functionality coming soon">
                    <Settings className="mr-2 h-4 w-4" />
                    Edit App
                </Button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{app.active_org_count}</div>
                        <p className="text-xs text-muted-foreground">
                            Using this app
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
                            ${monthlyRevenue.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            From this app
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Modules Included</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{app.module_count}</div>
                        <p className="text-xs text-muted-foreground">
                            Pre-configured modules
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Modules List */}
            <Card>
                <CardHeader>
                    <CardTitle>Included Modules</CardTitle>
                    <CardDescription>
                        Modules that are automatically enabled when this app is assigned
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {app.modules.map((module) => (
                            <div
                                key={module.id}
                                className="flex items-center justify-between p-3 rounded-lg border"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{module.module_key}</span>
                                        <div className="flex gap-2 mt-1">
                                            {module.is_core && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Core
                                                </Badge>
                                            )}
                                            {module.auto_enable && (
                                                <Badge variant="outline" className="text-xs">
                                                    Auto-enable
                                                </Badge>
                                            )}
                                            {module.is_optional && (
                                                <Badge variant="outline" className="text-xs">
                                                    Optional
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recommended Add-ons */}
            {app.recommended_add_ons.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Recommended Add-ons</CardTitle>
                        <CardDescription>
                            Suggested add-ons to enhance this app
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {app.recommended_add_ons.map((addon) => (
                                <div
                                    key={addon.id}
                                    className="flex items-center justify-between p-3 rounded-lg border"
                                >
                                    <div>
                                        <span className="font-medium capitalize">
                                            {addon.add_on_type}
                                        </span>
                                        {addon.tier_id && (
                                            <span className="text-sm text-muted-foreground ml-2">
                                                ({addon.tier_id})
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {addon.discount_percent > 0 && (
                                            <Badge className="bg-green-500/10 text-green-600">
                                                {addon.discount_percent}% off
                                            </Badge>
                                        )}
                                        {addon.is_recommended && (
                                            <Badge variant="outline">
                                                Recommended
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Long Description */}
            {app.long_description && (
                <Card>
                    <CardHeader>
                        <CardTitle>About this App</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{app.long_description}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

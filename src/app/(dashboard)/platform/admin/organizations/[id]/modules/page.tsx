import { getAdminOrganizationById } from '@/modules/core/admin/actions'
import { getCurrentOrganizationApp, getAllApps } from '@/modules/core/saas/app-management-actions'
import { getOrganizationActiveModules, getAllSystemModules } from '@/modules/core/saas/module-management-actions'
import { requireSuperAdmin } from '@/lib/auth/platform-roles'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package, Check, X } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default async function OrganizationModulesPage({ params }: PageProps) {
    await requireSuperAdmin()

    const { id } = await params

    // Fetch organization data
    const [organization, allModules, activeModuleKeys] = await Promise.all([
        getAdminOrganizationById(id),
        getAllSystemModules(),
        getOrganizationActiveModules(id)
    ])

    if (!organization) {
        notFound()
    }

    // Separate active and available modules
    const activeModules = allModules.filter((m: any) => activeModuleKeys.includes(m.key))
    const availableModules = allModules.filter((m: any) => !activeModuleKeys.includes(m.key))

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link href="/platform/admin/organizations">
                <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Organizations
                </Button>
            </Link>

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">{organization.name}</h1>
                <p className="text-muted-foreground mt-1">
                    Module Management for @{organization.slug}
                </p>
            </div>

            {/* Current App Display */}
            {organization.active_app_id && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Current App Template</CardTitle>
                                <CardDescription>
                                    Pre-configured module bundle
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" disabled title="Coming soon">
                                Switch App
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <div className="font-medium">{organization.active_app_id}</div>
                                <div className="text-sm text-muted-foreground">
                                    Active since {organization.app_activated_at ? new Date(organization.app_activated_at).toLocaleDateString() : 'N/A'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Active Modules */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Modules ({activeModules.length})</CardTitle>
                    <CardDescription>
                        Modules currently enabled for this organization
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {activeModules.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No active modules
                            </div>
                        ) : (
                            activeModules.map((module) => (
                                <div
                                    key={module.id}
                                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="p-2 rounded-lg"
                                            style={{
                                                backgroundColor: `${module.color}15`,
                                                color: module.color
                                            }}
                                        >
                                            <Check className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{module.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {module.description || module.key}
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                {module.is_core && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Core
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-xs">
                                                    {module.category}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        {module.is_core ? (
                                            <Badge variant="secondary">
                                                Always Active
                                            </Badge>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                disabled
                                                title="Coming soon: Smart disable with dependency check"
                                            >
                                                Disable
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Available Modules */}
            <Card>
                <CardHeader>
                    <CardTitle>Available to Enable ({availableModules.length})</CardTitle>
                    <CardDescription>
                        Modules that can be activated for this organization
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {availableModules.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                All compatible modules are already active
                            </div>
                        ) : (
                            availableModules.map((module) => (
                                <div
                                    key={module.id}
                                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="p-2 rounded-lg bg-muted"
                                        >
                                            <X className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{module.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {module.description || module.key}
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {module.category}
                                                </Badge>
                                                {module.is_premium && (
                                                    <Badge className="text-xs bg-gradient-to-r from-amber-500 to-amber-600">
                                                        Premium ${module.price_monthly}/mo
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Button
                                            size="sm"
                                            disabled
                                            title="Coming soon: Smart enable with dependency resolution"
                                        >
                                            Enable
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Module Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Module Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 rounded-lg bg-muted/50">
                            <div className="text-2xl font-bold text-green-600">
                                {activeModules.length}
                            </div>
                            <div className="text-sm text-muted-foreground">Active</div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                            <div className="text-2xl font-bold">
                                {availableModules.length}
                            </div>
                            <div className="text-sm text-muted-foreground">Available</div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                            <div className="text-2xl font-bold text-blue-600">
                                {activeModules.filter(m => m.is_core).length}
                            </div>
                            <div className="text-sm text-muted-foreground">Core</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

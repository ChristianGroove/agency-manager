import { getAdminDashboardStats, getActiveBroadcasts, getAllSystemModules } from '@/modules/core/admin/actions'
import { getAdminOrganizations } from '@/modules/core/admin/actions'
import { getAllAppsAdmin } from "@/modules/core/saas/app-management-actions"
import { requireSuperAdmin } from '@/lib/auth/platform-roles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutDashboard, Globe, Codepen, ShieldAlert, Activity, Server, Box, Building2, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SystemHealthWidget } from './_components/system-health-widget'
import { getDictionary } from "@/lib/i18n"

// Placeholder components - will be implemented in next steps
import { TenantsManager } from './_components/tenants-manager'
import { SaasEngineManager } from "./_components/saas-engine-manager"
import { SecurityCenter } from "./_components/security-center"
import { DomainsManager } from "./_components/domains-manager"

export default async function AdminDashboardPage() {
    await requireSuperAdmin()
    const t = await getDictionary()

    const [stats, activeBroadcasts, organizations, allModules, apps] = await Promise.all([
        getAdminDashboardStats(),
        getActiveBroadcasts(),
        getAdminOrganizations(),
        getAllSystemModules(),
        getAllAppsAdmin()
    ])

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <Activity className="h-8 w-8 text-primary" />
                        Centro de Mando
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm pl-11">
                        Control unificado de operaciones, red y seguridad del sistema.
                    </p>
                </div>
            </div>

            {/* Main Command Center Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full max-w-full grid-cols-4 bg-gray-100/50 dark:bg-white/5 p-1 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-lg h-auto">
                    <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all py-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Visión Global
                    </TabsTrigger>
                    <TabsTrigger value="network" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all py-2">
                        <Globe className="h-4 w-4" />
                        Red (Tenants)
                    </TabsTrigger>
                    <TabsTrigger value="saas" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all py-2">
                        <Codepen className="h-4 w-4" />
                        SaaS Engine
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all py-2">
                        <ShieldAlert className="h-4 w-4" />
                        Seguridad
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Metrics & Activity */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-transparent border-blue-100 dark:border-blue-900/30">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Orgs Activas</CardTitle>
                                        <Building2 className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.totalOrgs}</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-transparent border-purple-100 dark:border-purple-900/30">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios</CardTitle>
                                        <Users className="h-4 w-4 text-purple-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Catálogo Apps</CardTitle>
                                        <Box className="h-4 w-4 text-gray-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{apps.length}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Salud API</CardTitle>
                                        <Activity className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">99.9%</div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Recent Activity Log */}
                            <Card className="overflow-hidden">
                                <CardHeader className="border-b bg-muted/30 py-3">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Server className="h-4 w-4" />
                                        Bitácora del Sistema
                                    </h3>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[300px] p-4 font-mono text-xs">
                                        <div className="space-y-3">
                                            {stats.recentLogs.map((log: any) => (
                                                <div key={log.id} className="flex gap-3 pb-2 border-b border-dashed last:border-0 border-muted">
                                                    <span className="text-muted-foreground shrink-0 w-[100px]">
                                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                                                    </span>
                                                    <div className="flex-1">
                                                        <span className={
                                                            log.action === 'suspended' ? 'text-red-500 font-bold' :
                                                                log.action === 'activated' ? 'text-green-500 font-bold' :
                                                                    'text-blue-500 font-bold'
                                                        }>
                                                            {log.action.toUpperCase()}
                                                        </span>
                                                        <span className="ml-2 text-foreground">
                                                            Org ID: {log.organization_id.split('-')[0]}
                                                        </span>
                                                        {log.details?.reason && (
                                                            <span className="block mt-1 text-muted-foreground italic">
                                                                "{log.details.reason}"
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {stats.recentLogs.length === 0 && (
                                                <p className="text-muted-foreground text-center py-4">Sin actividad reciente.</p>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Side Widgets */}
                        <div className="space-y-6">
                            <SystemHealthWidget alerts={activeBroadcasts} />
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 2: NETWORK (Tenants) */}
                <TabsContent value="network" className="focus-visible:outline-none">
                    <Tabs defaultValue="tenants" className="space-y-6">
                        <TabsList className="bg-muted/50 p-1 h-10 rounded-lg">
                            <TabsTrigger value="tenants" className="gap-2">
                                <Building2 className="h-4 w-4" />
                                Organizaciones
                            </TabsTrigger>
                            <TabsTrigger value="domains" className="gap-2">
                                <Globe className="h-4 w-4" />
                                Dominios & DNS
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="tenants" className="focus-visible:outline-none">
                            <TenantsManager organizations={organizations} allModules={allModules} />
                        </TabsContent>
                        <TabsContent value="domains" className="focus-visible:outline-none">
                            <DomainsManager initialOrgs={organizations} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                {/* TAB 3: SAAS ENGINE */}
                <TabsContent value="saas" className="focus-visible:outline-none">
                    <SaasEngineManager allModules={allModules} apps={apps} dict={t.admin} />
                </TabsContent>

                {/* TAB 4: SECURITY */}
                <TabsContent value="security" className="focus-visible:outline-none">
                    <SecurityCenter />
                </TabsContent>
            </Tabs>
        </div>
    )
}

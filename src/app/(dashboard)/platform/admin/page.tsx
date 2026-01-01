import { getAdminDashboardStats, getActiveBroadcasts, getAllSystemModules } from '@/modules/core/admin/actions'
import { getAdminOrganizations } from '@/modules/core/admin/actions'
import { requireSuperAdmin } from '@/lib/auth/platform-roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, Bell, Activity, Globe, Palette, ExternalLink, Package } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { OrgManagerSheet } from './_components/org-manager-sheet'
import { ActiveBroadcastsList } from './_components/active-broadcasts-list'

export default async function AdminDashboardPage() {
    await requireSuperAdmin()

    // Fetch all necessary data
    // Note: getAdminOrganizations is separate from dashboard stats to keep `stats` light
    const [stats, activeBroadcasts, organizations, allModules] = await Promise.all([
        getAdminDashboardStats(),
        getActiveBroadcasts(),
        getAdminOrganizations(),
        getAllSystemModules()
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Centro de Mando</h1>
                    <p className="text-muted-foreground">Visión global y control del sistema SaaS.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* The Org Manager Sheet replaces the external link */}
                    <OrgManagerSheet organizations={organizations} allModules={allModules} />
                </div>
            </div>

            {/* Main KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Organizaciones</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrgs}</div>
                        <p className="text-xs text-muted-foreground">Registradas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">Estimados en Profiles</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
                        <Bell className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{stats.activeAlerts}</div>
                        <p className="text-xs text-muted-foreground">Difusiones en curso</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estado Sistema</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">Online</div>
                        <p className="text-xs text-muted-foreground">Operational</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Access Section */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Acceso Rápido</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Domains Card */}
                    <a href="/platform/admin/domains" className="block group">
                        <Card className="h-full transition-all hover:shadow-lg hover:border-indigo-500/50 cursor-pointer">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="p-2 rounded-lg bg-indigo-500/10">
                                        <Globe className="h-6 w-6 text-indigo-500" />
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                                </div>
                                <CardTitle className="text-base mt-4">Gestión de Dominios</CardTitle>
                                <CardDescription>
                                    Configura dominios administrativos y de portales
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </a>

                    {/* Branding Card */}
                    <a href="/platform/admin/branding" className="block group">
                        <Card className="h-full transition-all hover:shadow-lg hover:border-pink-500/50 cursor-pointer">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="p-2 rounded-lg bg-pink-500/10">
                                        <Palette className="h-6 w-6 text-pink-500" />
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-pink-500 transition-colors" />
                                </div>
                                <CardTitle className="text-base mt-4">Marca Global</CardTitle>
                                <CardDescription>
                                    Define identidad visual de la plataforma
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </a>

                    {/* Branding Tiers Card */}
                    <a href="/platform/admin/branding/tiers" className="block group">
                        <Card className="h-full transition-all hover:shadow-lg hover:border-amber-500/50 cursor-pointer relative overflow-hidden">
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2 py-0.5 text-xs font-bold rounded">
                                MONETIZE
                            </div>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="p-2 rounded-lg bg-amber-500/10">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                                            <path d="M4 22h16"></path>
                                            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                                            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                                            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                                        </svg>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                                </div>
                                <CardTitle className="text-base mt-4">Branding Tiers</CardTitle>
                                <CardDescription>
                                    Gestiona suscripciones de branding premium
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </a>

                    {/* Apps Card */}
                    <a href="/platform/admin/apps" className="block group">
                        <Card className="h-full transition-all hover:shadow-lg hover:border-purple-500/50 cursor-pointer">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="p-2 rounded-lg bg-purple-500/10">
                                        <Package className="h-6 w-6 text-purple-500" />
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                                </div>
                                <CardTitle className="text-base mt-4">Solution Templates</CardTitle>
                                <CardDescription>
                                    Pre-configured module bundles for different use cases
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity Feed */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                        <CardDescription>Auditoría de acciones en organizaciones.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-4">
                                {stats.recentLogs.map((log: any) => (
                                    <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
                                        <div className={`mt-1 p-1 rounded-full ${log.action === 'suspended' ? 'bg-red-100 text-red-600' :
                                            log.action === 'activated' ? 'bg-green-100 text-green-600' : 'bg-gray-100'
                                            }`}>
                                            <Activity className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                Acción: {log.action.toUpperCase()}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Org ID: {log.organization_id}
                                            </p>
                                            {log.details?.reason && (
                                                <p className="text-xs bg-gray-50 p-1 rounded mt-1">
                                                    Razón: {log.details.reason}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                                        </div>
                                    </div>
                                ))}
                                {stats.recentLogs.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">
                                        No hay registros recientes.
                                    </p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Active Broadcasts Sidebar */}
                <Card>
                    <CardHeader>
                        <CardTitle>Difusiones Activas</CardTitle>
                        <CardDescription>Mensajes visibles para los usuarios.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ActiveBroadcastsList alerts={activeBroadcasts} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

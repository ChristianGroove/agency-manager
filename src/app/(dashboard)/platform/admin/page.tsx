import { getAdminDashboardStats, getActiveBroadcasts, getAllSystemModules } from '@/app/actions/admin-dashboard-actions'
import { getAdminOrganizations } from '@/app/actions/admin-actions'
import { requireSuperAdmin } from '@/lib/auth/platform-roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, Bell, Activity } from 'lucide-react'
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

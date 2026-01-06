import { getAdminDashboardStats, getActiveBroadcasts, getAllSystemModules } from '@/modules/core/admin/actions'
import { getAdminOrganizations } from '@/modules/core/admin/actions'
import { requireSuperAdmin } from '@/lib/auth/platform-roles'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Building2, Users, Activity, Terminal } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { OrgManagerSheet } from './_components/org-manager-sheet'
import { AdminShortcuts } from './_components/admin-shortcuts'
import { SystemHealthWidget } from './_components/system-health-widget'
import { getDictionary } from "@/lib/i18n"

export default async function AdminDashboardPage() {
    await requireSuperAdmin()
    const t = await getDictionary()

    const [stats, activeBroadcasts, organizations, allModules] = await Promise.all([
        getAdminDashboardStats(),
        getActiveBroadcasts(),
        getAdminOrganizations(),
        getAllSystemModules()
    ])

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Centro de Mando</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Visión global y control operativo del sistema SaaS.</p>
                </div>
                <div className="flex items-center gap-2">
                    <OrgManagerSheet organizations={organizations} allModules={allModules} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* COLUMN 1 & 2: Main Operations */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Compact KPI Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-gradient-to-br from-gray-50 to-white dark:from-white/5 dark:to-white/5 dark:border-white/10 hover:shadow-md transition-all">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Total Organizaciones</CardTitle>
                                <Building2 className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOrgs}</div>
                                <p className="text-xs text-muted-foreground">Registradas en el sistema</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-gray-50 to-white dark:from-white/5 dark:to-white/5 dark:border-white/10 hover:shadow-md transition-all">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Total Usuarios</CardTitle>
                                <Users className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</div>
                                <p className="text-xs text-muted-foreground">Perfiles activos</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Launchpad (Admin Shortcuts) */}
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-3 px-1">Accesos Directos</h2>
                        <AdminShortcuts t={t} />
                    </div>

                    {/* Activity Feed (Terminal Style) */}
                    <Card className="border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-zinc-900">
                        <CardHeader className="border-b bg-gray-50/50 dark:bg-white/5 py-3 border-gray-100 dark:border-white/10">
                            <div className="flex items-center gap-2">
                                <Terminal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Log de Actividad del Sistema</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[200px] bg-[#1e1e1e] text-gray-300 font-mono text-xs p-4">
                                <div className="space-y-2">
                                    {stats.recentLogs.map((log: any) => (
                                        <div key={log.id} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors group">
                                            <span className="text-gray-500 shrink-0 w-[120px]">
                                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                                            </span>
                                            <div className="flex-1">
                                                <span className={`mr-2 font-bold ${log.action === 'suspended' ? 'text-red-400' :
                                                    log.action === 'activated' ? 'text-green-400' :
                                                        'text-blue-400'
                                                    }`}>
                                                    [{log.action.toUpperCase()}]
                                                </span>
                                                <span className="text-gray-300">
                                                    Org: <span className="text-white">{log.organization_id.split('-')[0]}...</span>
                                                </span>
                                                {log.details?.reason && (
                                                    <span className="ml-2 text-gray-500 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        // {log.details.reason}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {stats.recentLogs.length === 0 && (
                                        <p className="text-gray-600 italic">No hay actividad reciente registrada.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* COLUMN 3: Health & Status - Fixed Sidebar */}
                <div className="lg:col-span-1">
                    <SystemHealthWidget alerts={activeBroadcasts} />
                </div>
            </div>
        </div>
    )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Box, Zap, Calendar, Hash, Globe, Shield } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface OrgDashboardViewProps {
    organization: any
    stats: {
        users: number
        clients: number
        activeModules: number
    }
}

export function OrgDashboardView({ organization, stats }: OrgDashboardViewProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-900">Usuarios Totales</CardTitle>
                        <Users className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-700">{stats.users}</div>
                        <p className="text-xs text-indigo-600/60 mt-1">Miembros activos</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-900">Módulos Activos</CardTitle>
                        <Box className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-700">{stats.activeModules}</div>
                        <p className="text-xs text-purple-600/60 mt-1">Funcionalidades habilitadas</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-900">Estado del Plan</CardTitle>
                        <Zap className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <Badge variant={organization.status === 'active' ? 'default' : 'destructive'} className="uppercase text-[10px] tracking-wider">
                            {organization.status}
                        </Badge>
                        <p className="text-xs text-emerald-600/60 mt-2">
                            {organization.subscription_status || 'Sin suscripción'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900">App Base</CardTitle>
                        <Globe className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-bold text-blue-700 truncate" title={organization.base_app_slug}>
                            {organization.base_app_slug || 'N/A'}
                        </div>
                        <p className="text-xs text-blue-600/60 mt-1">Template inicial</p>
                    </CardContent>
                </Card>
            </div>

            {/* Technical Details */}
            <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-500" />
                        Ficha Técnica
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
                        <div className="flex flex-col gap-1">
                            <dt className="text-gray-500 text-xs font-medium uppercase tracking-wide">ID de Organización</dt>
                            <dd className="font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded inline-block w-fit select-all">
                                {organization.id}
                            </dd>
                        </div>

                        <div className="flex flex-col gap-1">
                            <dt className="text-gray-500 text-xs font-medium uppercase tracking-wide">Slug (Identificador URL)</dt>
                            <dd className="font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded inline-block w-fit select-all">
                                {organization.slug}
                            </dd>
                        </div>

                        <div className="flex flex-col gap-1">
                            <dt className="text-gray-500 text-xs font-medium uppercase tracking-wide">Fecha de Creación</dt>
                            <dd className="flex items-center gap-2 text-gray-700">
                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                {organization.created_at ? format(new Date(organization.created_at), "PPP 'a las' p", { locale: es }) : 'N/A'}
                            </dd>
                        </div>

                        <div className="flex flex-col gap-1">
                            <dt className="text-gray-500 text-xs font-medium uppercase tracking-wide">Nivel de Seguridad (Billing)</dt>
                            <dd className="flex items-center gap-2 text-gray-700">
                                <Shield className="h-3.5 w-3.5 text-gray-400" />
                                {organization.branding_tier_id ? 'Tier Asignado' : 'Estándar'}
                            </dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>
        </div>
    )
}

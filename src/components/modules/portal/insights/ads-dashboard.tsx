
import { NormalizedAdsMetrics } from "@/lib/integrations/meta/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Eye, MousePointer2, TrendingUp, BarChart3, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface AdsDashboardProps {
    data: NormalizedAdsMetrics
}

export function AdsDashboard({ data }: AdsDashboardProps) {
    if (!data) return null

    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                    title="Inversión"
                    value={formatCurrency(data.spend)}
                    icon={DollarSign}
                    color="text-green-600"
                    bg="bg-green-100"
                />
                <KPICard
                    title="Impresiones"
                    value={data.impressions.toLocaleString()}
                    icon={Eye}
                    color="text-blue-600"
                    bg="bg-blue-100"
                />
                <KPICard
                    title="Clics"
                    value={data.clicks.toLocaleString()}
                    icon={MousePointer2}
                    color="text-purple-600"
                    bg="bg-purple-100"
                />
                <KPICard
                    title="ROAS"
                    value={`${data.roas}x`}
                    icon={TrendingUp}
                    color="text-amber-600"
                    bg="bg-amber-100"
                    info="Retorno por cada $1 invertido"
                />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Resultado / Costo (CPA)</span>
                            <span className="font-bold text-gray-900">{formatCurrency(data.cpc)}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Tasa de Clics (CTR)</span>
                            <span className="font-bold text-gray-900">{data.ctr}%</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Campaigns */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="w-5 h-5 text-gray-500" />
                        Campañas Activas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.campaigns.map((campaign) => (
                            <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900 line-clamp-1">{campaign.name}</p>
                                    <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full capitalize">
                                        {campaign.status.toLowerCase().replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900">{formatCurrency(campaign.spend)}</p>
                                    <p className="text-xs text-gray-500">Inversión</p>
                                </div>
                            </div>
                        ))}
                        {data.campaigns.length === 0 && (
                            <div className="text-center py-6 text-gray-400">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No hay campañas activas reportadas</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <p className="text-xs text-center text-gray-400 mt-4">
                Actualizado: {new Date(data.last_updated).toLocaleString()}
            </p>
        </div>
    )
}

function KPICard({ title, value, icon: Icon, color, bg, info }: any) {
    return (
        <Card>
            <CardContent className="p-4 flex flex-col items-center text-center gap-2 relative group">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg} ${color} mb-1`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</span>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
                </div>
                {info && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black text-white text-[10px] px-2 py-1 rounded">
                            {info}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

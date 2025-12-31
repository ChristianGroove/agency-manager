
import { NormalizedAdsMetrics } from "@/lib/integrations/meta/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DollarSign, Eye, MousePointer2, TrendingUp, BarChart3, AlertCircle, ChevronDown, ChevronUp, Image as ImageIcon, Calendar } from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface AdsDashboardProps {
    data: NormalizedAdsMetrics
    datePreset?: string
    onDatePresetChange?: (preset: string) => void
    loading?: boolean
}

export function AdsDashboard({ data, datePreset, onDatePresetChange, loading }: AdsDashboardProps) {
    const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)

    if (!data) return null

    const toggleCampaign = (id: string) => {
        setExpandedCampaignId(expandedCampaignId === id ? null : id)
    }

    // Safety Casts
    const safeData = {
        ...data,
        spend: Number(data.spend || 0),
        impressions: Number(data.impressions || 0),
        clicks: Number(data.clicks || 0),
        roas: Number(data.roas || 0),
        cpc: Number(data.cpc || 0),
        ctr: Number(data.ctr || 0),
        campaigns: Array.isArray(data.campaigns) ? data.campaigns.map(c => ({
            ...c,
            spend: Number(c.spend || 0),
            impressions: Number(c.impressions || 0),
            clicks: Number(c.clicks || 0),
            ctr: Number(c.ctr || 0),
            conversions: Number(c.conversions || 0),
            cost_per_conversion: Number(c.cost_per_conversion || 0),
            daily_budget: c.daily_budget ? Number(c.daily_budget) : 0,
            lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) : 0,
            ads: (c.ads || []).map(a => ({
                ...a,
                spend: Number(a.spend || 0),
                impressions: Number(a.impressions || 0),
                conversions: Number(a.conversions || 0),
                cost_per_conversion: Number(a.cost_per_conversion || 0)
            }))
        })) : []
    }

    return (
        <div className="space-y-6">
            {/* Header / Date Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    {/* Optional: Add title or subtitle if needed */}
                </div>

                {onDatePresetChange && (
                    <div className="grid grid-cols-3 bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                        <FilterButton
                            active={datePreset === 'today'}
                            onClick={() => onDatePresetChange('today')}
                            label="Hoy"
                        />
                        <FilterButton
                            active={datePreset === 'yesterday'}
                            onClick={() => onDatePresetChange('yesterday')}
                            label="Ayer"
                        />
                        <FilterButton
                            active={datePreset === 'last_30d' || datePreset === 'this_month'}
                            onClick={() => onDatePresetChange('last_30d')}
                            label="Este Mes"
                        />
                    </div>
                )}
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                    {/* Optional loading overlay if main page doesn't handle it */}
                </div>
            )}

            {/* KPI Grid */}
            <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4 transition-opacity duration-300", loading ? "opacity-50" : "opacity-100")}>
                <KPICard
                    title="Inversión"
                    value={formatCurrency(safeData.spend)}
                    icon={DollarSign}
                    color="text-green-600"
                    bg="bg-green-100"
                />
                <KPICard
                    title="Impresiones"
                    value={safeData.impressions.toLocaleString()}
                    icon={Eye}
                    color="text-blue-600"
                    bg="bg-blue-100"
                />
                <KPICard
                    title="Clics"
                    value={safeData.clicks.toLocaleString()}
                    icon={MousePointer2}
                    color="text-purple-600"
                    bg="bg-purple-100"
                />
                <KPICard
                    title="ROAS"
                    value={`${safeData.roas.toFixed(2)}x`}
                    icon={TrendingUp}
                    color="text-amber-600"
                    bg="bg-amber-100"
                    info="Retorno por cada $1 invertido"
                />
            </div>

            {/* Secondary Metrics */}
            <div className={cn("grid grid-cols-2 gap-4 transition-opacity", loading ? "opacity-50" : "opacity-100")}>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Costo por Resultado (CPA)</span>
                            <span className="font-bold text-gray-900">{formatCurrency(safeData.cpc)}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Tasa de Clics (CTR)</span>
                            <span className="font-bold text-gray-900">{safeData.ctr.toFixed(2)}%</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Campaigns Hierarchy */}
            <Card className={cn("transition-opacity", loading ? "opacity-50" : "opacity-100")}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="w-5 h-5 text-gray-500" />
                        Desglose de Campañas
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Headers */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider items-center">
                        <div className="col-span-5">Campaña / Anuncios</div>
                        <div className="col-span-2 text-right">Inversión</div>
                        <div className="col-span-3 text-right">Resultados (Conv.)</div>
                        <div className="col-span-2 text-right">Impresiones</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {safeData.campaigns.map((campaign) => {
                            const isExpanded = expandedCampaignId === campaign.id
                            const hasAds = campaign.ads && campaign.ads.length > 0
                            const adCount = campaign.ads?.length || 0

                            // Budget Calculation
                            const budget = campaign.daily_budget || campaign.lifetime_budget || 0
                            const budgetType = campaign.daily_budget ? 'diario' : (campaign.lifetime_budget ? 'total' : '')
                            const progress = budget > 0 ? Math.min((campaign.spend / budget) * 100, 100) : 0

                            return (
                                <div key={campaign.id} className="bg-white">
                                    {/* Campaign Row */}
                                    <div
                                        className={cn(
                                            "flex flex-col md:grid md:grid-cols-12 gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors items-center",
                                            isExpanded ? "bg-gray-50" : ""
                                        )}
                                        onClick={() => toggleCampaign(campaign.id)}
                                    >
                                        {/* Name & Status */}
                                        <div className="col-span-5 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {hasAds ? (
                                                    isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
                                                ) : <div className="w-4" />}
                                                <div>
                                                    <p className="font-medium text-gray-900 truncate max-w-[200px] md:max-w-[300px]">{campaign.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={cn(
                                                            "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                                                            campaign.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                                        )}>
                                                            {campaign.status === 'ACTIVE' ? 'Activo' : campaign.status.toLowerCase().replace('_', ' ')}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 border border-gray-200 px-1.5 rounded-full">
                                                            {adCount} {adCount === 1 ? 'Anuncio' : 'Anuncios'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Budget Bar (Only if budget exists) */}
                                            {budget > 0 && (
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2 pl-6">
                                                    <div className="flex-1 max-w-[150px]">
                                                        <Progress value={progress} className={cn("h-1.5", progress > 90 ? "bg-red-100" : "bg-gray-100")} />
                                                    </div>
                                                    <span className="whitespace-nowrap">{formatCurrency(campaign.spend)} de {formatCurrency(budget)} {budgetType && `(${budgetType})`}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Spend */}
                                        <div className="col-span-2 text-right">
                                            <p className="font-bold text-gray-900">{formatCurrency(campaign.spend)}</p>
                                            <p className="text-[10px] text-gray-500 md:hidden">Inversión</p>
                                        </div>

                                        {/* Conversions */}
                                        <div className="col-span-3 text-right hidden md:block">
                                            <p className="font-medium text-gray-900">{campaign.conversions?.toLocaleString() || '-'}</p>
                                            {campaign.conversions > 0 && (
                                                <p className="text-[10px] text-gray-500">
                                                    {formatCurrency(campaign.cost_per_conversion)} / conv.
                                                </p>
                                            )}
                                        </div>

                                        {/* Impressions/Metrics */}
                                        <div className="col-span-2 text-right hidden md:block">
                                            <p className="font-medium text-gray-900">{campaign.impressions?.toLocaleString() || '0'}</p>
                                            <p className="text-[10px] text-gray-500">CTR: {campaign.ctr.toFixed(2)}%</p>
                                        </div>
                                    </div>

                                    {/* Ads List (Accordion Content) */}
                                    {isExpanded && hasAds && (
                                        <div className="bg-gray-50/50 border-t border-gray-100 p-4 pl-4 md:pl-10 space-y-3">
                                            {campaign.ads!.length === 0 && <p className="text-sm text-gray-500 italic">No hay anuncios activos.</p>}
                                            {campaign.ads!.map((ad) => (
                                                <div key={ad.id} className="flex flex-col md:grid md:grid-cols-12 gap-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm items-center">

                                                    {/* Ad Info */}
                                                    <div className="col-span-5 flex items-center gap-3 w-full">
                                                        <div className="w-10 h-10 bg-gray-100 rounded md overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center relative group">
                                                            {ad.thumbnail_url ? (
                                                                <>
                                                                    <img src={ad.thumbnail_url} alt={ad.name} className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                                </>
                                                            ) : (
                                                                <ImageIcon className="w-4 h-4 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{ad.name}</p>
                                                            <span className={cn(
                                                                "text-[10px] px-1.5 py-0.5 rounded capitalize inline-block mt-1",
                                                                ad.status === 'ACTIVE' ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                                                            )}>
                                                                {ad.status === 'ACTIVE' ? 'Activo' : ad.status.toLowerCase()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Spend */}
                                                    <div className="col-span-2 text-right w-full md:w-auto flex justify-between md:block">
                                                        <span className="md:hidden text-xs text-gray-500">Gasto:</span>
                                                        <p className="text-sm font-bold text-gray-900">{formatCurrency(ad.spend)}</p>
                                                    </div>

                                                    {/* Conversions */}
                                                    <div className="col-span-3 text-right w-full md:w-auto flex justify-between md:block">
                                                        <span className="md:hidden text-xs text-gray-500">Conv:</span>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{ad.conversions?.toLocaleString() || '-'}</p>
                                                            {ad.conversions > 0 && <p className="text-[10px] text-gray-500">{formatCurrency(ad.cost_per_conversion)}</p>}
                                                        </div>
                                                    </div>

                                                    {/* Impressions */}
                                                    <div className="col-span-2 text-right hidden md:block">
                                                        <p className="text-xs text-gray-900">{ad.impressions?.toLocaleString()}</p>
                                                        <p className="text-[10px] text-gray-500">Impr.</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {safeData.campaigns.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No hay campañas activas en este período</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <p className="text-xs text-center text-gray-400 mt-4">
                Actualizado: {new Date(safeData.last_updated).toLocaleString()}
            </p>
        </div>
    )
}

function FilterButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                active
                    ? "bg-white text-brand-primary shadow-sm"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
            )}
        >
            {label}
        </button>
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

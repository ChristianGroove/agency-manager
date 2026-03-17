import React, { useState } from "react"
import { NormalizedAdsMetrics } from "@/lib/integrations/meta/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DollarSign, Eye, MousePointer2, TrendingUp, BarChart3, AlertCircle, ChevronDown, ChevronUp, Image as ImageIcon, Calendar } from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface AdsDashboardProps {
    data: any // Keeping it flexible to handle both NormalizedAdsMetrics and DB Row
    datePreset?: string
    onDatePresetChange?: (preset: string) => void
    loading?: boolean
    title?: string
}

export function AdsDashboard({ data, loading, title }: AdsDashboardProps) {
    const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)

    if (!data) return null

    const toggleCampaign = (id: string) => {
        setExpandedCampaignId(expandedCampaignId === id ? null : id)
    }

    // Generic Data Normalization
    const safeData = {
        spend: Number(data.spend || 0),
        impressions: Number(data.impressions || 0),
        clicks: Number(data.clicks || 0),
        roas: Number(data.roas || 0),
        cpc: Number(data.cpc || 0),
        ctr: Number(data.ctr || 0),
        last_updated: data.last_updated || data.updated_at || new Date().toISOString(),
        campaigns: Array.isArray(data.campaigns) ? data.campaigns.map((c: any) => ({
            ...c,
            spend: Number(c.spend || 0),
            impressions: Number(c.impressions || 0),
            clicks: Number(c.clicks || 0),
            ctr: Number(c.ctr || 0),
            conversions: Number(c.conversions || 0),
            cost_per_conversion: Number(c.cost_per_conversion || 0),
            daily_budget: c.daily_budget ? Number(c.daily_budget) : 0,
            lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) : 0,
            ads: (c.ads || []).map((a: any) => ({
                ...a,
                spend: Number(a.spend || 0),
                impressions: Number(a.impressions || 0),
                conversions: Number(a.conversions || 0),
                cost_per_conversion: Number(a.cost_per_conversion || 0)
            }))
        })) : []
    }

    return (
        <div className="space-y-10">
            <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", loading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                <KPICard
                    title="Inversión"
                    value={formatCurrency(safeData.spend)}
                    icon={DollarSign}
                    color="text-blue-600 dark:text-blue-400"
                    bgColor="bg-blue-50 dark:bg-blue-500/10"
                />
                <KPICard
                    title="Resultados (Clics)"
                    value={safeData.clicks.toLocaleString()}
                    icon={MousePointer2}
                    color="text-purple-600 dark:text-purple-400"
                    bgColor="bg-purple-50 dark:bg-purple-500/10"
                />
                <KPICard
                    title="Alcance"
                    value={safeData.impressions.toLocaleString()}
                    icon={Eye}
                    color="text-emerald-600 dark:text-emerald-400"
                    bgColor="bg-emerald-50 dark:bg-emerald-500/10"
                />
                <KPICard
                    title="ROAS"
                    value={`${safeData.roas > 0 ? safeData.roas.toFixed(2) : '--'}x`}
                    icon={TrendingUp}
                    color="text-amber-600 dark:text-amber-400"
                    bgColor="bg-amber-50 dark:bg-amber-500/10"
                />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 gap-8">
                <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-zinc-900 overflow-hidden border border-slate-100 dark:border-white/10">
                    <CardHeader className="p-8 pb-4 border-b border-slate-50 dark:border-white/5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                                </div>
                                Campañas Activas
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50 dark:bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    <tr>
                                        <th className="px-8 py-5">Campaña / Estado</th>
                                        <th className="px-6 py-5 text-right">Presupuesto</th>
                                        <th className="px-6 py-5 text-right">Gasto</th>
                                        <th className="px-6 py-5 text-right">Conv.</th>
                                        <th className="px-8 py-5 text-right">CTR / ROAS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                    {safeData.campaigns.map((campaign: any) => {
                                        const isExpanded = expandedCampaignId === campaign.id
                                        const budget = campaign.daily_budget || campaign.lifetime_budget || 0
                                        const progress = budget > 0 ? Math.min((campaign.spend / budget) * 100, 100) : 0
                                        
                                        return (
                                            <React.Fragment key={campaign.id}>
                                                <tr 
                                                    onClick={() => toggleCampaign(campaign.id)}
                                                    className={cn(
                                                        "group cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-white/[0.02]",
                                                        isExpanded && "bg-slate-50/80 dark:bg-white/[0.03]"
                                                    )}
                                                >
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "w-2 h-2 rounded-full",
                                                                campaign.status === 'ACTIVE' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                                                            )} />
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 transition-colors uppercase text-sm tracking-tight">{campaign.name}</p>
                                                                <p className="text-[10px] text-zinc-500 font-bold mt-1 opacity-70">ID: {campaign.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6 text-right">
                                                        <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{formatCurrency(budget)}</p>
                                                        <p className="text-[10px] text-zinc-400 font-medium">{campaign.daily_budget ? 'Diario' : 'Total'}</p>
                                                    </td>
                                                    <td className="px-6 py-6 text-right">
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            <p className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{formatCurrency(campaign.spend)}</p>
                                                            <Progress value={progress} className="h-1 w-20 bg-slate-100 dark:bg-zinc-800" />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6 text-right">
                                                        <p className="font-black text-slate-900 dark:text-white text-sm">{campaign.conversions || '-'}</p>
                                                        <p className="text-[10px] text-zinc-400 font-medium">LTC: {formatCurrency(campaign.cost_per_conversion)}</p>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <Badge className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-black border-none px-2 mb-1">
                                                                {campaign.ctr.toFixed(2)}% CTR
                                                            </Badge>
                                                            <p className="text-[10px] font-bold text-indigo-500">ROAS: {campaign.roas > 0 ? campaign.roas.toFixed(2) : '--'}x</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && campaign.ads && campaign.ads.length > 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-8 py-0">
                                                            <div className="pb-8 pt-2 pl-12 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                {campaign.ads.map((ad: any) => (
                                                                    <div key={ad.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-12 h-12 rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden bg-slate-50 flex-shrink-0">
                                                                                {ad.thumbnail_url ? (
                                                                                    <img src={ad.thumbnail_url} className="w-full h-full object-cover" />
                                                                                ) : <ImageIcon className="w-full h-full p-3 text-slate-300" />}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs font-black text-slate-800 dark:text-slate-200">{ad.name}</p>
                                                                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 mt-1 border-slate-200 text-slate-500">
                                                                                    {ad.status}
                                                                                </Badge>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-10 pr-4">
                                                                            <div className="text-right">
                                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Gasto</p>
                                                                                <p className="text-sm font-black text-indigo-600">{formatCurrency(ad.spend)}</p>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Conv.</p>
                                                                                <p className="text-sm font-black text-slate-800 dark:text-slate-200">{ad.conversions}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-center pt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-slate-200" />
                    Última Sincronización: {new Date(safeData.last_updated).toLocaleString()}
                    <span className="w-8 h-[1px] bg-slate-200" />
                </p>
            </div>
        </div>
    )
}

function KPICard({ title, value, icon: Icon, color, bgColor }: any) {
    return (
        <Card className="p-5 bg-white dark:bg-zinc-900/50 backdrop-blur-md border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl group-hover:scale-110 transition-transform", bgColor)}>
                    <Icon className={cn("h-6 w-6", color)} />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{title}</p>
                </div>
            </div>
        </Card>
    )
}

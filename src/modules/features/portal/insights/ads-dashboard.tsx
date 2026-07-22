import React, { useState } from "react"
import { NormalizedAdsMetrics } from "@/modules/infrastructure/meta/services/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DollarSign, Eye, MousePointer2, TrendingUp, BarChart3, AlertCircle, ChevronDown, ChevronUp, Image as ImageIcon, Calendar } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts"
import { formatCurrency, cn } from "@/modules/infrastructure/utils/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/modules/core/i18n/use-translation"

interface AdsDashboardProps {
    data: any // Keeping it flexible to handle both NormalizedAdsMetrics and DB Row
    datePreset?: string
    onDatePresetChange?: (preset: string) => void
    loading?: boolean
    title?: string
}

export function AdsDashboard({ data, loading, title }: AdsDashboardProps) {
    const { t } = useTranslation()
    const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
    const [chartMode, setChartMode] = useState<'volume' | 'efficiency' | 'engagement'>('volume')

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
        demographics: data.metadata?.demographics || data.demographics || null,
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
                    title={t("meta_ads_monitor.dashboard.spend")}
                    value={formatCurrency(safeData.spend)}
                    icon={DollarSign}
                    color="text-blue-600 dark:text-blue-400"
                    bgColor="bg-blue-50 dark:bg-blue-500/10"
                />
                <KPICard
                    title={t("meta_ads_monitor.dashboard.clicks")}
                    value={safeData.clicks.toLocaleString()}
                    icon={MousePointer2}
                    color="text-purple-600 dark:text-purple-400"
                    bgColor="bg-purple-50 dark:bg-purple-500/10"
                />
                <KPICard
                    title={t("meta_ads_monitor.dashboard.reach")}
                    value={safeData.impressions.toLocaleString()}
                    icon={Eye}
                    color="text-emerald-600 dark:text-emerald-400"
                    bgColor="bg-emerald-50 dark:bg-emerald-500/10"
                />
                <KPICard
                    title={t("meta_ads_monitor.dashboard.roas")}
                    value={`${safeData.roas > 0 ? safeData.roas.toFixed(2) : '--'}x`}
                    icon={TrendingUp}
                    color="text-amber-600 dark:text-amber-400"
                    bgColor="bg-amber-50 dark:bg-amber-500/10"
                />
            </div>

            {/* Chart Section */}
            {safeData.campaigns.length > 0 && (
                <div className="grid grid-cols-1 gap-8">
                    <Card className="rounded-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] bg-white/70 dark:bg-zinc-900/40 backdrop-blur-xl p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                </div>
                                {t("meta_ads_monitor.dashboard.chart_title") || "Rendimiento General"}
                            </h3>
                            <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                                <button onClick={() => setChartMode('volume')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", chartMode === 'volume' ? "bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Volumen</button>
                                <button onClick={() => setChartMode('efficiency')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", chartMode === 'efficiency' ? "bg-white dark:bg-zinc-700 shadow-sm text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Eficiencia</button>
                                <button onClick={() => setChartMode('engagement')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", chartMode === 'engagement' ? "bg-white dark:bg-zinc-700 shadow-sm text-amber-600 dark:text-amber-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Interacción</button>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={safeData.campaigns.map((c: any) => ({
                                    name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name,
                                    spend: c.spend,
                                    conversions: c.conversions,
                                    cpc: c.cpc,
                                    cost_per_conversion: c.cost_per_conversion,
                                    ctr: c.ctr,
                                    roas: c.roas || 0
                                }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }} dy={10} />
                                    
                                    {chartMode === 'volume' && (
                                        <>
                                            <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }} />
                                            <Tooltip cursor={{ fill: 'rgba(150,150,150,0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '12px' }} formatter={(value: any, name: any) => [name === 'spend' ? formatCurrency(value) : value, name === 'spend' ? 'Gasto' : 'Conversiones']} />
                                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
                                            <Bar yAxisId="left" dataKey="spend" name="spend" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                            <Bar yAxisId="right" dataKey="conversions" name="conversions" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                        </>
                                    )}

                                    {chartMode === 'efficiency' && (
                                        <>
                                            <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }} tickFormatter={(val) => `$${val}`} />
                                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }} tickFormatter={(val) => `$${val}`} />
                                            <Tooltip cursor={{ fill: 'rgba(150,150,150,0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '12px' }} formatter={(value: any, name: any) => [formatCurrency(value), name === 'cpc' ? 'CPC' : 'Costo x Conv.']} />
                                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
                                            <Bar yAxisId="left" dataKey="cpc" name="cpc" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                            <Bar yAxisId="right" dataKey="cost_per_conversion" name="cost_per_conversion" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                        </>
                                    )}

                                    {chartMode === 'engagement' && (
                                        <>
                                            <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }} tickFormatter={(val) => `${val}%`} />
                                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888', fontWeight: 600 }} tickFormatter={(val) => `${val}x`} />
                                            <Tooltip cursor={{ fill: 'rgba(150,150,150,0.05)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '12px' }} formatter={(value: any, name: any) => [name === 'ctr' ? `${value}%` : `${value}x`, name === 'ctr' ? 'CTR' : 'ROAS']} />
                                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
                                            <Bar yAxisId="left" dataKey="ctr" name="ctr" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                            <Bar yAxisId="right" dataKey="roas" name="roas" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                        </>
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}

            {/* Main Content Area */}
            <div className="grid grid-cols-1 gap-8">
                <Card className="rounded-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] bg-white/70 dark:bg-zinc-900/40 backdrop-blur-xl overflow-hidden">
                    <CardHeader className="p-8 pb-6 border-b border-slate-100/50 dark:border-white/5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                                </div>
                                {t("meta_ads_monitor.dashboard.active_campaigns")}
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50 dark:bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    <tr>
                                        <th className="px-8 py-5">{t("meta_ads_monitor.dashboard.col_campaign")}</th>
                                        <th className="px-6 py-5 text-right">{t("meta_ads_monitor.dashboard.col_budget")}</th>
                                        <th className="px-6 py-5 text-right">{t("meta_ads_monitor.dashboard.col_spend")}</th>
                                        <th className="px-6 py-5 text-right">{t("meta_ads_monitor.dashboard.col_conv")}</th>
                                        <th className="px-8 py-5 text-right">{t("meta_ads_monitor.dashboard.col_ctr_roas")}</th>
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
                                                        <p className="text-[10px] text-zinc-400 font-medium">{campaign.daily_budget ? t("meta_ads_monitor.dashboard.daily") : t("meta_ads_monitor.dashboard.total")}</p>
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
                                                                    <div key={ad.id} className="flex items-center justify-between p-4 bg-white/40 dark:bg-zinc-800/40 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-white/5 shadow-sm">
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
                                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-0.5">{t("meta_ads_monitor.dashboard.col_spend")}</p>
                                                                                <p className="text-sm font-black text-indigo-600">{formatCurrency(ad.spend)}</p>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-0.5">{t("meta_ads_monitor.dashboard.col_conv")}</p>
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
                    {t("meta_ads_monitor.dashboard.last_sync")}: {new Date(safeData.last_updated).toLocaleString()}
                    <span className="w-8 h-[1px] bg-slate-200" />
                </p>
            </div>

            {/* Demographics Section */}
            {safeData.demographics && safeData.demographics.ageGender && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="rounded-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none bg-white/70 dark:bg-zinc-900/40 backdrop-blur-xl p-8">
                        <h3 className="text-lg font-bold mb-6">Edad y Género (Top 5)</h3>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={safeData.demographics.ageGender.slice(0,5)}
                                        dataKey="spend"
                                        nameKey="age"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        label={(props: any) => `${props.age} (${props.gender.substring(0,1).toUpperCase()})`}
                                    >
                                        {safeData.demographics.ageGender.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][index % 5]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val: any) => formatCurrency(val)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="rounded-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none bg-white/70 dark:bg-zinc-900/40 backdrop-blur-xl p-8">
                        <h3 className="text-lg font-bold mb-6">Top Regiones por Conversión</h3>
                        <div className="h-[250px] overflow-y-auto pr-2 space-y-4">
                            {safeData.demographics.region.map((r: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                    <span className="text-sm font-bold">{r.region}</span>
                                    <div className="flex gap-4 text-xs font-medium text-slate-500">
                                        <span>Gasto: {formatCurrency(r.spend)}</span>
                                        <span className="text-emerald-600 dark:text-emerald-400">{r.conversions} Conv.</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}

function KPICard({ title, value, icon: Icon, color, bgColor }: any) {
    return (
        <Card className="glass-card p-5 group hover:-translate-y-1 transition-all rounded-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none bg-white/70 dark:bg-zinc-900/40 backdrop-blur-xl">
            <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl group-hover:scale-110 transition-transform shadow-sm", bgColor)}>
                    <Icon className={cn("h-6 w-6", color)} />
                </div>
                <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">{title}</p>
                </div>
            </div>
        </Card>
    )
}

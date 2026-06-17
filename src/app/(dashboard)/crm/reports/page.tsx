'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Users, DollarSign, TrendingUp, MessageSquare, Target, Award,
    BarChart3, PieChart, Activity, RefreshCw, Clock, Calendar as CalendarIcon,
    AlertTriangle, ArrowUpRight, ArrowDownRight, UserCheck, ShieldCheck, Sparkles
} from 'lucide-react'
import { cn } from '@/modules/infrastructure/utils/utils'
import { getAdvancedReports, type AdvancedReportData, getBase64Image } from '@/modules/features/crm/services/logic/analytics-actions'
import { getEffectiveBranding } from '@/modules/core/branding/actions'
import { generateCRMReportPDF } from '@/modules/features/crm/services/crm-report-generator'
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart as RePieChart, Pie, Cell
} from 'recharts'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useCurrentOrganization } from "@/modules/core/organizations/hooks/use-current-organization"
import { FileText, Download } from 'lucide-react'
import type { BrandingConfig } from '@/types/branding'

export default function ReportsPage() {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [dateRange, setDateRange] = useState<{ from: Date, to: Date }>({
        from: startOfDay(new Date()),
        to: endOfDay(new Date())
    })
    const { organizationId, loading: orgLoading } = useCurrentOrganization()
    const [reportData, setReportData] = useState<AdvancedReportData | null>(null)
    const [branding, setBranding] = useState<BrandingConfig | null>(null)
    const [logoBase64Cache, setLogoBase64Cache] = useState<string | null>(null)

    useEffect(() => {
        if (!orgLoading && organizationId) {
            loadData()
            loadBranding()
        }
    }, [dateRange, organizationId, orgLoading])

    async function loadData() {
        if (!organizationId) return
        setLoading(true)
        const res = await getAdvancedReports(
            dateRange.from.toISOString(),
            dateRange.to.toISOString(),
            organizationId
        )
        if (res.success && res.data) {
            setReportData(res.data)
        }
        setLoading(false)
    }

    async function loadBranding() {
        if (!organizationId) return
        const b = await getEffectiveBranding(organizationId)
        setBranding(b)
    }

    const handleExportPdf = async () => {
        if (!reportData || !branding) return
        setExporting(true)
        try {
            const blob = await generateCRMReportPDF({
                reportData,
                branding,
                dateRange
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Reporte_CRM_${format(new Date(), 'yyyy-MM-dd')}.pdf`
            a.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Export error:", error)
        } finally {
            setExporting(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
    }

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        if (h > 0) return `${h}h ${m}m`
        return `${m}m`
    }

    const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4']

    return (
        <div className="h-full space-y-6 overflow-auto pb-8">
            {/* Header / Control Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-4 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Activity className="w-6 h-6 text-brand-pink" />
                        Command Center <span className="text-sm font-normal text-gray-400">Analytics</span>
                    </h1>
                    <p className="text-xs text-muted-foreground">Monitoreo granular de efectividad y eficiencia operativa</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Header Controls */}
                    <div className="flex items-center gap-2 mr-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExportPdf}
                            disabled={loading || exporting || !reportData}
                            className="hidden md:flex gap-2 bg-zinc-900 border-white/5 text-white hover:bg-zinc-800"
                        >
                            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Exportar PDF
                        </Button>
                    </div>
                    {/* Diagnostic Tool */}
                    <div className="hidden md:flex flex-col items-end gap-0.5 mr-2">
                        <div className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono text-gray-500">
                            ORG: {organizationId?.slice(0, 8) || '...'}
                        </div>
                        {reportData && (
                            <div className="px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/20 text-[10px] font-mono text-blue-600">
                                L:{reportData?.summary?.total_leads ?? 0} | A:{reportData?.agent_performance?.length ?? 0}
                            </div>
                        )}
                    </div>

                    <Select defaultValue="today" onValueChange={(val) => {
                        const now = new Date()
                        if (val === 'today') setDateRange({ from: startOfDay(now), to: endOfDay(now) })
                        if (val === '7d') setDateRange({ from: subDays(now, 7), to: now })
                        if (val === '15d') setDateRange({ from: subDays(now, 15), to: now })
                        if (val === '30d') setDateRange({ from: subDays(now, 30), to: now })
                    }}>
                        <SelectTrigger className="w-[160px] bg-white dark:bg-zinc-900 border-white/10">
                            <SelectValue placeholder="Rápido: Hoy" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Hoy</SelectItem>
                            <SelectItem value="7d">Últimos 7 días</SelectItem>
                            <SelectItem value="15d">Últimos 15 días</SelectItem>
                            <SelectItem value="30d">Últimos 30 días</SelectItem>
                        </SelectContent>
                    </Select>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="gap-2 bg-white dark:bg-zinc-900 border-white/10">
                                <CalendarIcon className="w-4 h-4" />
                                {format(dateRange.from, 'dd MMM', { locale: es })} - {format(dateRange.to, 'dd MMM', { locale: es })}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                selected={{ from: dateRange.from, to: dateRange.to }}
                                onSelect={(range: any) => range?.from && range?.to && setDateRange({ from: range.from, to: range.to })}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>

                    <Button variant="outline" size="icon" onClick={loadData} disabled={loading} className="border-white/10">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 px-1">
                <Card className="p-5 border-none bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-transparent relative overflow-hidden group">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Total Leads</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black">{loading ? '...' : (reportData?.summary?.total_leads ?? 0)}</h3>
                    </div>
                    <Users className="absolute right-4 bottom-4 w-6 h-6 text-blue-500/20" />
                </Card>

                <Card className="p-5 border-none bg-gradient-to-br from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-transparent relative overflow-hidden group">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">Conversión</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black">{loading ? '...' : `${reportData?.summary?.conversion_rate ?? 0}%`}</h3>
                    </div>
                    <Target className="absolute right-4 bottom-4 w-6 h-6 text-purple-500/20" />
                </Card>

                <Card className="p-5 border-none bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-transparent relative overflow-hidden group">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Valor Pipeline</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black">{loading ? '...' : formatCurrency(reportData?.summary?.pipeline_value || 0)}</h3>
                    </div>
                    <DollarSign className="absolute right-4 bottom-4 w-6 h-6 text-emerald-500/20" />
                </Card>

                <Card className="p-5 border-none bg-gradient-to-br from-orange-500/10 to-orange-600/5 dark:from-orange-500/20 dark:to-transparent relative overflow-hidden group">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1">Tiempo Respuesta</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black">{loading ? '...' : `${Math.round((reportData?.summary?.avg_response_time || 0) / 60)}m`}</h3>
                        <Badge variant="outline" className="mb-1 text-[10px] border-orange-500/20 text-orange-600">SLA {'< 5m'}</Badge>
                    </div>
                    <Clock className="absolute right-4 bottom-4 w-6 h-6 text-orange-500/20" />
                </Card>

                <Card className="p-5 border-none bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-transparent relative overflow-hidden group border-l-4 border-red-500">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">Abandono {'>24h'}</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black text-red-600">{loading ? '...' : (reportData?.summary?.abandoned_leads ?? 0)}</h3>
                    </div>
                    <AlertTriangle className="absolute right-4 bottom-4 w-6 h-6 text-red-500/20" />
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 lg:col-span-2 bg-white dark:bg-zinc-900/50 border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-bold text-lg">Tendencia de Actividad</h3>
                            <p className="text-sm text-muted-foreground">Flujo de leads y mensajes en el tiempo</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={reportData?.activity_trend || []}>
                                <defs>
                                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#888' }}
                                    tickFormatter={(val) => format(new Date(val), 'dd MMM')}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="new_leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                                <Area type="monotone" dataKey="messages_sent" stroke="#ec4899" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-6 bg-white dark:bg-zinc-900/50 border-white/5">
                    <h3 className="font-bold text-lg mb-6">Fuentes de Leads</h3>
                    <div className="h-[250px] w-full relative text-center flex flex-col items-center justify-center">
                        {(!reportData || !reportData.lead_sources || reportData.lead_sources.length === 0) ? (
                            <div className="text-sm text-muted-foreground italic">No hay datos de fuentes</div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={reportData.lead_sources}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="count"
                                            nameKey="source"
                                        >
                                            {reportData.lead_sources.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                    </RePieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-black">{reportData.summary?.total_leads ?? 0}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Inbound Total</span>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Team Performance Table */}
            <Card className="bg-white dark:bg-zinc-900/50 border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                        Rendimiento del Equipo de Agentes
                    </h3>
                    <p className="text-sm text-muted-foreground">Efectividad quirúrgica y tiempos de labor</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-50 dark:bg-white/5 font-bold text-muted-foreground">
                            <tr>
                                <th className="px-6 py-4">Agente</th>
                                <th className="px-6 py-4 text-center">Leads Asignados</th>
                                <th className="px-6 py-4 text-center">Deals Won</th>
                                <th className="px-6 py-4 text-center">Conversión</th>
                                <th className="px-6 py-4 text-center">Respuesta (Avg)</th>
                                <th className="px-6 py-4 text-center">Tiempo Conectado</th>
                                <th className="px-6 py-4 text-center">SLA (&lt; 5s)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {reportData?.agent_performance?.map((agent) => (
                                <tr key={agent.agent_id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-[10px]">
                                                {agent.agent_name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-bold">{agent.agent_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">{agent.leads_assigned}</td>
                                    <td className="px-6 py-4 text-center text-green-600 font-bold">{agent.deals_won}</td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant="outline">
                                            {agent.leads_assigned > 0 ? Math.round((agent.deals_won / agent.leads_assigned) * 100) : 0}%
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {Math.round((agent.avg_response_time || 0) / 60)}m
                                    </td>
                                    <td className="px-6 py-4 text-center tracking-tighter">
                                        {formatDuration(agent.connection_time_seconds || 0)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge 
                                            className={cn(
                                                "font-bold",
                                                agent.sla_met_percentage >= 90 ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                                agent.sla_met_percentage >= 70 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                                "bg-red-500/10 text-red-500 border-red-500/20"
                                            )}
                                            variant="outline"
                                        >
                                            {agent.sla_met_percentage}%
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                            {(!loading && (!reportData || !reportData.agent_performance || reportData.agent_performance.length === 0)) && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                                        No se encontraron datos de rendimiento para el periodo seleccionado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Abandoned Leads Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-zinc-900/50 border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Leads en Abandono (&gt;24h)
                            </h3>
                            <p className="text-sm text-muted-foreground">Conversiones en riesgo por falta de respuesta</p>
                        </div>
                        {reportData?.summary && (
                            <Badge variant="destructive" className="animate-pulse">
                                {reportData.summary.abandoned_leads} CRÍTICOS
                            </Badge>
                        )}
                    </div>
                    <div className="divide-y divide-white/5 max-h-[350px] overflow-y-auto">
                        {reportData?.abandoned_leads_list?.map((lead) => (
                            <div key={lead.id} className="p-4 hover:bg-red-500/5 transition-colors flex items-center justify-between group">
                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900 dark:text-gray-100">{lead.name}</p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Espera: {formatDuration(lead.waiting_seconds)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            Asignado a: {lead.assigned_agent}
                                        </span>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                    Atender <ArrowUpRight className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                        {(!loading && (!reportData || !reportData.abandoned_leads_list || reportData.abandoned_leads_list.length === 0)) && (
                            <div className="p-8 text-center text-muted-foreground italic">
                                ¡Excelente! No hay leads abandonados en este momento.
                            </div>
                        )}
                    </div>
                </Card>

                {/* Optional: Growth Insights or something else */}
                <Card className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20 relative overflow-hidden flex flex-col justify-center">
                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Insights de Optimización</h3>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                            {(() => {
                                if (loading || !reportData) return "Analizando patrones de rendimiento...";
                                const { abandoned_leads, avg_response_time, conversion_rate } = reportData.summary;
                                if (abandoned_leads > 0) {
                                    return `Atención Prioritaria: Hay ${abandoned_leads} leads en riesgo de abandono. Reducir la cola de espera de forma proactiva previene fugas de prospectos valiosos.`;
                                } else if (avg_response_time > 300) {
                                    return `Oportunidad: El tiempo promedio de respuesta actual es de ${Math.round(avg_response_time / 60)}m. Reducirlo a menos de 5m aumentaría exponencialmente la retención.`;
                                } else if (conversion_rate < 15) {
                                    return `Área de Mejora: La tasa de conversión del ${conversion_rate}% está por debajo del estándar. Considere automatizar y optimizar la calificación inicial de leads.`;
                                } else {
                                    return `¡Excelente trabajo! Sus tiempos de respuesta son ágiles y no hay leads críticos abandonados. Mantenga esta consistencia operativa.`;
                                }
                            })()}
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-sm font-medium">
                                <div className={cn("w-1.5 h-1.5 rounded-full", reportData?.summary?.abandoned_leads && reportData.summary.abandoned_leads > 0 ? "bg-red-500" : "bg-indigo-500")} />
                                {reportData?.summary?.abandoned_leads && reportData.summary.abandoned_leads > 0 
                                    ? "Asignar urgencia a leads rezagados"
                                    : "Reforzar calificación de prospectos"}
                            </li>
                            <li className="flex items-center gap-3 text-sm font-medium">
                                <div className={cn("w-1.5 h-1.5 rounded-full", (reportData?.summary?.avg_response_time || 0) > 300 ? "bg-orange-500" : "bg-indigo-500")} />
                                {(reportData?.summary?.avg_response_time || 0) > 300 
                                    ? "Optimizar distribución y carga de agentes"
                                    : "Automatizar respuestas iniciales"}
                            </li>
                        </ul>
                    </div>
                </Card>
            </div>
        </div>
    )
}

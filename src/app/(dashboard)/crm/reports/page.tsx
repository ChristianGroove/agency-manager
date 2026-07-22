'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Users, DollarSign, TrendingUp, MessageSquare, Target, Award,
    BarChart3, PieChart, Activity, RefreshCw, Clock, Calendar as CalendarIcon,
    AlertTriangle, ArrowUpRight, ArrowDownRight, UserCheck, ShieldCheck, Sparkles, FileText, Download
} from 'lucide-react'
import { cn } from '@/modules/infrastructure/utils/utils'
import { getAdvancedReports, type AdvancedReportData, getBase64Image } from '@/modules/features/crm/services/logic/analytics-actions'
import { getEffectiveBranding } from '@/modules/core/branding/actions'
import { toJpeg } from "html-to-image"
import { jsPDF } from "jspdf"
import { CrmPdfTemplate } from "@/modules/features/crm/components/crm-pdf-template"
import { AgentPdfTemplate } from "@/modules/features/crm/components/agent-pdf-template"
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
import type { BrandingConfig } from '@/types/branding'
import { SectionHeader } from '@/components/layout/section-header'

export default function ReportsPage() {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [exportingAgent, setExportingAgent] = useState<string | null>(null)
    const [selectedPreset, setSelectedPreset] = useState('30d')
    const [dateRange, setDateRange] = useState<{ from: Date, to: Date }>({
        from: startOfDay(subDays(new Date(), 30)),
        to: endOfDay(new Date())
    })
    const [tempDateRange, setTempDateRange] = useState<{ from?: Date, to?: Date }>({
        from: startOfDay(subDays(new Date(), 30)),
        to: endOfDay(new Date())
    })
    const [calendarOpen, setCalendarOpen] = useState(false)
    const { organizationId, loading: orgLoading } = useCurrentOrganization()
    const [reportData, setReportData] = useState<AdvancedReportData | null>(null)
    const [branding, setBranding] = useState<BrandingConfig | null>(null)
    const [logoBase64Cache, setLogoBase64Cache] = useState<string | null>(null)

    const pdfTemplateRef = useRef<HTMLDivElement>(null)
    const agentPdfTemplateRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!orgLoading && organizationId) {
            loadData()
            loadBranding()
        }
    }, [dateRange, organizationId, orgLoading])

    async function loadData() {
        if (!organizationId) return
        setLoading(true)
        try {
            const res = await getAdvancedReports(
                dateRange.from.toISOString(),
                dateRange.to.toISOString(),
                organizationId
            )
            if (res.success && res.data) {
                setReportData(res.data)
            }
        } catch (error) {
            console.error("Error loading reports data:", error)
        } finally {
            setLoading(false)
        }
    }

    async function loadBranding() {
        if (!organizationId) return
        const b = await getEffectiveBranding(organizationId)
        setBranding(b)
    }

    const handleExportPdf = async () => {
        if (!reportData || !branding || !pdfTemplateRef.current) return
        setExporting(true)
        try {
            await new Promise((resolve) => setTimeout(resolve, 800)) // Wait for charts
            
            const imgData = await toJpeg(pdfTemplateRef.current, {
                quality: 0.95,
                pixelRatio: 3,
                backgroundColor: '#ffffff'
            })
            
            const nodeWidth = pdfTemplateRef.current.offsetWidth || 1200
            const nodeHeight = pdfTemplateRef.current.offsetHeight || 1697
            const pdfWidth = 1200
            const pdfHeight = (nodeHeight * pdfWidth) / nodeWidth

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "px",
                format: [pdfWidth, pdfHeight]
            })

            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)
            pdf.save(`Reporte_CRM_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
        } catch (error) {
            console.error("Export error:", error)
        } finally {
            setExporting(false)
        }
    }

    const handleExportAgentPdf = async (agentId: string, agentName: string) => {
        if (!reportData || !branding) return
        setExportingAgent(agentId)
        
        setTimeout(async () => {
            try {
                if (!agentPdfTemplateRef.current) return
                await new Promise((resolve) => setTimeout(resolve, 800)) // Wait for charts

                const imgData = await toJpeg(agentPdfTemplateRef.current, {
                    quality: 0.95,
                    pixelRatio: 3,
                    backgroundColor: '#ffffff'
                })
                
                const nodeWidth = agentPdfTemplateRef.current.offsetWidth || 1200
                const nodeHeight = agentPdfTemplateRef.current.offsetHeight || 1697
                const pdfWidth = 1200
                const pdfHeight = (nodeHeight * pdfWidth) / nodeWidth

                const pdf = new jsPDF({
                    orientation: "portrait",
                    unit: "px",
                    format: [pdfWidth, pdfHeight]
                })

                pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)
                pdf.save(`Reporte_Agente_${agentName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
            } catch (error) {
                console.error("Agent export error:", error)
            } finally {
                setExportingAgent(null)
            }
        }, 300)
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
        <>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-modern px-6 pt-6 pb-6 -mx-6 -mt-6">
            <SectionHeader
                title={t("crm_reports.command_center") || "Command Center"}
                subtitle={t("crm_reports.command_center_subtitle") || "Monitoreo granular de efectividad y eficiencia operativa"}
                icon={Activity}
                action={
                    <div className="flex flex-wrap items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExportPdf}
                            disabled={loading || exporting || !reportData}
                            className="hidden md:flex gap-2 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 rounded-xl"
                        >
                            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {t("crm_reports.export_pdf") || "Exportar PDF"}
                        </Button>

                        <Select value={selectedPreset} onValueChange={(val) => {
                            const now = new Date()
                            setSelectedPreset(val)
                            if (val === 'today') setDateRange({ from: startOfDay(now), to: endOfDay(now) })
                            if (val === '7d') setDateRange({ from: startOfDay(subDays(now, 7)), to: endOfDay(now) })
                            if (val === '15d') setDateRange({ from: startOfDay(subDays(now, 15)), to: endOfDay(now) })
                            if (val === '30d') setDateRange({ from: startOfDay(subDays(now, 30)), to: endOfDay(now) })
                            if (val === '60d') setDateRange({ from: startOfDay(subDays(now, 60)), to: endOfDay(now) })
                            if (val === '90d') setDateRange({ from: startOfDay(subDays(now, 90)), to: endOfDay(now) })
                        }}>
                            <SelectTrigger className="w-[160px] bg-white dark:bg-transparent border-slate-200 dark:border-white/10 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">{t("crm_reports.today") || "Hoy"}</SelectItem>
                                <SelectItem value="7d">{t("crm_reports.last_7_days") || "Últimos 7 días"}</SelectItem>
                                <SelectItem value="15d">{t("crm_reports.last_15_days") || "Últimos 15 días"}</SelectItem>
                                <SelectItem value="30d">{t("crm_reports.last_30_days") || "Últimos 30 días"}</SelectItem>
                                <SelectItem value="60d">{t("crm_reports.last_60_days") || "Últimos 60 días"}</SelectItem>
                                <SelectItem value="90d">{t("crm_reports.last_90_days") || "Últimos 90 días"}</SelectItem>
                                <SelectItem value="custom" className="hidden">{t("crm_reports.custom") || "Personalizado"}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="gap-2 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 rounded-xl">
                                    <CalendarIcon className="w-4 h-4" />
                                    {format(dateRange.from, 'dd MMM', { locale: es })} - {format(dateRange.to, 'dd MMM', { locale: es })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl bg-white/80 dark:bg-black/60 backdrop-blur-xl overflow-hidden" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    selected={{ from: tempDateRange.from, to: tempDateRange.to }}
                                    onSelect={(range: any) => setTempDateRange({ from: range?.from, to: range?.to })}
                                    numberOfMonths={2}
                                />
                                <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 flex justify-end gap-2 rounded-b-2xl">
                                    <Button variant="ghost" onClick={() => {
                                        setTempDateRange({ from: dateRange.from, to: dateRange.to })
                                        setCalendarOpen(false)
                                    }} className="rounded-xl">{t("crm_reports.cancel") || "Cancelar"}</Button>
                                    <Button onClick={() => {
                                        if (tempDateRange.from && tempDateRange.to) {
                                            setDateRange({ 
                                                from: startOfDay(tempDateRange.from), 
                                                to: endOfDay(tempDateRange.to) 
                                            })
                                            setSelectedPreset('custom')
                                            setCalendarOpen(false)
                                        }
                                    }} disabled={!tempDateRange.from || !tempDateRange.to} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                                        {t("crm_reports.apply_range") || "Aplicar Rango"}
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button variant="outline" size="icon" onClick={loadData} disabled={loading} className="bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 rounded-xl">
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                }
            />

            <div className="space-y-6 pt-6">

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 px-1">
                <Card className="p-5 glass-card bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-transparent relative overflow-hidden group">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">{t("crm_reports.new_leads") || "Leads Nuevos"}</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black">{loading ? '...' : (reportData?.summary?.total_leads ?? 0)}</h3>
                    </div>
                    <Users className="absolute right-4 bottom-4 w-6 h-6 text-blue-500/20" />
                </Card>

                <Card className="p-5 glass-card bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/20 dark:to-transparent relative overflow-hidden group">
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">{t("crm_reports.active_leads") || "Leads Activos"}</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black">{loading ? '...' : (reportData?.summary?.active_leads ?? 0)}</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{t("crm_reports.active_leads_desc") || "Con conversaciones en el período"}</p>
                    <MessageSquare className="absolute right-4 bottom-4 w-6 h-6 text-cyan-500/20" />
                </Card>

                <Card className="p-5 glass-card bg-gradient-to-br from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-transparent relative overflow-hidden group">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">{t("crm_reports.conversion") || "Conversión"}</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black">{loading ? '...' : `${reportData?.summary?.conversion_rate ?? 0}%`}</h3>
                    </div>
                    <Target className="absolute right-4 bottom-4 w-6 h-6 text-purple-500/20" />
                </Card>

                <Card className="p-5 glass-card bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-transparent relative overflow-hidden group">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">{t("crm_reports.pipeline_value") || "Valor Pipeline"}</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black">{loading ? '...' : formatCurrency(reportData?.summary?.pipeline_value || 0)}</h3>
                    </div>
                    <DollarSign className="absolute right-4 bottom-4 w-6 h-6 text-emerald-500/20" />
                </Card>

                <Card className="p-5 glass-card bg-gradient-to-br from-orange-500/10 to-orange-600/5 dark:from-orange-500/20 dark:to-transparent relative overflow-hidden group">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1">{t("crm_reports.response_time") || "Tiempo Respuesta"}</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black">{loading ? '...' : `${Math.round((reportData?.summary?.avg_response_time || 0) / 60)}m`}</h3>
                        <Badge variant="outline" className="mb-1 text-[10px] border-orange-500/20 text-orange-600">{t("crm_reports.sla_under_5m") || "SLA < 5m"}</Badge>
                    </div>
                    <Clock className="absolute right-4 bottom-4 w-6 h-6 text-orange-500/20" />
                </Card>

                <Card className="p-5 glass-card bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-transparent relative overflow-hidden group border-l-4 border-red-500">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">{t("crm_reports.abandonment_24h") || "Abandono >24h"}</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-3xl font-black text-red-600">{loading ? '...' : (reportData?.summary?.abandoned_leads ?? 0)}</h3>
                    </div>
                    <AlertTriangle className="absolute right-4 bottom-4 w-6 h-6 text-red-500/20" />
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 lg:col-span-2 glass-card">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="font-bold text-lg">{t("crm_reports.activity_trend") || "Tendencia de Actividad"}</h3>
                            <p className="text-sm text-muted-foreground">{t("crm_reports.activity_trend_desc") || "Flujo de leads y mensajes en el tiempo"}</p>
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

                <Card className="p-6 glass-card">
                    <h3 className="font-bold text-lg mb-6">{t("crm_reports.lead_sources") || "Fuentes de Leads"}</h3>
                    <div className="h-[250px] w-full relative text-center flex flex-col items-center justify-center">
                        {(!reportData || !reportData.lead_sources || reportData.lead_sources.length === 0) ? (
                            <div className="text-sm text-muted-foreground italic">{t("crm_reports.no_source_data") || "No hay datos de fuentes"}</div>
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
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">{t("crm_reports.inbound_total") || "Inbound Total"}</span>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Team Performance Table */}
            <Card className="glass-card overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                        {t("crm_reports.team_performance") || "Rendimiento del Equipo de Agentes"}
                    </h3>
                    <p className="text-sm text-muted-foreground">{t("crm_reports.team_performance_desc") || "Efectividad quirúrgica y tiempos de labor"}</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-50 dark:bg-white/5 font-bold text-muted-foreground">
                            <tr>
                                <th className="px-6 py-4">{t("crm_reports.agent") || "Agente"}</th>
                                <th className="px-6 py-4 text-center">{t("crm_reports.assigned_leads") || "Leads Asignados"}</th>
                                <th className="px-6 py-4 text-center">{t("crm_reports.deals_won") || "Deals Won"}</th>
                                <th className="px-6 py-4 text-center">{t("crm_reports.conversion") || "Conversión"}</th>
                                <th className="px-6 py-4 text-center">{t("crm_reports.response_avg") || "Respuesta (Avg)"}</th>
                                <th className="px-6 py-4 text-center">{t("crm_reports.connected_time") || "Tiempo Conectado"}</th>
                                <th className="px-6 py-4 text-center">{t("crm_reports.sla_under_5s") || "SLA (< 5s)"}</th>
                                <th className="px-6 py-4 text-center">{t("crm_reports.actions") || "Acciones"}</th>
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
                                    <td className="px-6 py-4 text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleExportAgentPdf(agent.agent_id, agent.agent_name)}
                                            disabled={exportingAgent === agent.agent_id}
                                            className="text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
                                            title={t("crm_reports.download_individual_report") || "Descargar Informe Individual"}
                                        >
                                            {exportingAgent === agent.agent_id ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <FileText className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {(!loading && (!reportData || !reportData.agent_performance || reportData.agent_performance.length === 0)) && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                                        {t("crm_reports.no_performance_data") || "No se encontraron datos de rendimiento para el periodo seleccionado."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Abandoned Leads Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                {t("crm_reports.abandoned_leads") || "Leads en Abandono (>24h)"}
                            </h3>
                            <p className="text-sm text-muted-foreground">{t("crm_reports.abandoned_leads_desc") || "Conversiones en riesgo por falta de respuesta"}</p>
                        </div>
                        {reportData?.summary && (
                            <Badge variant="destructive" className="animate-pulse">
                                {reportData.summary.abandoned_leads} {t("crm_reports.critical") || "CRÍTICOS"}
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
                                            {t("crm_reports.wait") || "Espera:"} {formatDuration(lead.waiting_seconds)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {t("crm_reports.assigned_to") || "Asignado a:"} {lead.assigned_agent}
                                        </span>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                    {t("crm_reports.attend") || "Atender"} <ArrowUpRight className="w-3 h-3" />
                                </Button>
                            </div>
                        ))}
                        {(!loading && (!reportData || !reportData.abandoned_leads_list || reportData.abandoned_leads_list.length === 0)) && (
                            <div className="p-8 text-center text-muted-foreground italic">
                                {t("crm_reports.no_abandoned_leads") || "¡Excelente! No hay leads abandonados en este momento."}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Optional: Growth Insights or something else */}
                <Card className="glass-card p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 relative overflow-hidden flex flex-col justify-center">
                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{t("crm_reports.optimization_insights") || "Insights de Optimización"}</h3>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                            {(() => {
                                if (loading || !reportData) return t("crm_reports.analyzing_patterns") || "Analizando patrones de rendimiento...";
                                const { abandoned_leads, avg_response_time, conversion_rate } = reportData.summary;
                                if (abandoned_leads > 0) {
                                    return (t("crm_reports.priority_attention") || "Atención Prioritaria: Hay {count} leads en riesgo de abandono...").replace('{count}', abandoned_leads.toString());
                                } else if (avg_response_time > 300) {
                                    return (t("crm_reports.opportunity_response") || "Oportunidad: El tiempo promedio de respuesta actual es de {time}m...").replace('{time}', Math.round(avg_response_time / 60).toString());
                                } else if (conversion_rate < 15) {
                                    return (t("crm_reports.improvement_area") || "Área de Mejora: La tasa de conversión del {rate}% está por debajo del estándar...").replace('{rate}', conversion_rate.toString());
                                } else {
                                    return t("crm_reports.excellent_work") || "¡Excelente trabajo! Sus tiempos de respuesta son ágiles y no hay leads críticos abandonados. Mantenga esta consistencia operativa.";
                                }
                            })()}
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-sm font-medium">
                                <div className={cn("w-1.5 h-1.5 rounded-full", reportData?.summary?.abandoned_leads && reportData.summary.abandoned_leads > 0 ? "bg-red-500" : "bg-indigo-500")} />
                                {reportData?.summary?.abandoned_leads && reportData.summary.abandoned_leads > 0 
                                    ? t("crm_reports.assign_urgency") || "Asignar urgencia a leads rezagados"
                                    : t("crm_reports.reinforce_qualification") || "Reforzar calificación de prospectos"}
                            </li>
                            <li className="flex items-center gap-3 text-sm font-medium">
                                <div className={cn("w-1.5 h-1.5 rounded-full", (reportData?.summary?.avg_response_time || 0) > 300 ? "bg-orange-500" : "bg-indigo-500")} />
                                {(reportData?.summary?.avg_response_time || 0) > 300 
                                    ? t("crm_reports.optimize_distribution") || "Optimizar distribución y carga de agentes"
                                    : t("crm_reports.automate_responses") || "Automatizar respuestas iniciales"}
                            </li>
                        </ul>
                    </div>
                </Card>
            </div>
        </div>
        </div>
            {/* HIDDEN PDF TEMPLATES FOR HTML2CANVAS */}
            <div className="absolute -left-[9999px] top-0 pointer-events-none opacity-0">
                {reportData && branding && (
                    <>
                        <CrmPdfTemplate 
                            ref={pdfTemplateRef}
                            data={reportData}
                            branding={branding}
                            dateLabel={`${format(dateRange.from, 'dd MMM', { locale: es })} - ${format(dateRange.to, 'dd MMM', { locale: es })}`}
                            t={t}
                        />
                        {exportingAgent && (
                            <AgentPdfTemplate
                                ref={agentPdfTemplateRef}
                                data={reportData}
                                agentId={exportingAgent}
                                branding={branding}
                                dateLabel={`${format(dateRange.from, 'dd MMM', { locale: es })} - ${format(dateRange.to, 'dd MMM', { locale: es })}`}
                                t={t}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    )
}

import React from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { formatCurrency, cn } from "@/modules/infrastructure/utils/utils"
import { Users, Target, Clock, DollarSign, Activity, AlertTriangle } from "lucide-react"

export interface CrmPdfTemplateProps {
    data: any; // AdvancedReportData
    branding: any;
    dateLabel: string;
    t: any;
}

export const CrmPdfTemplate = React.forwardRef<HTMLDivElement, CrmPdfTemplateProps>(
    ({ data, branding, dateLabel, t }, ref) => {
        const primaryColor = branding?.colors?.primary || "#4F46E5"
        const secondaryColor = branding?.colors?.secondary || "#EC4899"
        const logoUrl = branding?.logos?.main_light || branding?.logos?.main || branding?.logos?.portal

        const formatDuration = (seconds: number) => {
            const h = Math.floor(seconds / 3600)
            const m = Math.floor((seconds % 3600) / 60)
            if (h > 0) return `${h}h ${m}m`
            return `${m}m`
        }

        const pieColors = [primaryColor, '#10b981', '#f59e0b', secondaryColor, '#8b5cf6', '#06b6d4']
        const topAgents = [...(data?.agent_performance || [])].sort((a, b) => b.deals_won - a.deals_won).slice(0, 5)

        const groupedAbandoned = data?.abandoned_leads_list?.reduce((acc: any, lead: any) => {
            const agent = lead.assigned_agent || 'Sin asignar';
            acc[agent] = (acc[agent] || 0) + 1;
            return acc;
        }, {});
        const topAbandonedAgents = Object.entries(groupedAbandoned || {})
            .map(([agent, count]) => ({ agent, count }))
            .sort((a: any, b: any) => b.count - a.count)
            .slice(0, 3);

        return (
            <div ref={ref} className="bg-[#ffffff] text-[#1e293b]" style={{ width: '1200px', minHeight: '1697px', padding: '60px', fontFamily: "'Inter', sans-serif" }}>
                
                {/* BRAND HEADER */}
                <div className="flex justify-between items-start border-b-2 border-[#f1f5f9] pb-10 mb-10">
                    <div className="flex flex-col gap-2">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-16 object-contain object-left mb-4" crossOrigin="anonymous" />
                        ) : (
                            <h1 className="text-4xl font-black text-[#0f172a]" style={{ color: primaryColor }}>{branding?.name || "CRM Report"}</h1>
                        )}
                        <h2 className="text-2xl font-bold text-[#1e293b]">{t("crm_pdf.general_title") || "Reporte General de Operaciones CRM"}</h2>
                        <p className="text-[#64748b] font-medium">{t("crm_pdf.general_subtitle") || "Resumen Ejecutivo de Efectividad Comercial"}</p>
                    </div>
                    <div className="text-right">
                        <div className="inline-block px-4 py-2 rounded-xl mb-4 font-bold text-sm" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                            {t("Periodo") || "Periodo:"} {dateLabel}
                        </div>
                        <p className="text-sm text-[#94a3b8] font-medium">{t("Generado el:") || "Generado el:"} {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                </div>

                {/* HIGHLIGHT KPIs */}
                <div className="grid grid-cols-4 gap-6 mb-12">
                    {[
                        { title: t("crm_pdf.total_leads") || "Leads Totales", value: data.summary.total_leads, icon: Users, color: primaryColor },
                        { title: t("crm_pdf.conversion_rate") || "Tasa de Conversión", value: `${data.summary.conversion_rate}%`, icon: Target, color: "#10B981" },
                        { title: t("crm_pdf.pipeline_value") || "Valor Pipeline", value: formatCurrency(data.summary.pipeline_value), icon: DollarSign, color: "#F59E0B" },
                        { title: t("crm_pdf.avg_response") || "Tiempo Respuesta", value: formatDuration(data.summary.avg_response_time), icon: Clock, color: "#8B5CF6" }
                    ].map((kpi, i) => (
                        <div key={i} className="rounded-3xl border border-[#f1f5f9] bg-[#ffffff] p-6 relative overflow-hidden" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: kpi.color }}></div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-2xl" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                                    <kpi.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-[#64748b] uppercase tracking-wider">{kpi.title}</h3>
                            </div>
                            <div className="text-3xl font-black text-[#1e293b] truncate" title={String(kpi.value)}>{kpi.value}</div>
                        </div>
                    ))}
                </div>

                {/* 360 CHARTS GRID */}
                <div className="grid grid-cols-3 gap-6 mb-12">
                    {/* Activity Trend Area Chart */}
                    <div className="col-span-2 rounded-3xl border border-[#f1f5f9] bg-[#ffffff] p-8" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                        <h3 className="text-xl font-bold text-[#1e293b] mb-8 flex items-center gap-3">
                            <span className="w-3 h-8 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                            {t("crm_pdf.activity_trend") || "Tendencia de Actividad (Leads y Mensajes)"}
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.activity_trend} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} dy={10} />
                                    <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                                    <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingTop: '20px' }} />
                                    <Area yAxisId="left" type="monotone" dataKey="new_leads" name={t("crm_pdf.new_leads") || "Nuevos Leads"} stroke={primaryColor} strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                                    <Area yAxisId="right" type="monotone" dataKey="messages_sent" name={t("crm_pdf.messages") || "Mensajes Enviados"} stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMsgs)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Lead Sources Pie Chart */}
                    <div className="col-span-1 rounded-3xl border border-[#f1f5f9] bg-[#ffffff] p-8" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                        <h3 className="text-xl font-bold text-[#1e293b] mb-6 flex items-center gap-3">
                            <span className="w-2 h-6 rounded-full bg-[#f59e0b]"></span>
                            {t("crm_pdf.lead_sources") || "Fuentes de Leads"}
                        </h3>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.lead_sources}
                                        dataKey="count"
                                        nameKey="source"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={4}
                                    >
                                        {data.lead_sources.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-2 mt-4">
                            {data.lead_sources.map((s: any, idx: number) => {
                                const total = data.lead_sources.reduce((a:number,b:any)=>a+b.count,0)
                                const percent = total > 0 ? (s.count / total) * 100 : 0
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[idx % pieColors.length] }}></div>
                                            <span className="font-semibold text-[#334155]">{s.source}</span>
                                        </div>
                                        <div className="text-[#64748b] font-bold">{percent.toFixed(1)}%</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* TOP 5 AGENTS HORIZONTAL RANKING */}
                {topAgents.length > 0 && (
                    <div className="mb-12">
                        <h3 className="text-xl font-bold text-[#1e293b] mb-6 flex items-center gap-3">
                            <span className="w-3 h-8 rounded-full" style={{ backgroundColor: '#10b981' }}></span>
                            {t("crm_pdf.top_agents") || "Top Mejores Agentes (Cierres)"}
                        </h3>
                        <div className="grid grid-cols-5 gap-4">
                            {topAgents.map((agent: any, idx: number) => {
                                const medalColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : primaryColor;
                                return (
                                    <div key={idx} className="relative rounded-3xl border border-[#f1f5f9] bg-[#ffffff] p-6 flex flex-col items-center justify-center text-center overflow-hidden" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                                        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: medalColor }}></div>
                                        <div className="absolute top-4 left-4 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white" style={{ backgroundColor: medalColor }}>
                                            #{idx + 1}
                                        </div>

                                        {agent.avatar_url ? (
                                            <img src={agent.avatar_url} alt="A" className="w-16 h-16 rounded-full mb-3" style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} crossOrigin="anonymous" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full mb-3 flex items-center justify-center text-[#ffffff] font-bold text-2xl" style={{ backgroundColor: primaryColor, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                                                {agent.agent_name.substring(0,1).toUpperCase()}
                                            </div>
                                        )}
                                        <h4 className="text-sm font-bold text-[#1e293b] truncate w-full px-2">{agent.agent_name}</h4>
                                        <div className="text-2xl font-black text-[#10b981] mt-2">{agent.deals_won}</div>
                                        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">{t("Ganados") || "Ganados"}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* AGENT PERFORMANCE TABLE */}
                <div className="rounded-3xl border border-[#f1f5f9] bg-[#ffffff] p-8 mb-12" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                    <h3 className="text-xl font-bold text-[#1e293b] mb-8 flex items-center gap-3">
                        <span className="w-3 h-8 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                        {t("crm_pdf.agent_performance") || "Rendimiento por Agente (Ranking)"}
                    </h3>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#f8fafc] text-[11px] font-black uppercase tracking-widest text-[#64748b]">
                            <tr>
                                <th className="p-4 rounded-tl-xl rounded-bl-xl w-10 text-center">#</th>
                                <th className="p-4">{t("Agente") || "Agente"}</th>
                                <th className="p-4 text-center">{t("Leads Asignados") || "Leads Asignados"}</th>
                                <th className="p-4 text-center">{t("Ganados") || "Ganados"}</th>
                                <th className="p-4 text-center">{t("T. Respuesta") || "T. Respuesta"}</th>
                                <th className="p-4 text-center">{t("SLA") || "SLA Cumplido"}</th>
                                <th className="p-4 text-center rounded-tr-xl rounded-br-xl">{t("Conexión") || "Conexión"}</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-semibold text-[#334155]">
                            {data.agent_performance.map((agent: any, idx: number) => (
                                <tr key={idx} className="border-b border-[#f8fafc] last:border-0">
                                    <td className="p-4 py-5 text-center font-black text-[#94a3b8]">{idx + 1}</td>
                                    <td className="p-4 py-5 flex items-center gap-3">
                                        {agent.avatar_url ? (
                                            <img src={agent.avatar_url} alt="A" className="w-8 h-8 rounded-full" crossOrigin="anonymous" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#64748b] font-bold">
                                                {agent.agent_name.substring(0,1).toUpperCase()}
                                            </div>
                                        )}
                                        {agent.agent_name}
                                    </td>
                                    <td className="p-4 py-5 text-center text-[#64748b]">{agent.leads_assigned}</td>
                                    <td className="p-4 py-5 text-center text-[#10b981] font-black">{agent.deals_won}</td>
                                    <td className="p-4 py-5 text-center">{formatDuration(agent.avg_response_time)}</td>
                                    <td className="p-4 py-5 text-center text-[#f59e0b] font-bold">{agent.sla_met_percentage}%</td>
                                    <td className="p-4 py-5 text-center text-[#94a3b8]">{formatDuration(agent.connection_time_seconds)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ABANDONED LEADS LIST */}
                {topAbandonedAgents.length > 0 && (
                    <div className="rounded-3xl border border-[#ffe4e6] bg-[#fff1f2]/30 p-8" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                        <h3 className="text-xl font-bold text-[#9f1239] mb-6 flex items-center gap-3">
                            <AlertTriangle className="text-[#f43f5e] w-6 h-6" />
                            {t("crm_pdf.abandoned_leads") || "Alertas Críticas: Top 3 Asesores con Leads Abandonados"}
                        </h3>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#ffe4e6]/50 text-[11px] font-black uppercase tracking-widest text-[#e11d48]">
                                <tr>
                                    <th className="p-4 rounded-tl-xl rounded-bl-xl w-16 text-center">#</th>
                                    <th className="p-4">{t("Agente Responsable") || "Agente Responsable"}</th>
                                    <th className="p-4 text-right rounded-tr-xl rounded-br-xl">{t("Total Abandonos") || "Total Abandonos"}</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-semibold text-[#881337]/80">
                                {topAbandonedAgents.map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b border-[#ffe4e6]/50 last:border-0">
                                        <td className="p-4 text-center font-black text-[#f43f5e]">{idx + 1}</td>
                                        <td className="p-4 font-bold">{item.agent}</td>
                                        <td className="p-4 text-right font-black text-xl">{item.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-16 text-center text-[#94a3b8] font-medium text-sm">
                    Este documento es confidencial y ha sido generado por {branding?.name || "el sistema de gestión"}.
                </div>
            </div>
        )
    }
)
CrmPdfTemplate.displayName = "CrmPdfTemplate"

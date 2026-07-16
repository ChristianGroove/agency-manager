import React from "react"
import { formatCurrency, cn } from "@/modules/infrastructure/utils/utils"
import { Users, Target, Clock, Activity, ShieldCheck, AlertTriangle } from "lucide-react"

export interface AgentPdfTemplateProps {
    data: any; // AdvancedReportData
    agentId: string;
    branding: any;
    dateLabel: string;
    t: any;
}

export const AgentPdfTemplate = React.forwardRef<HTMLDivElement, AgentPdfTemplateProps>(
    ({ data, agentId, branding, dateLabel, t }, ref) => {
        const primaryColor = branding?.colors?.primary || "#4F46E5"
        const logoUrl = branding?.logos?.main_light || branding?.logos?.main || branding?.logos?.portal

        const agent = data.agent_performance.find((a: any) => a.agent_id === agentId)
        
        // If agent not found, provide fallback
        if (!agent) {
            return <div ref={ref}>Agent not found</div>
        }

        const formatDuration = (seconds: number) => {
            const h = Math.floor(seconds / 3600)
            const m = Math.floor((seconds % 3600) / 60)
            if (h > 0) return `${h}h ${m}m`
            return `${m}m`
        }

        const teamAvgDeals = data.agent_performance.reduce((acc: any, a: any) => acc + a.deals_won, 0) / (data.agent_performance.length || 1);
        const teamAvgLeads = data.agent_performance.reduce((acc: any, a: any) => acc + a.leads_assigned, 0) / (data.agent_performance.length || 1);
        const teamAvgResponse = data.agent_performance.reduce((acc: any, a: any) => acc + a.avg_response_time, 0) / (data.agent_performance.length || 1);

        // Filter abandoned leads for this specific agent
        const agentAbandonedLeads = data.abandoned_leads_list?.filter((l: any) => l.agent_id === agentId || l.assigned_agent === agent.agent_name) || []

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
                        <h2 className="text-2xl font-bold text-[#1e293b]">{t("crm_pdf.agent_title") || "Reporte de Rendimiento de Agente"}</h2>
                        <div className="flex items-center gap-4 mt-2">
                            {agent.avatar_url ? (
                                <img src={agent.avatar_url} alt="A" className="w-12 h-12 rounded-full" style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }} crossOrigin="anonymous" />
                            ) : (
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-[#ffffff] font-bold text-xl" style={{ backgroundColor: primaryColor }}>
                                    {agent.agent_name.substring(0,1).toUpperCase()}
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-[#475569]">{agent.agent_name}</h3>
                        </div>
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
                        { title: t("crm_pdf.assigned_leads") || "Leads Asignados", value: agent.leads_assigned, icon: Users, color: primaryColor },
                        { title: t("crm_pdf.won_deals") || "Negocios Ganados", value: agent.deals_won, icon: Target, color: "#10B981" },
                        { title: t("crm_pdf.avg_response") || "T. Medio Respuesta", value: formatDuration(agent.avg_response_time), icon: Clock, color: "#F59E0B" },
                        { title: t("crm_pdf.sla_met") || "SLA Cumplido", value: `${agent.sla_met_percentage}%`, icon: ShieldCheck, color: "#8B5CF6" }
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

                {/* DETAILED STATS & COMPARISON */}
                <div className="grid grid-cols-2 gap-6 mb-12">
                    <div className="rounded-3xl border border-[#f1f5f9] bg-[#ffffff] p-8" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                        <h3 className="text-xl font-bold text-[#1e293b] mb-8 flex items-center gap-3">
                            <span className="w-3 h-8 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                            {t("crm_pdf.agent_efficiency") || "Eficiencia Comercial"}
                        </h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center pb-4 border-b border-[#f8fafc]">
                                <span className="text-[#64748b] font-medium">{t("Tasa de Cierre (Conversión)") || "Tasa de Cierre (Conversión)"}</span>
                                <span className="text-[#1e293b] font-bold text-lg">
                                    {agent.leads_assigned > 0 ? ((agent.deals_won / agent.leads_assigned) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-[#f8fafc]">
                                <span className="text-[#64748b] font-medium">{t("Tiempo Total de Conexión") || "Tiempo Total de Conexión"}</span>
                                <span className="text-[#1e293b] font-bold text-lg">{formatDuration(agent.connection_time_seconds)}</span>
                            </div>
                            <div className="flex justify-between items-center pb-4 border-b border-[#f8fafc]">
                                <span className="text-[#64748b] font-medium">{t("Estatus Actual") || "Estatus Actual"}</span>
                                <span className="px-3 py-1 bg-[#f1f5f9] rounded-full text-[#334155] font-bold text-sm uppercase">
                                    {agent.agent_status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* COMPARISON WITH TEAM */}
                    <div className="rounded-3xl border border-[#f1f5f9] bg-[#ffffff] p-8" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                        <h3 className="text-xl font-bold text-[#1e293b] mb-8 flex items-center gap-3">
                            <span className="w-3 h-8 rounded-full" style={{ backgroundColor: '#10b981' }}></span>
                            {t("crm_pdf.team_comparison") || "Comparativa con el Equipo"}
                        </h3>
                        <div className="space-y-6">
                            <div className="flex flex-col gap-2 pb-4 border-b border-[#f8fafc]">
                                <div className="flex justify-between items-center">
                                    <span className="text-[#64748b] font-medium">{t("Negocios Ganados") || "Negocios Ganados"}</span>
                                    <span className="text-xs font-bold text-[#94a3b8]">Agente vs Equipo</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-[#f1f5f9] h-3 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${Math.min((agent.deals_won / Math.max(teamAvgDeals, 1)) * 50, 100)}%`, backgroundColor: primaryColor }}></div>
                                    </div>
                                    <span className="text-[#1e293b] font-bold min-w-[30px] text-right">{agent.deals_won}</span>
                                    <span className="text-[#94a3b8] font-bold min-w-[10px]">|</span>
                                    <span className="text-[#64748b] font-bold min-w-[30px] text-left">{Math.round(teamAvgDeals)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pb-4 border-b border-[#f8fafc]">
                                <div className="flex justify-between items-center">
                                    <span className="text-[#64748b] font-medium">{t("Leads Asignados") || "Leads Asignados"}</span>
                                    <span className="text-xs font-bold text-[#94a3b8]">Agente vs Equipo</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-[#f1f5f9] h-3 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${Math.min((agent.leads_assigned / Math.max(teamAvgLeads, 1)) * 50, 100)}%`, backgroundColor: '#f59e0b' }}></div>
                                    </div>
                                    <span className="text-[#1e293b] font-bold min-w-[30px] text-right">{agent.leads_assigned}</span>
                                    <span className="text-[#94a3b8] font-bold min-w-[10px]">|</span>
                                    <span className="text-[#64748b] font-bold min-w-[30px] text-left">{Math.round(teamAvgLeads)}</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[#64748b] font-medium">{t("Tiempo de Respuesta") || "Tiempo de Respuesta"}</span>
                                    <span className="text-xs font-bold text-[#94a3b8]">Agente vs Equipo</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm font-bold">
                                    <span className="text-left" style={{ color: agent.avg_response_time <= teamAvgResponse ? '#10b981' : '#f43f5e' }}>{formatDuration(agent.avg_response_time)}</span>
                                    <span className="text-[#94a3b8]">|</span>
                                    <span className="text-[#64748b]">{formatDuration(teamAvgResponse)} (Media)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ABANDONED LEADS LIST (AGENT SPECIFIC) */}
                {agentAbandonedLeads.length > 0 && (
                    <div className="rounded-3xl border border-[#ffe4e6] bg-[#fff1f2]/30 p-8" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                        <h3 className="text-xl font-bold text-[#9f1239] mb-6 flex items-center gap-3">
                            <AlertTriangle className="text-[#f43f5e] w-6 h-6" />
                            {t("crm_pdf.abandoned_leads_agent") || "Oportunidades Perdidas (Leads Abandonados por este agente)"}
                        </h3>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#ffe4e6]/50 text-[11px] font-black uppercase tracking-widest text-[#e11d48]">
                                <tr>
                                    <th className="p-4 rounded-tl-xl rounded-bl-xl">{t("Cliente") || "Cliente"}</th>
                                    <th className="p-4">{t("Esperando desde") || "Esperando desde"}</th>
                                    <th className="p-4 rounded-tr-xl rounded-br-xl">{t("Tiempo de Abandono") || "Tiempo de Abandono"}</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-semibold text-[#881337]/80">
                                {agentAbandonedLeads.map((lead: any, idx: number) => (
                                    <tr key={idx} className="border-b border-[#ffe4e6]/50 last:border-0">
                                        <td className="p-4 font-bold">{lead.name}</td>
                                        <td className="p-4">{new Date(lead.waiting_since).toLocaleString('es-ES')}</td>
                                        <td className="p-4 font-black">{formatDuration(lead.waiting_seconds)}</td>
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
AgentPdfTemplate.displayName = "AgentPdfTemplate"

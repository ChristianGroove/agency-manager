import React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { formatCurrency, cn } from "@/modules/infrastructure/utils/utils"
import { TrendingUp, MousePointer2, Target, DollarSign, Activity } from "lucide-react"

export interface PdfReportTemplateProps {
    data: any; // SafeData
    branding: any;
    dateLabel: string;
    t: any; // Translation function
}

export const PdfReportTemplate = React.forwardRef<HTMLDivElement, PdfReportTemplateProps>(
    ({ data, branding, dateLabel, t }, ref) => {
        const primaryColor = branding?.colors?.primary || "#4F46E5"
        const secondaryColor = branding?.colors?.secondary || "#EC4899"
        const logoUrl = branding?.logos?.main_light || branding?.logos?.main || branding?.logos?.portal

        const totalConversions = data.campaigns.reduce((acc: number, c: any) => acc + c.conversions, 0)
        const costPerConv = totalConversions > 0 ? data.spend / totalConversions : 0

        const pieColors = [primaryColor, '#10b981', '#f59e0b', secondaryColor, '#8b5cf6']
        const topCampaigns = [...data.campaigns].sort((a,b) => b.spend - a.spend).slice(0, 5)

        return (
            <div ref={ref} className="bg-white text-slate-800" style={{ width: '1200px', minHeight: '1697px', padding: '60px', fontFamily: "'Inter', sans-serif" }}>
                
                {/* BRAND HEADER */}
                <div className="flex justify-between items-start border-b-2 border-slate-100 pb-10 mb-10">
                    <div className="flex flex-col gap-2">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-16 object-contain object-left mb-4" crossOrigin="anonymous" />
                        ) : (
                            <h1 className="text-4xl font-black text-slate-900" style={{ color: primaryColor }}>{branding?.name || "Meta Ads Report"}</h1>
                        )}
                        <h2 className="text-2xl font-bold text-slate-800">{t("meta_ads_monitor.dashboard.chart_title") || "Insights Ejecutivos de Campañas"}</h2>
                        <p className="text-slate-500 font-medium">{t("meta_ads_monitor.title") || "Análisis de Rendimiento - Meta Ads"}</p>
                    </div>
                    <div className="text-right">
                        <div className="inline-block px-4 py-2 rounded-xl mb-4 font-bold text-sm" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                            {t("Periodo")} {dateLabel}
                        </div>
                        <p className="text-sm text-slate-400 font-medium">{t("Generado el:") || "Generado el:"} {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                </div>

                {/* HIGHLIGHT KPIs */}
                <div className="grid grid-cols-4 gap-6 mb-12">
                    {[
                        { title: t("meta_ads_monitor.dashboard.spend") || "Inversión Total", value: formatCurrency(data.spend), icon: DollarSign, color: primaryColor },
                        { title: t("Resultados") || "Resultados (Conv.)", value: totalConversions.toString(), icon: Target, color: "#10B981" },
                        { title: t("Costo x Resultado") || "Costo x Resultado", value: formatCurrency(costPerConv), icon: Activity, color: "#F59E0B" },
                        { title: t("meta_ads_monitor.dashboard.roas") || "Retorno (ROAS)", value: data.roas > 0 ? `${data.roas.toFixed(2)}x` : '--', icon: TrendingUp, color: "#8B5CF6" }
                    ].map((kpi, i) => (
                        <div key={i} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_10px_40px_rgb(0,0,0,0.03)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: kpi.color }}></div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-2xl" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                                    <kpi.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{kpi.title}</h3>
                            </div>
                            <div className="text-4xl font-black text-slate-800">{kpi.value}</div>
                        </div>
                    ))}
                </div>

                {/* 360 CHARTS GRID */}
                <div className="grid grid-cols-3 gap-6 mb-12">
                    {/* Volume */}
                    <div className="col-span-3 rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_10px_40px_rgb(0,0,0,0.03)]">
                        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                            <span className="w-3 h-8 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                            {t("Volumen de Rendimiento") || "Volumen de Rendimiento"}
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topCampaigns} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} dy={10} tickFormatter={(val) => val.length > 15 ? val.substring(0,15)+'...' : val} />
                                    <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                                    <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingTop: '20px' }} />
                                    <Bar yAxisId="left" dataKey="spend" name={t("Inversión") || "Inversión"} fill={primaryColor} radius={[6, 6, 0, 0]} maxBarSize={50} />
                                    <Bar yAxisId="right" dataKey="conversions" name={t("Conversiones") || "Conversiones"} fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Efficiency & Engagement */}
                    <div className="col-span-1 rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_10px_40px_rgb(0,0,0,0.03)]">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                            <span className="w-2 h-6 rounded-full bg-amber-500"></span>
                            Eficiencia (CPC)
                        </h3>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topCampaigns}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" hide />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `$${val}`} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                                    <Bar dataKey="cpc" name="CPC" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="col-span-1 rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_10px_40px_rgb(0,0,0,0.03)]">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                            <span className="w-2 h-6 rounded-full bg-pink-500"></span>
                            Interacción (CTR)
                        </h3>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topCampaigns}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" hide />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `${val}%`} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                                    <Bar dataKey="ctr" name="CTR" fill="#ec4899" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="col-span-1 rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_10px_40px_rgb(0,0,0,0.03)]">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                            <span className="w-2 h-6 rounded-full bg-violet-500"></span>
                            Retorno (ROAS)
                        </h3>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topCampaigns}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" hide />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `${val}x`} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                                    <Bar dataKey="roas" name="ROAS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* DEMOGRAPHICS */}
                {data.demographics && data.demographics.ageGender && (
                    <div className="grid grid-cols-2 gap-6 mb-12">
                        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_10px_40px_rgb(0,0,0,0.03)]">
                            <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                                <span className="w-3 h-8 rounded-full" style={{ backgroundColor: secondaryColor }}></span>
                                {t("Distribución por Edad y Género") || "Distribución por Edad y Género"}
                            </h3>
                            <div className="flex gap-6 items-center">
                                <div className="h-[250px] w-1/2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.demographics.ageGender.slice(0,5)}
                                                dataKey="spend"
                                                nameKey="age"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={4}
                                            >
                                                {data.demographics.ageGender.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-1/2 flex flex-col gap-3">
                                    {data.demographics.ageGender.slice(0,5).map((d: any, i: number) => {
                                        const percent = data.spend > 0 ? (d.spend / data.spend) * 100 : 0;
                                        return (
                                            <div key={i} className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }}></div>
                                                    <span className="font-bold text-slate-800 text-sm">
                                                        {d.age} {d.gender === 'female' ? '(Mujeres)' : (d.gender === 'male' ? '(Hombres)' : '')}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between pl-5 text-xs font-medium text-slate-500">
                                                    <span>{percent.toFixed(1)}% Inv. ({formatCurrency(d.spend)})</span>
                                                    <span className="text-emerald-600">{d.conversions} Conv.</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_10px_40px_rgb(0,0,0,0.03)]">
                            <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                                <span className="w-3 h-8 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                                {t("Top Regiones Rentables") || "Top Regiones Rentables"}
                            </h3>
                            <div className="flex flex-col gap-4">
                                {data.demographics.region.slice(0,5).map((r: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white" style={{ backgroundColor: pieColors[idx % pieColors.length] }}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{r.region}</h4>
                                                <p className="text-xs text-slate-500 font-medium">Inversión: {formatCurrency(r.spend)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-lg text-emerald-500">{r.conversions}</div>
                                            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Conversiones</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* CAMPAIGN BREAKDOWN TABLE */}
                <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_10px_40px_rgb(0,0,0,0.03)]">
                    <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                        <span className="w-3 h-8 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                        {t("meta_ads_monitor.dashboard.active_campaigns") || "Desglose de Campañas"}
                    </h3>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="p-4 rounded-tl-xl rounded-bl-xl">{t("Campaña") || "Campaña"}</th>
                                <th className="p-4 text-right">{t("Inversión") || "Inversión"}</th>
                                <th className="p-4 text-right">{t("Impresiones") || "Impresiones"}</th>
                                <th className="p-4 text-right">{t("Clics") || "Clics"}</th>
                                <th className="p-4 text-right">{t("Conv.") || "Conv."}</th>
                                <th className="p-4 text-right">{t("Costo/Conv.") || "Costo/Conv."}</th>
                                <th className="p-4 text-right rounded-tr-xl rounded-br-xl">CTR</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-semibold text-slate-700">
                            {data.campaigns.map((c: any, idx: number) => (
                                <tr key={idx} className="border-b border-slate-50 last:border-0">
                                    <td className="p-4 py-5">{c.name}</td>
                                    <td className="p-4 py-5 text-right">{formatCurrency(c.spend)}</td>
                                    <td className="p-4 py-5 text-right text-slate-500">{c.impressions.toLocaleString()}</td>
                                    <td className="p-4 py-5 text-right text-slate-500">{c.clicks.toLocaleString()}</td>
                                    <td className="p-4 py-5 text-right text-emerald-500 font-black">{c.conversions}</td>
                                    <td className="p-4 py-5 text-right">{formatCurrency(c.conversions > 0 ? c.spend / c.conversions : 0)}</td>
                                    <td className="p-4 py-5 text-right">{c.ctr.toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-16 text-center text-slate-400 font-medium text-sm">
                    Este documento es confidencial y ha sido generado por {branding?.name || "el sistema de gestión"}.
                </div>
            </div>
        )
    }
)
PdfReportTemplate.displayName = "PdfReportTemplate"

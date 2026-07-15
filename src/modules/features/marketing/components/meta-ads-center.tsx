"use client"

import React, { useState, useEffect } from "react"
import { BarChart3, Target, TrendingUp, DollarSign, Users, MousePointer2, Settings2, RefreshCcw, Zap, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdsDashboard } from "@/modules/features/portal/insights/ads-dashboard"
import { TenantAdsSettings } from "./tenant-ads-settings"
import { getOrgAdsMetrics, syncOrgAdsMetrics, getOrgMetaConfig } from "../actions"
import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { PdfReportTemplate } from "./pdf-report-template"
import { toJpeg } from "html-to-image"
import jsPDF from "jspdf"
import { SectionHeader } from "@/components/layout/section-header"
import { Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useTranslation } from "@/modules/core/i18n/use-translation"

export function MetaAdsCenter() {
    const { t } = useTranslation()
    const [adsData, setAdsData] = useState<any>(null)
    const [hasConfig, setHasConfig] = useState(false)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("overview")
    const [datePreset, setDatePreset] = useState("last_30d")
    const [exporting, setExporting] = useState(false)
    const [branding, setBranding] = useState<any>(null)
    const pdfRef = React.useRef<HTMLDivElement>(null)

    async function loadData() {
        setLoading(true)
        try {
            const { data } = await getOrgAdsMetrics()
            const { config } = await getOrgMetaConfig()
            const brandConfig = await getEffectiveBranding()
            setBranding(brandConfig)
            setAdsData(data)
            if (data?.metadata?.datePreset) {
                setDatePreset(data.metadata.datePreset)
            }
            setHasConfig(!!config?.has_access_token)
        } catch (error) {
            console.error("Failed to load ads data:", error)
        } finally {
            setLoading(false)
        }
    }

    async function syncData(presetToSync: string = datePreset) {
        setLoading(true)
        try {
            const result = await syncOrgAdsMetrics(presetToSync)
            if (!result.success) {
                toast.error(result.error || t("meta_ads_monitor.sync_error"))
            } else {
                toast.success(t("meta_ads_monitor.sync_success"))
                await loadData()
            }
        } catch (error) {
            toast.error(t("meta_ads_monitor.sync_unexpected"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    async function handleExportPDF() {
        if (!adsData || !branding || !pdfRef.current) return;
        setExporting(true);
        try {
            const labels: Record<string, string> = {
                'today': 'Hoy',
                'yesterday': 'Ayer',
                'last_7d': 'Últimos 7 días',
                'last_30d': 'Últimos 30 días',
                'maximum': 'Máximo'
            };
            const label = labels[datePreset] || datePreset;
            
            // Allow charts to render
            await new Promise((resolve) => setTimeout(resolve, 800));

            // Use html-to-image because html2canvas fails with Tailwind v4 (oklch/lab colors)
            const dataUrl = await toJpeg(pdfRef.current, {
                quality: 0.95,
                pixelRatio: 3,
                backgroundColor: '#ffffff'
            });

            // Get original DOM element dimensions
            const nodeWidth = pdfRef.current.offsetWidth;
            const nodeHeight = pdfRef.current.offsetHeight;
            
            // Calculate height proportional to A4 width (210mm)
            const pdfWidth = 210;
            const pdfHeight = (nodeHeight * pdfWidth) / nodeWidth;

            // Generate an Infographic-style single long page PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Reporte_MetaAds_${label.replace(/\s+/g, '_')}.pdf`);

            toast.success("PDF premium generado exitosamente");
        } catch (error) {
            console.error(error);
            toast.error("Error al generar el PDF");
        } finally {
            setExporting(false);
        }
    }

    return (
        <div className="space-y-6 min-h-screen pb-20">
            <SectionHeader
                title={t("meta_ads_monitor.title")}
                subtitle={t("meta_ads_monitor.subtitle")}
                icon={BarChart3}
                action={
                    <div className="flex items-center gap-3">
                        <Select value={datePreset} onValueChange={(val) => { setDatePreset(val); syncData(val); }} disabled={loading}>
                            <SelectTrigger className="w-[180px] bg-white dark:bg-transparent border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 rounded-xl h-9 text-xs font-bold">
                                <SelectValue placeholder="Periodo" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 shadow-xl">
                                <SelectItem value="today" className="text-xs font-bold rounded-lg cursor-pointer">Hoy</SelectItem>
                                <SelectItem value="yesterday" className="text-xs font-bold rounded-lg cursor-pointer">Ayer</SelectItem>
                                <SelectItem value="last_7d" className="text-xs font-bold rounded-lg cursor-pointer">Últimos 7 días</SelectItem>
                                <SelectItem value="last_30d" className="text-xs font-bold rounded-lg cursor-pointer">Últimos 30 días</SelectItem>
                                <SelectItem value="maximum" className="text-xs font-bold rounded-lg cursor-pointer">Máximo</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExportPDF} 
                            disabled={loading || exporting || !adsData}
                            className="bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 rounded-xl"
                        >
                            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                            PDF
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => syncData()} 
                            disabled={loading}
                            className="bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 rounded-xl"
                        >
                            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t("meta_ads_monitor.sync_real")}
                        </Button>
                    </div>
                }
            />

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    <p className="text-sm font-bold text-slate-500 animate-pulse">{t("meta_ads_monitor.loading_api")}</p>
                </div>
            ) : !hasConfig ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="glass-card lg:col-span-2 p-12 flex flex-col items-center justify-center text-center border-dashed border-2 border-gray-200 dark:border-white/10 min-h-[400px] rounded-2xl">
                        <div className="glass-card p-6 mb-6 animate-bounce-slow">
                            <BarChart3 className="h-12 w-12 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">{t("meta_ads_monitor.connection_required")}</h3>
                        <p className="text-muted-foreground max-w-md text-lg">
                            {t("meta_ads_monitor.connection_desc")}
                        </p>
                    </Card>
                    
                    <div className="lg:col-span-1">
                        <Card className="glass-card p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-primary" />
                                {t("meta_ads_monitor.global_config")}
                            </h3>
                            <TenantAdsSettings onSuccess={loadData} />
                        </Card>
                    </div>
                </div>
            ) : !adsData ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="glass-card lg:col-span-2 p-12 flex flex-col items-center justify-center text-center border-dashed border-2 border-gray-200 dark:border-white/10 min-h-[400px] rounded-2xl">
                        <div className="glass-card p-6 mb-6">
                            <BarChart3 className="h-12 w-12 text-primary opacity-50" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">Sin métricas sincronizadas</h3>
                        <p className="text-muted-foreground max-w-md text-lg">
                            La conexión está activa. Presiona 'Sincronizar Datos Reales' para traer la información de Meta.
                        </p>
                    </Card>
                    
                    <div className="lg:col-span-1">
                        <Card className="glass-card p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-primary" />
                                {t("meta_ads_monitor.global_config")}
                            </h3>
                            <TenantAdsSettings onSuccess={loadData} />
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="space-y-10">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-100 dark:border-white/10 h-auto">
                            <TabsTrigger value="overview" className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 text-sm font-bold">
                                {t("meta_ads_monitor.tab_overview")}
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 text-sm font-bold">
                                {t("meta_ads_monitor.tab_settings")}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-0 focus-visible:outline-none animate-in slide-in-from-bottom-4 duration-500">
                            <AdsDashboard 
                                data={adsData} 
                                loading={loading}
                            />
                        </TabsContent>

                        <TabsContent value="settings" className="mt-0 focus-visible:outline-none animate-in slide-in-from-bottom-4 duration-500">
                            <div className="max-w-2xl mx-auto">
                                <Card className="glass-card p-10 rounded-2xl shadow-2xl shadow-slate-200/60 dark:shadow-none">
                                    <div className="mb-8">
                                        <h3 className="text-2xl font-bold mb-2">{t("meta_ads_monitor.config_title")}</h3>
                                        <p className="text-muted-foreground">
                                            {t("meta_ads_monitor.config_desc")}
                                        </p>
                                    </div>
                                    <TenantAdsSettings onSuccess={loadData} />
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
            
            <style jsx global>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s ease-in-out infinite;
                }
            `}</style>
            {/* HIDDEN PDF TEMPLATE */}
            {adsData && branding && (
                <div className="absolute -left-[9999px] top-0">
                    <PdfReportTemplate 
                        ref={pdfRef} 
                        data={{
                            ...adsData, 
                            spend: Number(adsData.spend || 0),
                            roas: Number(adsData.roas || 0),
                            demographics: adsData.metadata?.demographics || adsData.demographics || null,
                            campaigns: Array.isArray(adsData.campaigns) ? adsData.campaigns.map((c: any) => ({
                                ...c,
                                spend: Number(c.spend || 0),
                                conversions: Number(c.conversions || 0),
                                cpc: Number(c.cpc || 0),
                                ctr: Number(c.ctr || 0),
                                roas: Number(c.roas || 0)
                            })) : []
                        }} 
                        branding={branding} 
                        dateLabel={datePreset} 
                        t={t}
                    />
                </div>
            )}
        </div>
    )
}

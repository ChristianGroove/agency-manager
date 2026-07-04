"use client"

import React, { useState, useEffect } from "react"
import { BarChart3, Target, TrendingUp, DollarSign, Users, MousePointer2, Settings2, RefreshCcw, Zap, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdsDashboard } from "@/modules/features/portal/insights/ads-dashboard"
import { TenantAdsSettings } from "./tenant-ads-settings"
import { getOrgAdsMetrics, syncOrgAdsMetrics } from "../actions"
import { SectionHeader } from "@/components/layout/section-header"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useTranslation } from "@/modules/core/i18n/use-translation"

export function MetaAdsCenter() {
    const { t } = useTranslation()
    const [adsData, setAdsData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("overview")

    async function loadData() {
        setLoading(true)
        try {
            const { data } = await getOrgAdsMetrics()
            setAdsData(data)
        } catch (error) {
            console.error("Failed to load ads data:", error)
        } finally {
            setLoading(false)
        }
    }

    async function syncData() {
        setLoading(true)
        try {
            const result = await syncOrgAdsMetrics()
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

    return (
        <div className="space-y-6 min-h-screen pb-20">
            <SectionHeader
                title={t("meta_ads_monitor.title")}
                subtitle={t("meta_ads_monitor.subtitle")}
                icon={BarChart3}
                action={
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={syncData} 
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
            ) : !adsData ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="glass-card lg:col-span-2 p-12 flex flex-col items-center justify-center text-center border-dashed border-2 border-gray-200 dark:border-white/10 min-h-[400px] rounded-3xl">
                        <div className="glass-card p-6 mb-6 animate-bounce-slow">
                            <BarChart3 className="h-12 w-12 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">{t("meta_ads_monitor.connection_required")}</h3>
                        <p className="text-muted-foreground max-w-md text-lg">
                            {t("meta_ads_monitor.connection_desc")}
                        </p>
                    </Card>
                    
                    <div className="lg:col-span-1">
                        <Card className="glass-card p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none">
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
                                <Card className="glass-card p-10 rounded-3xl shadow-2xl shadow-slate-200/60 dark:shadow-none">
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
        </div>
    )
}

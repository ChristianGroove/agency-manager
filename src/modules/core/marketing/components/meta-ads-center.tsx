"use client"

import React, { useState, useEffect } from "react"
import { BarChart3, Target, TrendingUp, DollarSign, Users, MousePointer2, Settings2, RefreshCcw, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdsDashboard } from "../../portal/insights/ads-dashboard"
import { TenantAdsSettings } from "./tenant-ads-settings"
import { getOrgAdsMetrics } from "../actions"
import { SectionHeader } from "@/components/layout/section-header"
import { Badge } from "@/components/ui/badge"

export function MetaAdsCenter() {
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

    useEffect(() => {
        loadData()
    }, [])

    return (
        <div className="space-y-6 min-h-screen pb-20">
            <SectionHeader
                title="Meta Ads Monitor"
                subtitle="Control total sobre el rendimiento de tus anuncios y la calidad de tus leads en tiempo real."
                icon={BarChart3}
                action={
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={loadData} 
                            disabled={loading}
                            className="rounded-xl border-dashed border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        >
                            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Sincronizar
                        </Button>
                        <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 px-6">
                            <Zap className="h-4 w-4 mr-2 fill-current" />
                            Optimizar
                        </Button>
                    </div>
                }
            />

            {!adsData && !loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 p-12 flex flex-col items-center justify-center text-center border-dashed border-2 bg-slate-50/50 dark:bg-zinc-900/50 min-h-[400px] rounded-3xl">
                        <div className="p-6 bg-white dark:bg-zinc-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none mb-6 border border-slate-100 dark:border-white/5 animate-bounce-slow">
                            <BarChart3 className="h-12 w-12 text-indigo-600" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">Conexión Requerida</h3>
                        <p className="text-muted-foreground max-w-md text-lg">
                            Para visualizar las métricas y automatizar tus leads, primero debes conectar la cuenta de Meta de tu negocio.
                        </p>
                    </Card>
                    
                    <div className="lg:col-span-1">
                        <Card className="p-8 rounded-3xl border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Settings2 className="h-5 w-5 text-indigo-600" />
                                Configuración Global
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
                                Vista General
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 text-sm font-bold">
                                Conexión y API
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-0 focus-visible:outline-none animate-in slide-in-from-bottom-4 duration-500">
                            <AdsDashboard 
                                data={adsData} 
                                loading={loading}
                                title="Métricas de Rendimiento"
                            />
                        </TabsContent>

                        <TabsContent value="settings" className="mt-0 focus-visible:outline-none animate-in slide-in-from-bottom-4 duration-500">
                            <div className="max-w-2xl mx-auto">
                                <Card className="p-10 rounded-3xl border-none shadow-2xl shadow-slate-200/60 dark:shadow-none bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/10">
                                    <div className="mb-8">
                                        <h3 className="text-2xl font-bold mb-2">Configuración de Meta</h3>
                                        <p className="text-muted-foreground">
                                            Gestiona las credenciales de Graph API y los IDs de activos para el monitoreo automatizado.
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

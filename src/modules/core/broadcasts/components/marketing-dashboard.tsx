'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge'
import {
    Plus,
    Send,
    Radio,
    CheckCircle2,
    BarChart3,
    Megaphone,
    Workflow,
    ArrowRight,
    Search,
    Filter
} from 'lucide-react'
import { SplitText } from "@/components/ui/split-text"
import { CreateBroadcastSheet } from './create-broadcast-sheet'
import { BroadcastsView } from './broadcasts-view'
import { CampaignsList } from './campaigns-list'
import { getMarketingStats } from '../marketing-actions'

export function MarketingDashboard() {
    const router = useRouter()
    const [createBroadcastOpen, setCreateBroadcastOpen] = useState(false)
    const [stats, setStats] = useState({
        totalCampaigns: 0,
        totalMessages: 0,
        totalDelivered: 0,
        deliveryRate: 0
    })

    useEffect(() => {
        loadStats()
    }, [])

    async function loadStats() {
        const data = await getMarketingStats()
        setStats(data)
    }

    async function handleRunCycle() {
        try {
            const res = await fetch('/api/marketing/run')
            const data = await res.json()
            if (data.success) {
                // Determine message based on logs/processed
                const count = data.processed || 0
                if (count > 0) {
                    // Show detailed toast
                    // Force refresh stats
                    loadStats()
                } else {
                    // No pending items
                }
                // We'll use a simple alert/toast for now or just log
                // Ideally this component should use 'sonner' toast but it's not imported.
                // Assuming global toast or just console for now, or imported if available.
                // Let's rely on re-fetching stats to show impact.
                loadStats()
                alert(`Ciclo ejecutado: ${count} envíos procesados.\nLogs: ${data.logs?.length} entradas.`)
            } else {
                alert('Error al ejecutar ciclo: ' + data.error)
            }
        } catch (e) {
            alert('Error de conexión con Runner')
        }
    }

    return (
        <div className="space-y-8 min-h-screen pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        <SplitText>Marketing Center</SplitText>
                    </h2>
                    <p className="text-muted-foreground mt-1 max-w-2xl">
                        Gestiona campañas, automatizaciones y envíos masivos para impulsar el crecimiento de tu negocio.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={handleRunCycle}
                        variant="ghost"
                        className="text-muted-foreground hover:text-brand-pink"
                        title="Forzar ciclo de ejecución (Debug)"
                    >
                        <Workflow className="h-4 w-4 mr-2" />
                        Run Cycle
                    </Button>
                    <Button
                        onClick={() => router.push('/crm/marketing/new')}
                        variant="outline"
                        className="hidden md:flex border-dashed border-gray-300 dark:border-zinc-700"
                    >
                        <Megaphone className="h-4 w-4 mr-2" />
                        Nueva Campaña
                    </Button>
                    <Button onClick={() => setCreateBroadcastOpen(true)} className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-lg shadow-pink-500/20">
                        <Radio className="h-4 w-4 mr-2" />
                        Broadcast Rápido
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-5 bg-white dark:bg-zinc-900/50 backdrop-blur-md border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <Megaphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCampaigns}</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Campañas</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-5 bg-white dark:bg-zinc-900/50 backdrop-blur-md border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <Send className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalMessages}</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Msjs Enviados</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-5 bg-white dark:bg-zinc-900/50 backdrop-blur-md border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.deliveryRate}%</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tasa Entrega</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-5 bg-white dark:bg-zinc-900/50 backdrop-blur-md border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group opacity-60">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <BarChart3 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">--%</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversión</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="campaigns" className="space-y-6">
                <TabsList className="bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-100 dark:border-white/10 h-auto">
                    <TabsTrigger value="campaigns" className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10">
                        Campañas
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg px-4 py-2 data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10">
                        Historial de Envíos
                    </TabsTrigger>
                    {/* <TabsTrigger value="automations" disabled className="rounded-lg px-4 py-2 opacity-50 cursor-not-allowed">
                        Automatizaciones <Badge variant="outline" className="ml-2 text-[10px] h-4">Soon</Badge>
                    </TabsTrigger> */}
                </TabsList>

                <TabsContent value="campaigns" className="mt-0">
                    <CampaignsList />
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                    <BroadcastsView />
                </TabsContent>
            </Tabs>

            {/* Create Sheets */}
            <CreateBroadcastSheet
                open={createBroadcastOpen}
                onOpenChange={setCreateBroadcastOpen}
                onSuccess={loadStats}
            />
        </div>
    )
}

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
    Zap,
    Workflow,
    ArrowRight,
    Search,
    Filter,
    Users
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { SplitText } from "@/components/ui/split-text"
import { CreateBroadcastSheet } from './create-broadcast-sheet'
import { CampaignsList } from './campaigns-list'
import { toast } from 'sonner'
import { getMarketingStats } from '../marketing-actions'
import { SectionHeader } from "@/components/layout/section-header"
import { useTranslation } from "@/modules/core/i18n/use-translation"

export function MarketingDashboard() {
    const { t } = useTranslation()
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    
    const [activeTab, setActiveTab] = useState(tabParam === 'insights' ? 'insights' : 'campaigns')
    const [refreshVersion, setRefreshVersion] = useState(0)
    const [createBroadcastOpen, setCreateBroadcastOpen] = useState(false)
    const [stats, setStats] = useState({
        totalCampaigns: 0,
        totalMessages: 0,
        totalDelivered: 0,
        deliveryRate: 0
    })

    useEffect(() => {
        if (tabParam === 'insights') {
            setActiveTab('insights')
        } else if (!tabParam) {
            setActiveTab('campaigns')
        }
    }, [tabParam])

    useEffect(() => {
        loadStats()
    }, [])

    async function loadStats() {
        const data = await getMarketingStats()
        if ('error' in data) toast.error(data.error)
        else setStats(data)
    }

    return (
        <div className="space-y-6 min-h-screen pb-20">
            {/* Header Section */}
            <SectionHeader
                title={activeTab === 'insights' ? t("marketing.dashboard.title_insights") : t("marketing.dashboard.title_marketing")}
                subtitle={activeTab === 'insights' ? t("marketing.dashboard.subtitle_insights") : t("marketing.dashboard.subtitle_marketing")}
                icon={activeTab === 'insights' ? BarChart3 : Megaphone}
                action={
                    <div className="flex gap-3">
                        {activeTab !== 'insights' && (
                            <>
                                <Button onClick={() => setCreateBroadcastOpen(true)} className="bg-brand-pink hover:bg-brand-pink/90 text-white">
                                    <Zap className="h-4 w-4 mr-2" />
                                    {t("marketing.dashboard.quick_campaign")}
                                </Button>
                            </>
                        )}
                        {activeTab === 'insights' && (
                            <Button variant="outline" onClick={() => setActiveTab('campaigns')}>
                                {t("marketing.dashboard.back_to_marketing")}
                            </Button>
                        )}
                    </div>
                }
            />

            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">{t("marketing.dashboard.preparation_notice")}</p>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="glass-card p-5 group hover:-translate-y-1 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <Megaphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCampaigns}</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("marketing.dashboard.kpis.campaigns")}</p>
                        </div>
                    </div>
                </Card>

                <Card className="glass-card p-5 group hover:-translate-y-1 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <Send className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalMessages}</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("marketing.dashboard.kpis.messages_accepted")}</p>
                        </div>
                    </div>
                </Card>

                <Card className="glass-card p-5 group hover:-translate-y-1 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.deliveryRate}%</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("marketing.dashboard.kpis.delivery_rate")}</p>
                        </div>
                    </div>
                </Card>

                <Card className="glass-card p-5 group hover:-translate-y-1 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">--</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("marketing.dashboard.kpis.active_audiences")}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs 
                value={activeTab} 
                onValueChange={setActiveTab} 
                className="w-full"
            >
                <TabsList className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-1">
                    <TabsTrigger value="campaigns" className="data-[state=active]:bg-brand-pink/10 data-[state=active]:text-brand-pink">{t("marketing.dashboard.tabs.campaigns")}</TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-brand-pink/10 data-[state=active]:text-brand-pink">{t("marketing.dashboard.tabs.history")}</TabsTrigger>
                    <TabsTrigger value="insights" className="data-[state=active]:bg-brand-pink/10 data-[state=active]:text-brand-pink">{t("marketing.dashboard.tabs.insights")}</TabsTrigger>
                </TabsList>

                <TabsContent value="campaigns" className="mt-0">
                    <CampaignsList key={refreshVersion} />
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                    <div className="p-12 text-center text-muted-foreground bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                        <p>{t("marketing.dashboard.tabs.history")}</p>
                    </div>
                </TabsContent>

            </Tabs>

            {/* Create Sheets */}
            <CreateBroadcastSheet
                open={createBroadcastOpen}
                onOpenChange={setCreateBroadcastOpen}
                onSuccess={() => { setRefreshVersion(v => v + 1); void loadStats() }}
            />
        </div>
    )
}

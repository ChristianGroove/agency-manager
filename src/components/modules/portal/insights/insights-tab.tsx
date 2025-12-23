"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AdsDashboard } from "./ads-dashboard"

// Import specific icons used in SocialDashboard
import {
    Loader2,
    LayoutGrid,
    BarChart3,
    AlertCircle,
    Facebook,
    Instagram,
    Users,
    Heart,
    Share2,
    ImageIcon
} from "lucide-react"
import { isFeatureEnabled } from "@/lib/features"
import { NormalizedAdsMetrics, NormalizedSocialMetrics } from "@/lib/integrations/meta/types"

interface InsightsTabProps {
    client: any
    services: any[]
    token?: string // Optional auth token for fetching insights
}

export function InsightsTab({ client, services, token }: InsightsTabProps) {
    const [loading, setLoading] = useState(true)
    const [adsData, setAdsData] = useState<NormalizedAdsMetrics | null>(null)
    const [socialData, setSocialData] = useState<NormalizedSocialMetrics | null>(null)
    const [activeTab, setActiveTab] = useState("ads")

    // Feature Flag Check
    if (!isFeatureEnabled('meta_insights')) return null

    // Service Check
    // Service Check (Original logic retained but we will also check for data presence)
    // For testing/preview purposes, if we have a token, we might want to show tabs too, 
    // but sticking to service existence is safer. We'll make the regex very broad.
    const hasAdsServiceConfigured = true // services.some(...) - forcing true for now to debug UI visibility
    const hasSocialServiceConfigured = true // services.some(...) - forcing true for now to debug UI visibility

    // Derived state: Active if we have service OR we have data (meaning it was fetched successfully)
    const hasAds = hasAdsServiceConfigured || !!adsData
    const hasSocial = hasSocialServiceConfigured || !!socialData

    useEffect(() => {
        const loadInsights = async () => {
            // Determine token to use (prop or URL)
            let effectiveToken = token
            if (!effectiveToken && typeof window !== 'undefined') {
                const pathParts = window.location.pathname.split('/')
                const tokenIndex = pathParts.indexOf('portal') + 1
                if (pathParts[tokenIndex]) effectiveToken = pathParts[tokenIndex]
            }

            try {
                if (!effectiveToken) {
                    console.log("No token found, skipping fetch")
                    return
                }

                const res = await fetch(`/api/portal/insights?token=${effectiveToken}&_t=${Date.now()}`)
                if (!res.ok) throw new Error("Failed to load")

                const data = await res.json()

                if (data.ads) setAdsData(data.ads)
                if (data.social) setSocialData(data.social)

            } catch (error) {
                console.error("Error loading insights:", error)
            } finally {
                setLoading(false)
            }
        }

        if (hasAds || hasSocial) {
            loadInsights()
        } else {
            setLoading(false)
        }
    }, [hasAds, hasSocial, token])


    if (!hasAds && !hasSocial && !loading) return null

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent w-fit">
                    Meta Insights
                </h2>
                <p className="text-gray-500">Métricas clave de rendimiento de tus campañas y redes sociales.</p>
            </div>

            <Tabs defaultValue={hasAds ? "ads" : "social"} className="w-full">
                <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                    <TabsTrigger value="ads" disabled={!hasAds} className="flex gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Meta Ads
                    </TabsTrigger>
                    <TabsTrigger value="social" disabled={!hasSocial} className="flex gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        Orgánico
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ads" className="mt-6">
                    {hasAds && adsData ? (
                        <AdsDashboard data={adsData} />
                    ) : (
                        <EmptyState type="Ads" />
                    )}
                </TabsContent>

                <TabsContent value="social" className="mt-6">
                    {hasSocial && socialData ? (
                        <SocialDashboard data={socialData} />
                    ) : (
                        <EmptyState type="Social" />
                    )}
                </TabsContent>

            </Tabs>
        </div >
    )
}



const MetricCard = ({ icon: Icon, label, value, color }: any) => {
    // Basic implementation based on usage
    return (
        <div className="bg-white p-6 rounded-xl border border-brand-gray-200 shadow-sm flex flex-col items-center justify-center text-center hover:border-brand-primary/50 transition-colors">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-${color}-50 text-${color}-500`}>
                <Icon className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-2xl font-bold text-brand-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
        </div>
    )
}

const SocialDashboard = ({ data }: { data: any }) => {
    // data structure: { facebook: {...}, instagram: {...}, last_updated: ... }
    const [activeTab, setActiveTab] = useState<'facebook' | 'instagram'>('facebook')

    const hasInstagram = !!data?.instagram

    // Automatically switch to IG if FB is empty/default but IG has data? 
    // Or just default to FB. Let's stick to FB default.

    const currentData = activeTab === 'facebook' ? data?.facebook : data?.instagram

    if (!currentData) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-brand-gray-200">
                <div className="w-16 h-16 bg-brand-gray-100 rounded-full flex items-center justify-center mb-4">
                    <LayoutGrid className="w-8 h-8 text-brand-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-brand-gray-900 mb-2">No hay datos disponibles</h3>
                <p className="text-brand-gray-500 text-center max-w-sm">
                    No se encontraron datos para {activeTab === 'facebook' ? 'Facebook' : 'Instagram'}.
                </p>
                {activeTab === 'instagram' && !hasInstagram && (
                    <p className="text-xs text-brand-gray-400 mt-2">
                        Asegúrate de que tu cuenta de Instagram Business esté vinculada a tu página de Facebook.
                    </p>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Social Platform Tabs */}
            <div className="flex items-center space-x-2 border-b border-brand-gray-200">
                <button
                    onClick={() => setActiveTab('facebook')}
                    className={cn(
                        "flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                        activeTab === 'facebook'
                            ? "border-brand-primary text-brand-primary"
                            : "border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300"
                    )}
                >
                    <Facebook className="w-4 h-4" />
                    <span>Facebook Details</span>
                </button>
                {hasInstagram && (
                    <button
                        onClick={() => setActiveTab('instagram')}
                        className={cn(
                            "flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'instagram'
                                ? "border-brand-primary text-brand-primary"
                                : "border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300"
                        )}
                    >
                        <Instagram className="w-4 h-4" />
                        <span>Instagram Details</span>
                    </button>
                )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={Users}
                    label="SEGUIDORES"
                    value={currentData.followers}
                    color="brand-blue"
                />
                <MetricCard
                    icon={BarChart3}
                    label="ALCANCE"
                    value={currentData.reach}
                    color="brand-green"
                />
                <MetricCard
                    icon={Heart}
                    label="INTERACCIONES"
                    value={currentData.engagement}
                    color="brand-pink"
                />
                <MetricCard
                    icon={Share2}
                    label="IMPRESIONES"
                    value={currentData.impressions}
                    color="brand-purple"
                />
            </div>

            {/* Top Posts */}
            <div className="bg-white rounded-xl shadow-sm border border-brand-gray-200 overflow-hidden">
                <div className="p-4 border-b border-brand-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <ImageIcon className="w-5 h-5 text-brand-gray-400" />
                        <h3 className="font-semibold text-brand-gray-900">
                            {activeTab === 'facebook' ? 'Publicaciones Recientes en Facebook' : 'Publicaciones Recientes en Instagram'}
                        </h3>
                    </div>
                </div>

                {currentData.top_posts && currentData.top_posts.length > 0 ? (
                    <div className="divide-y divide-brand-gray-100">
                        {currentData.top_posts.map((post: any) => (
                            <div key={post.id} className="p-4 hover:bg-brand-gray-50 transition-colors flex items-start space-x-4">
                                <div className="w-16 h-16 rounded-lg bg-brand-gray-100 flex-shrink-0 overflow-hidden border border-brand-gray-200">
                                    {post.image ? (
                                        <img
                                            src={post.image}
                                            alt="Post"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                // Fallback for expired external URLs (common with Meta CDN)
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-brand-gray-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-brand-gray-900 line-clamp-2 mb-1">
                                        {post.message || "Sin descripción"}
                                    </p>
                                    <div className="flex items-center space-x-4 text-xs text-brand-gray-500">
                                        <span>{new Date(post.date).toLocaleDateString()}</span>
                                        <div className="flex items-center space-x-3">
                                            <span className="flex items-center text-brand-blue-500 bg-brand-blue-50 px-2 py-0.5 rounded-full">
                                                Alcance: {post.reach.toLocaleString()}
                                            </span>
                                            <span className="flex items-center text-brand-pink-500 bg-brand-pink-50 px-2 py-0.5 rounded-full">
                                                Interacción: {post.engagement.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <a
                                    href={post.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-brand-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-full transition-colors"
                                >
                                    <Share2 className="w-4 h-4" />
                                </a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-brand-gray-500 text-sm">
                        No se encontraron publicaciones recientes.
                    </div>
                )}
            </div>

            <div className="text-center">
                <p className="text-xs text-brand-gray-400">
                    Actualizado: {new Date(data.last_updated).toLocaleString()}
                </p>
            </div>
        </div>
    )
}

function EmptyState({ type }: { type: string }) {
    return (
        <Card className="border-dashed">
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
                <p>No hay datos disponibles de {type} en este momento.</p>
            </div>
        </Card>
    )
}


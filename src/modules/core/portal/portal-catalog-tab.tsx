"use client"

import { useEffect, useState, useRef } from "react"
import { ServiceCatalogItem } from "@/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, CheckCircle, ArrowRight, MessageCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getPortalCatalog, registerServiceInterest } from "@/modules/core/portal/actions"
import { CatalogItemFlipCard } from "./catalog-item-flip-card"
import { PortalHeader } from "./portal-header"
import { motion } from "framer-motion"
import { useTranslation } from "@/lib/i18n/use-translation"

export function PortalCatalogTab({ settings, client, token }: { settings: any, client: any, token: string }) {
    const { t } = useTranslation()
    const [items, setItems] = useState<ServiceCatalogItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [requestedItems, setRequestedItems] = useState<string[]>([]) // Track requested/interested items locally

    const containerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0 })

    useEffect(() => {
        if (containerRef.current && contentRef.current) {
            const containerWidth = containerRef.current.offsetWidth
            const contentWidth = contentRef.current.scrollWidth
            setDragConstraints({
                left: -(contentWidth - containerWidth),
                right: 0
            })
        }
    }, [items])

    useEffect(() => {
        loadCatalog()
    }, [])

    const loadCatalog = async () => {
        try {
            const data = await getPortalCatalog(token)
            setItems(data || [])
        } catch (error) {
            console.error("Error loading catalog:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleRequestInterest = async (item: ServiceCatalogItem) => {
        // 1. Optimistic Update
        setRequestedItems(prev => [...prev, item.id])

        // 2. Open WhatsApp Immediately
        const phone = settings.agency_phone || '573000000000' // Fallback
        const message = t('portal.catalog_tab.whatsapp_message').replace('{name}', item.name)
        const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`

        window.open(whatsappUrl, '_blank')

        // 3. Log event in background (Server Action)
        // We need the portal token. Since we don't have it explicitly in props, we can rely on client ID or pass token.
        // For security, server actions usually act on session or verified token. 
        // We will assume 'client.portal_short_token' or 'client.portal_token' is available in the client prop we just added.
        if (client?.portal_short_token || client?.portal_token) {
            await registerServiceInterest(client.portal_short_token || client.portal_token || '', item.id, item.name)
        }
    }

    const categories = Array.from(new Set(items.map(i => i.category)))
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    const formatPrice = (price?: number) => {
        if (!price) return t('portal.catalog_tab.consult_price')
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price)
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-gray-300" /></div>

    return (
        <div className="max-w-4xl mx-auto w-full pb-16 animate-in fade-in duration-500">
            <PortalHeader
                title={t('portal.catalog_tab.title')}
                subtitle={t('portal.catalog_tab.subtitle')}
            />

            {/* Filters */}
            <div className="flex flex-col gap-4 mb-8 sticky top-0 z-20 bg-gray-50/80 backdrop-blur-md p-4 rounded-xl border border-gray-100">
                <div className="relative w-full max-w-md mx-auto">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={t('portal.catalog_tab.search_placeholder')}
                        className="pl-9 bg-white border-gray-200 rounded-full h-11"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="w-full overflow-hidden relative group cursor-grab active:cursor-grabbing py-2" ref={containerRef}>
                    <motion.div
                        ref={contentRef}
                        className="flex gap-2 w-max px-4"
                        drag="x"
                        dragConstraints={dragConstraints}
                        dragElastic={0.1}
                    >
                        <Button
                            variant={selectedCategory === "all" ? "default" : "outline"}
                            onClick={() => setSelectedCategory("all")}
                            className={cn(
                                "rounded-full whitespace-nowrap px-6 transition-all duration-200",
                                selectedCategory === "all"
                                    ? "bg-white text-gray-900 shadow-md ring-2 ring-gray-900 border-transparent font-medium hover:bg-white hover:text-gray-900 hover:ring-2 hover:ring-gray-900"
                                    : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 shadow-sm"
                            )}
                        >
                            {t('portal.catalog_tab.filter_all')}
                        </Button>
                        {categories.map(cat => (
                            <Button
                                key={cat}
                                variant={selectedCategory === cat ? "default" : "outline"}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "rounded-full whitespace-nowrap capitalize px-6 transition-all duration-200",
                                    selectedCategory === cat
                                        ? "bg-white text-gray-900 shadow-md ring-2 ring-gray-900 border-transparent font-medium hover:bg-white hover:text-gray-900 hover:ring-2 hover:ring-gray-900"
                                        : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 shadow-sm"
                                )}
                            >
                                {cat}
                            </Button>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => {
                    const isRequested = requestedItems.includes(item.id)
                    return (
                        <CatalogItemFlipCard
                            key={item.id}
                            item={item}
                            variant="portal"
                            isRequested={isRequested}
                            onRequestInterest={handleRequestInterest}
                            settings={settings}
                        />
                    )
                })}
            </div>
        </div>
    )
}

"use client"

import { useEffect, useState, useRef } from "react"
import { ServiceCatalogItem } from "@/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, CheckCircle, ArrowRight, MessageCircle, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/modules/infrastructure/utils/utils"
import { getPortalCatalog } from "@/modules/features/portal/services/portal-service"
import { registerServiceInterest } from "@/modules/features/portal/services/business-service"
import { ProductDetailModal } from "./product-detail-modal"
import { PortalHeader } from "./portal-header"
import { motion } from "framer-motion"
import { useTranslation } from "@/modules/core/i18n/use-translation"

export function PortalCatalogTab({ settings, client, token }: { settings: any, client: any, token: string }) {
    const { t } = useTranslation()
    const [items, setItems] = useState<ServiceCatalogItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [requestedItems, setRequestedItems] = useState<string[]>([]) // Track requested/interested items locally

    // Detail Modal State & URL Deep Linking
    const [selectedDetailItem, setSelectedDetailItem] = useState<ServiceCatalogItem | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [initialVariantId, setInitialVariantId] = useState<string | null>(null)
    const [initialAddonIds, setInitialAddonIds] = useState<string[]>([])

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
            const loadedItems = data || []
            setItems(loadedItems)

            // Check URL search params for deep-linked item
            if (typeof window !== "undefined") {
                const params = new URLSearchParams(window.location.search)
                const itemId = params.get("item")
                const variantId = params.get("variant")
                const addonsParam = params.get("addons")

                if (itemId) {
                    const matched = loadedItems.find(i => i.id === itemId)
                    if (matched) {
                        setSelectedDetailItem(matched)
                        setInitialVariantId(variantId || null)
                        setInitialAddonIds(addonsParam ? addonsParam.split(",") : [])
                        setIsDetailModalOpen(true)
                    }
                }
            }
        } catch (error) {
            console.error("Error loading catalog:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenDetail = (item: ServiceCatalogItem) => {
        setSelectedDetailItem(item)
        setInitialVariantId(null)
        setInitialAddonIds([])
        setIsDetailModalOpen(true)
    }

    const handleCloseDetail = () => {
        setIsDetailModalOpen(false)
        setSelectedDetailItem(null)
        setInitialVariantId(null)
        setInitialAddonIds([])
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
            <div className="flex flex-col gap-4 mb-8 sticky top-0 z-20 bg-gray-50/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md p-4 rounded-2xl border border-gray-200/80 dark:border-white/5">
                <div className="relative w-full max-w-md mx-auto">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400 dark:text-zinc-500" />
                    <Input
                        placeholder={t('portal.catalog_tab.search_placeholder')}
                        className="pl-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-full h-11 shadow-xs"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="w-full overflow-hidden relative group cursor-grab active:cursor-grabbing py-1" ref={containerRef}>
                    <motion.div
                        ref={contentRef}
                        className="flex gap-2 w-max px-2"
                        drag="x"
                        dragConstraints={dragConstraints}
                        dragElastic={0.1}
                    >
                        <Button
                            variant={selectedCategory === "all" ? "default" : "outline"}
                            onClick={() => setSelectedCategory("all")}
                            className={cn(
                                "rounded-full whitespace-nowrap px-5 h-9 text-xs transition-all duration-200",
                                selectedCategory === "all"
                                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md border-transparent font-semibold"
                                    : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 border-gray-200 dark:border-white/10"
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
                                    "rounded-full whitespace-nowrap capitalize px-5 h-9 text-xs transition-all duration-200",
                                    selectedCategory === cat
                                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md border-transparent font-semibold"
                                        : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 border-gray-200 dark:border-white/10"
                                )}
                            >
                                {cat}
                            </Button>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Catalog Grid (Estilo Tienda Oficial) */}
            {filteredItems.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-white/10 p-8">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-40 text-muted-foreground" />
                    <p className="text-sm font-medium">No se encontraron servicios disponibles en esta categoría.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map(item => {
                        const isRequested = requestedItems.includes(item.id)
                        const gallery = (item as any).gallery_images || (item.image_url ? [item.image_url] : [])
                        const coverImg = item.image_url || (gallery.length > 0 ? (typeof gallery[0] === 'string' ? gallery[0] : gallery[0]?.url) : "/placeholder-service.jpg")

                        return (
                            <div
                                key={item.id}
                                onClick={() => handleOpenDetail(item)}
                                className="group flex flex-col rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/90 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                            >
                                {/* Photo Container */}
                                <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                    {coverImg ? (
                                        <img
                                            src={coverImg}
                                            alt={item.name}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-brand-pink/15 via-purple-500/10 to-indigo-500/10 dark:from-brand-pink/20 dark:via-purple-950/40 dark:to-zinc-900 flex items-center justify-center">
                                            <Sparkles className="w-8 h-8 text-primary/40" />
                                        </div>
                                    )}

                                    {/* Category Pill */}
                                    {item.category && (
                                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/15 text-[10px] font-bold uppercase tracking-wider shadow-xs">
                                            {item.category}
                                        </div>
                                    )}

                                    {/* Requested Badge */}
                                    {isRequested && (
                                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            <span>Consultado</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-1.5">
                                        <h3 className="font-extrabold text-base leading-snug line-clamp-2 text-zinc-900 dark:text-white group-hover:text-primary transition-colors">
                                            {item.name}
                                        </h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                                            {item.description || (item.metadata?.portal_card?.detailed_description) || "Servicio profesional diseñado a medida para tu empresa."}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 block">
                                                {item.price_label_type === 'from' ? 'Desde' : 'Inversión'}
                                            </span>
                                            <span className="text-base font-extrabold text-zinc-900 dark:text-white truncate block">
                                                {formatPrice(item.base_price)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-xl text-xs font-semibold gap-1 border-zinc-200 dark:border-white/10 hover:border-primary/50 text-zinc-700 dark:text-zinc-300 hover:text-primary transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleOpenDetail(item)
                                                }}
                                            >
                                                <span>Detalles</span>
                                                <ArrowRight className="h-3 w-3" />
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                title="Consultar por WhatsApp"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleRequestInterest(item)
                                                }}
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Interactive Product Detail Modal */}
            <ProductDetailModal
                item={selectedDetailItem}
                isOpen={isDetailModalOpen}
                onClose={handleCloseDetail}
                initialVariantId={initialVariantId}
                initialAddonIds={initialAddonIds}
                portalToken={token}
                settings={settings}
                currency="COP"
            />
        </div>
    )
}

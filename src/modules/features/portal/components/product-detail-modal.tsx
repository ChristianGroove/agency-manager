"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
    UniversalCatalogItem,
    CatalogVariant,
    StorefrontThemeConfig,
    StorefrontActionPayload
} from "@/types/catalog"
import { Dialog, DialogContent, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerOverlay, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { GalleryCarousel } from "./gallery-carousel"
import { VariantSelector } from "./variant-selector"
import { AddonSelector, SelectedAddon } from "./addon-selector"
import { SpecificationTabs } from "./specification-tabs"
import { StatusBadge, calculateStorefrontPricing, evaluateDynamicBadges, isOutOfStockGuard } from "./status-badge"
import { ActionHubButtons } from "./action-hub-buttons"
import { useStorefrontCart } from "@/hooks/use-storefront-cart"
import { Button } from "@/components/ui/button"
import {
    X,
    Plus,
    Minus,
    Shield,
    Sparkles,
    Check,
    Share2,
    ShoppingCart,
    Building2,
    Home,
    Car,
    Bike,
    Key,
    MapPin,
    Trees,
    Video,
    FileText,
    ExternalLink,
    Maximize2,
    Calculator,
    ChevronDown,
    ChevronUp,
    MessageCircle,
    FileSpreadsheet,
    Tag,
    CalendarRange,
    Bath,
    Bed,
    ChefHat,
    Building,
    Layers,
    Clock,
    Receipt,
    Award,
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface ProductDetailModalProps {
    item: UniversalCatalogItem | null
    isOpen: boolean
    onClose: () => void
    initialVariantId?: string | null
    initialAddonIds?: string[] | null
    portalToken?: string | null
    organizationId?: string | null
    settings?: any
    themeConfig?: StorefrontThemeConfig | null
    currency?: string
    onAddToCart?: (payload: StorefrontActionPayload) => void
    onRequestQuote?: (payload: StorefrontActionPayload) => void
    onWompiCheckout?: (payload: StorefrontActionPayload) => void
}

interface RealEstateTickerMetric {
    id: string
    label: string
    value: string
    icon: React.ElementType
    colorClass: string
    bgClass: string
}

function RealEstateMetricsTicker({ details, item }: { details: any; item?: any }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isPaused, setIsPaused] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [startX, setStartX] = useState(0)
    const [scrollLeftState, setScrollLeftState] = useState(0)

    const specs = (item?.specifications || {}) as Record<string, any>
    const metaRe = (item?.metadata?.real_estate_details || item?.classification_metadata?.real_estate || {}) as Record<string, any>
    const d = { ...metaRe, ...specs, ...details }

    const metrics: RealEstateTickerMetric[] = []

    // 1. Área Total
    const areaTotal = d.area_total_m2 || d.total_area || specs.total_area || specs.area_total_m2
    if (areaTotal) {
        metrics.push({
            id: "area_total",
            label: "Área Total",
            value: `${areaTotal} m²`,
            icon: Maximize2,
            colorClass: "text-teal-600 dark:text-teal-400",
            bgClass: "bg-teal-500/10 dark:bg-teal-500/20",
        })
    }

    // 2. Área Construida
    const areaBuilt = d.area_built_m2 || d.built_area || specs.built_area || specs.area_built_m2
    if (areaBuilt && areaBuilt !== areaTotal) {
        metrics.push({
            id: "area_built",
            label: "Área Construida",
            value: `${areaBuilt} m²`,
            icon: Building,
            colorClass: "text-cyan-600 dark:text-cyan-400",
            bgClass: "bg-cyan-500/10 dark:bg-cyan-500/20",
        })
    }

    // 3. Habitaciones
    const bedrooms = d.bedrooms !== undefined && d.bedrooms !== null ? d.bedrooms : specs.bedrooms
    if (bedrooms !== undefined && bedrooms !== null && bedrooms !== "") {
        metrics.push({
            id: "bedrooms",
            label: "Habitaciones",
            value: `${bedrooms} ${Number(bedrooms) === 1 ? "Habitación" : "Habitaciones"}`,
            icon: Bed,
            colorClass: "text-indigo-600 dark:text-indigo-400",
            bgClass: "bg-indigo-500/10 dark:bg-indigo-500/20",
        })
    }

    // 4. Baños
    const bathrooms = d.bathrooms !== undefined && d.bathrooms !== null ? d.bathrooms : specs.bathrooms
    if (bathrooms !== undefined && bathrooms !== null && bathrooms !== "") {
        metrics.push({
            id: "bathrooms",
            label: "Baños",
            value: `${bathrooms} ${Number(bathrooms) === 1 ? "Baño" : "Baños"}`,
            icon: Bath,
            colorClass: "text-sky-600 dark:text-sky-400",
            bgClass: "bg-sky-500/10 dark:bg-sky-500/20",
        })
    }

    // 5. Parqueadero
    const cars = Number(d.parking_cars || specs.parking_cars) || 0
    const motos = Number(d.parking_motorcycles || specs.parking_motorcycles) || 0
    const pType =
        (d.parking_type || specs.parking_type) === "covered"
            ? "Cubierto"
            : (d.parking_type || specs.parking_type) === "uncovered"
            ? "Intemperie"
            : (d.parking_type || specs.parking_type) === "mixed"
            ? "Mixto"
            : (d.parking_type || specs.parking_type) === "communal"
            ? "Comunal"
            : ""

    if (cars > 0 || motos > 0 || (d.parking_type && d.parking_type !== "none") || specs.parking) {
        const parts: string[] = []
        if (cars > 0) parts.push(`${cars} ${cars === 1 ? "Carro" : "Carros"}`)
        if (motos > 0) parts.push(`${motos} ${motos === 1 ? "Moto" : "Motos"}`)
        let parkingLabel = parts.length > 0 ? parts.join(", ") : (specs.parking || "Parqueadero")
        if (pType && parkingLabel !== "Sin parqueadero") {
            parkingLabel += ` (${pType})`
        }
        metrics.push({
            id: "parking",
            label: "Parqueadero",
            value: parkingLabel,
            icon: Car,
            colorClass: "text-amber-600 dark:text-amber-400",
            bgClass: "bg-amber-500/10 dark:bg-amber-500/20",
        })
    }

    // 6. Piso / Nivel
    const floor = d.floor_number || d.floor || specs.floor || specs.floor_number
    if (floor) {
        metrics.push({
            id: "floor",
            label: "Piso / Nivel",
            value: typeof floor === "number" || !isNaN(Number(floor)) ? `Piso ${floor}` : String(floor),
            icon: Layers,
            colorClass: "text-violet-600 dark:text-violet-400",
            bgClass: "bg-violet-500/10 dark:bg-violet-500/20",
        })
    }

    // 7. Tipo de Cocina
    const rawKitchen = d.kitchen_type || d.kitchen || specs.kitchen_type || specs.kitchen
    if (rawKitchen) {
        const kitchenLabel =
            rawKitchen === "integral"
                ? "Cocina Integral"
                : rawKitchen === "semi_integral"
                ? "Cocina Semi-Integral"
                : rawKitchen === "americana"
                ? "Cocina Americana"
                : rawKitchen === "isla"
                ? "Cocina con Isla"
                : rawKitchen === "tradicional"
                ? "Cocina Tradicional"
                : rawKitchen === "sin_cocina"
                ? "Sin Cocina"
                : String(rawKitchen)
        metrics.push({
            id: "kitchen",
            label: "Tipo de Cocina",
            value: kitchenLabel,
            icon: ChefHat,
            colorClass: "text-orange-600 dark:text-orange-400",
            bgClass: "bg-orange-500/10 dark:bg-orange-500/20",
        })
    }

    // 8. Antigüedad
    const ant = d.antiquity || specs.antiquity
    if (ant) {
        metrics.push({
            id: "antiquity",
            label: "Antigüedad",
            value: String(ant),
            icon: Clock,
            colorClass: "text-emerald-600 dark:text-emerald-400",
            bgClass: "bg-emerald-500/10 dark:bg-emerald-500/20",
        })
    }

    // 9. Administración
    const adminFee = d.admin_fee || d.hoa_fee || specs.hoa_fee || specs.admin_fee
    if (adminFee) {
        metrics.push({
            id: "admin_fee",
            label: "Administración",
            value: `$${(Number(adminFee) || 0).toLocaleString("es-CO")} / mes`,
            icon: Receipt,
            colorClass: "text-rose-600 dark:text-rose-400",
            bgClass: "bg-rose-500/10 dark:bg-rose-500/20",
        })
    }

    // 10. Estrato
    const stratum = d.stratum || d.strata || specs.strata || specs.stratum
    if (stratum) {
        metrics.push({
            id: "stratum",
            label: "Estrato",
            value: String(stratum).toLowerCase().includes("estrato") ? String(stratum) : `Estrato ${stratum}`,
            icon: Award,
            colorClass: "text-blue-600 dark:text-blue-400",
            bgClass: "bg-blue-500/10 dark:bg-blue-500/20",
        })
    }

    if (metrics.length === 0) return null

    // 3 repetitions for continuous seamless loop
    const displayItems = [...metrics, ...metrics, ...metrics]

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        let animationFrameId: number
        const speed = 0.5 // pixels per frame

        const step = () => {
            if (!isPaused && !isDragging && el) {
                el.scrollLeft += speed
                const oneThird = el.scrollWidth / 3
                if (el.scrollLeft >= oneThird * 2) {
                    el.scrollLeft -= oneThird
                } else if (el.scrollLeft <= 0) {
                    el.scrollLeft += oneThird
                }
            }
            animationFrameId = requestAnimationFrame(step)
        }

        animationFrameId = requestAnimationFrame(step)
        return () => cancelAnimationFrame(animationFrameId)
    }, [isPaused, isDragging])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return
        setIsDragging(true)
        setStartX(e.pageX - containerRef.current.offsetLeft)
        setScrollLeftState(containerRef.current.scrollLeft)
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return
        e.preventDefault()
        const x = e.pageX - containerRef.current.offsetLeft
        const walk = (x - startX) * 1.5
        containerRef.current.scrollLeft = scrollLeftState - walk
    }

    const handleMouseUpOrLeave = () => {
        setIsDragging(false)
    }

    return (
        <div className="relative w-full rounded-2xl overflow-hidden group select-none py-1">
            {/* Gradient Fade Masks */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none" />

            {/* Draggable & Animating Ticker Track */}
            <div
                ref={containerRef}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => {
                    setIsPaused(false)
                    handleMouseUpOrLeave()
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
                className={cn(
                    "flex items-center gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] py-1 px-4 cursor-grab active:cursor-grabbing",
                    isDragging ? "cursor-grabbing" : ""
                )}
                style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                }}
            >
                {displayItems.map((item, index) => {
                    const IconComp = item.icon
                    return (
                        <div
                            key={`${item.id}-${index}`}
                            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 shadow-xs shrink-0 transition-transform duration-200 hover:scale-[1.03] hover:border-zinc-300 dark:hover:border-zinc-600"
                        >
                            <div className={cn("p-2 rounded-xl shrink-0 flex items-center justify-center", item.bgClass, item.colorClass)}>
                                <IconComp className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-max">
                                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider leading-none mb-1">
                                    {item.label}
                                </span>
                                <span className="text-xs font-black text-zinc-900 dark:text-white leading-tight">
                                    {item.value}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export function ProductDetailModal({
    item,
    isOpen,
    onClose,
    initialVariantId,
    initialAddonIds,
    portalToken,
    organizationId,
    settings = {},
    themeConfig,
    currency = "COP",
    onAddToCart,
    onRequestQuote,
    onWompiCheckout
}: ProductDetailModalProps) {
    // 1. Detect viewport width for Desktop (Dialog) vs Mobile (Vaul Drawer)
    const [isDesktop, setIsDesktop] = useState(true)

    useEffect(() => {
        const checkViewport = () => {
            setIsDesktop(window.innerWidth >= 768)
        }
        checkViewport()
        window.addEventListener("resize", checkViewport)
        return () => window.removeEventListener("resize", checkViewport)
    }, [])

    // 2. Theme & Dark Mode Resolution
    const themeKey = themeConfig?.theme || "modern"
    const isDarkLuxe = themeKey === "dark_luxe"
    const isCyberGlass = themeKey === "cyber_glass_3d" || themeKey === "modern_glass"
    const isDarkTheme = Boolean(
        isDarkLuxe ||
        isCyberGlass ||
        themeConfig?.color_mode === "dark" ||
        (typeof (themeConfig as any)?.dark_mode === "boolean" && (themeConfig as any)?.dark_mode) ||
        (typeof document !== "undefined" && document.documentElement.classList.contains("dark"))
    )

    // 3. Local selection states
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({})
    const [selectedVariant, setSelectedVariant] = useState<CatalogVariant | null>(null)
    const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])
    const [quantity, setQuantity] = useState(1)

    // 2.1 Mortgage Calculator state for Real Estate
    const [isMortgageCalcOpen, setIsMortgageCalcOpen] = useState(false)
    const [downPaymentPercent, setDownPaymentPercent] = useState(30)
    const [loanTermYears, setLoanTermYears] = useState(20)
    const [annualInterestRate, setAnnualInterestRate] = useState(12.5)

    const isRealEstate = Boolean(
        item?.classification === "real_estate" ||
        item?.category === "Bienes Raíces & Inmuebles" ||
        item?.category?.toLowerCase().includes("inmueble") ||
        item?.category?.toLowerCase().includes("propiedad") ||
        item?.category?.toLowerCase().includes("apartamento") ||
        item?.category?.toLowerCase().includes("casa") ||
        Boolean(item?.real_estate_details) ||
        Boolean(item?.classification_metadata?.real_estate) ||
        Boolean((item?.specifications as any)?.total_area || (item?.specifications as any)?.bedrooms || (item?.specifications as any)?.operation_type)
    )

    const mortgageComputation = useMemo(() => {
        if (!item || item.base_price <= 0) return null
        const price = item.base_price
        const downPayment = price * (downPaymentPercent / 100)
        const loanAmount = Math.max(0, price - downPayment)
        const monthlyRate = (annualInterestRate / 100) / 12
        const totalMonths = loanTermYears * 12
        let monthlyPayment = 0
        if (monthlyRate > 0 && totalMonths > 0) {
            monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
        } else if (totalMonths > 0) {
            monthlyPayment = loanAmount / totalMonths
        }
        return {
            downPayment,
            loanAmount,
            monthlyPayment: Math.round(monthlyPayment),
            formattedDownPayment: `$${Math.round(downPayment).toLocaleString("es-CO")}`,
            formattedLoanAmount: `$${Math.round(loanAmount).toLocaleString("es-CO")}`,
            formattedMonthlyPayment: `$${Math.round(monthlyPayment).toLocaleString("es-CO")}`,
        }
    }, [item, downPaymentPercent, loanTermYears, annualInterestRate])

    // 3. Initialize state when item changes or modal opens
    useEffect(() => {
        if (!item || !isOpen) return

        // Set initial quantity
        setQuantity(1)

        // Find initial variant
        let initialVar: CatalogVariant | null = null
        if (item.variants && item.variants.length > 0) {
            if (initialVariantId) {
                initialVar = item.variants.find(v => v.id === initialVariantId || v.sku === initialVariantId) || null
            }
            if (!initialVar) {
                initialVar = item.variants.find(v => v.is_default) || item.variants[0] || null
            }
        }

        setSelectedVariant(initialVar)

        // Map initial attributes
        if (initialVar && initialVar.attributes) {
            const attrMap: Record<string, string> = {}
            for (const [k, v] of Object.entries(initialVar.attributes)) {
                attrMap[k] = typeof v === "object" ? (v as any).value : String(v)
            }
            setSelectedAttributes(attrMap)
        } else {
            setSelectedAttributes({})
        }

        // Initialize addons
        const initAddons: SelectedAddon[] = []
        if (item.addon_groups && item.addon_groups.length > 0) {
            for (const group of item.addon_groups) {
                for (const opt of group.options) {
                    const isExplicit = initialAddonIds?.includes(opt.id)
                    const isDefault = opt.is_default
                    if (isExplicit || isDefault) {
                        initAddons.push({
                            groupId: group.id,
                            optionId: opt.id,
                            name: opt.name,
                            priceDelta: Number(opt.price_delta || opt.price || 0),
                            quantity: 1,
                            skuSuffix: opt.sku_suffix
                        })
                    }
                }
            }
        }
        setSelectedAddons(initAddons)
    }, [item, isOpen, initialVariantId, initialAddonIds])

    // 4. Handle attribute change & update variant
    const handleAttributeChange = useCallback((attrName: string, optionVal: string) => {
        if (!item) return
        const updated = { ...selectedAttributes, [attrName]: optionVal }
        setSelectedAttributes(updated)

        // Find exact matching variant
        if (item.variants && item.variants.length > 0) {
            const matched = item.variants.find(v => {
                if (v.is_active === false) return false
                for (const [k, val] of Object.entries(updated)) {
                    const vVal = typeof v.attributes[k] === "object"
                        ? (v.attributes[k] as any)?.value
                        : v.attributes[k]
                    if (vVal && vVal !== val) return false
                }
                return true
            })
            setSelectedVariant(matched || null)
        }
    }, [item, selectedAttributes])

    // 5. URL Deep Linking Synchronization
    useEffect(() => {
        if (typeof window === "undefined" || !item) return

        if (isOpen) {
            const url = new URL(window.location.href)
            const currentItemParam = url.searchParams.get("item")

            if (currentItemParam !== item.id) {
                url.searchParams.set("item", item.id)
                if (selectedVariant?.id) {
                    url.searchParams.set("variant", selectedVariant.id)
                }
                if (selectedAddons.length > 0) {
                    url.searchParams.set("addons", selectedAddons.map(a => a.optionId).join(","))
                }
                window.history.pushState({ modalOpen: true, itemId: item.id }, "", url.toString())
            } else {
                // Replace state for variant / addons change
                if (selectedVariant?.id) {
                    url.searchParams.set("variant", selectedVariant.id)
                } else {
                    url.searchParams.delete("variant")
                }
                if (selectedAddons.length > 0) {
                    url.searchParams.set("addons", selectedAddons.map(a => a.optionId).join(","))
                } else {
                    url.searchParams.delete("addons")
                }
                window.history.replaceState({ modalOpen: true, itemId: item.id }, "", url.toString())
            }
        }
    }, [isOpen, item, selectedVariant, selectedAddons])

    // Handle PopState (Back / Forward button)
    useEffect(() => {
        if (typeof window === "undefined") return

        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search)
            const itemId = params.get("item")
            if (!itemId && isOpen) {
                onClose()
            }
        }

        window.addEventListener("popstate", handlePopState)
        return () => window.removeEventListener("popstate", handlePopState)
    }, [isOpen, onClose])

    // Clean URL params on modal close
    const handleClose = () => {
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href)
            if (url.searchParams.has("item")) {
                url.searchParams.delete("item")
                url.searchParams.delete("variant")
                url.searchParams.delete("addons")
                url.searchParams.delete("qty")
                window.history.replaceState({}, "", url.toString())
            }
        }
        onClose()
    }

    // 6. Pricing and Badges Engine
    const pricing = useMemo(() => {
        if (!item) {
            return {
                basePrice: 0,
                variantDelta: 0,
                variantUnitPrice: 0,
                addonsTotal: 0,
                unitPrice: 0,
                bundleTotalPrice: 0,
                formattedUnitPrice: "$0",
                formattedTotalPrice: "$0"
            }
        }
        return calculateStorefrontPricing(item, selectedVariant, selectedAddons, quantity, currency)
    }, [item, selectedVariant, selectedAddons, quantity, currency])

    const badgesList = useMemo(() => {
        if (!item) return []
        return evaluateDynamicBadges(item, selectedVariant)
    }, [item, selectedVariant])

    if (!item) return null

    // Stock resolution
    const trackInventory = Boolean(
        selectedVariant?.track_inventory ??
        selectedVariant?.track_stock ??
        item.track_inventory ??
        item.track_stock ??
        false
    )

    const allowBackorders = Boolean(
        selectedVariant?.allow_backorders ??
        item.allow_backorders ??
        false
    )

    const rawStock =
        selectedVariant?.stock_quantity ??
        selectedVariant?.inventory_quantity ??
        item.stock_quantity ??
        item.inventory_quantity ??
        null

    const effectiveStock = rawStock !== null ? Number(rawStock) : null
    const isOutOfStock = isOutOfStockGuard(effectiveStock, trackInventory, allowBackorders)
    const isLowStock = !isOutOfStock && effectiveStock !== null && effectiveStock > 0 && effectiveStock <= (item.low_stock_threshold || 5)

    // Current deep link URL
    const currentDeepLink = typeof window !== "undefined" ? window.location.href : ""

    const handleAddToCartModal = () => {
        if (isOutOfStock) return
        const payload: StorefrontActionPayload = {
            actionType: "cart",
            itemId: item.id,
            variantId: selectedVariant?.id || null,
            selectedVariant: selectedVariant || null,
            selectedAddons: selectedAddons.map(a => ({
                groupId: a.groupId,
                optionId: a.optionId,
                name: a.name,
                priceDelta: a.priceDelta,
                quantity: a.quantity || 1
            })),
            calculatedTotalPrice: pricing.bundleTotalPrice,
            quantity,
            deepLinkUrl: currentDeepLink,
            portalToken: portalToken || null,
            organizationId: organizationId || item.organization_id || null,
            currency: currency || "COP"
        }

        if (onAddToCart) {
            onAddToCart(payload)
        } else {
            const cover = item.gallery_images?.[0]?.url || item.image_url || null
            useStorefrontCart.getState().addItem({
                catalog_item_id: item.id,
                itemId: item.id,
                name: item.name,
                category: item.category,
                classification: item.classification,
                thumbnail_url: cover,
                base_price: item.base_price,
                quantity,
                selected_variant: selectedVariant ? {
                    id: selectedVariant.id,
                    name: selectedVariant.title || selectedVariant.name || "Variante",
                    title: selectedVariant.title || selectedVariant.name || "Variante",
                    sku: selectedVariant.sku || null,
                    barcode: selectedVariant.barcode || null,
                    price_override: selectedVariant.price_override ?? null,
                    price_modifier: selectedVariant.price_modifier ?? 0,
                    price_type: selectedVariant.price_type,
                    attributes: selectedVariant.attributes || {}
                } : null,
                selectedVariant,
                selected_addons: selectedAddons.map(a => ({
                    id: a.optionId,
                    name: a.name,
                    price: a.priceDelta,
                    priceDelta: a.priceDelta,
                    groupId: a.groupId,
                    optionId: a.optionId,
                    quantity: a.quantity || 1,
                })),
                selectedAddons,
                deepLinkUrl: currentDeepLink,
                track_inventory: trackInventory,
                stock_quantity: effectiveStock,
                allow_backorders: allowBackorders,
                organization_id: organizationId || item.organization_id,
            })
            useStorefrontCart.getState().setDrawerOpen(true)
        }
        handleClose()
    }

    // --------------------------------------------------------------------------
    // SHARED CONTENT INTERIOR (Information Column)
    // --------------------------------------------------------------------------
    const renderModalBody = () => (
        <div className="flex flex-col gap-5 p-4 sm:p-6 text-zinc-900 dark:text-zinc-100 overflow-y-auto">
            {/* Header: Title, Badges, SKU, and Dynamic Price */}
            <div>
                {/* Badges Ribbon (Hidden for Real Estate) */}
                {!isRealEstate && badgesList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {badgesList.map((badgeStr, i) => (
                            <StatusBadge key={i} type={badgeStr} label={badgeStr} />
                        ))}
                    </div>
                )}

                {/* Item Name */}
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
                    {item.name}
                </h1>

                {/* Subtitle / Category / SKU (Hidden for Real Estate to prevent redundant categories & internal SKU exposure) */}
                {!isRealEstate && (
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                        <span className="uppercase tracking-wider font-semibold">{item.category}</span>
                        {(selectedVariant?.sku || item.sku) && (
                            <>
                                <span>•</span>
                                <span>SKU: {selectedVariant?.sku || item.sku}</span>
                            </>
                        )}
                    </div>
                )}

                {/* Price Display Recalculator */}
                <div className="mt-3.5 flex items-baseline gap-3 flex-wrap" aria-live="polite">
                    <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                        {pricing.formattedTotalPrice}
                    </span>

                    {/* Price per square meter indicator for Real Estate */}
                    {isRealEstate && (() => {
                        const re = item.real_estate_details || item.classification_metadata?.real_estate
                        const area = Number(re?.area_total_m2) || 0
                        if (area > 0 && item.base_price > 0) {
                            const ppm2 = Math.round(item.base_price / area)
                            return (
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900">
                                    ${ppm2.toLocaleString("es-CO")} / m²
                                </span>
                            )
                        }
                        return null
                    })()}

                    {pricing.compareAtUnitPrice && pricing.compareAtUnitPrice > pricing.unitPrice && (
                        <span className="text-sm font-semibold text-zinc-400 line-through">
                            {pricing.formattedCompareAt}
                        </span>
                    )}

                    {pricing.savingsPercentage && pricing.savingsPercentage > 0 && (
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                            Ahorras {pricing.savingsPercentage}%
                        </span>
                    )}
                </div>

                {/* Stock & Availability Indicator Box (For physical goods tracking inventory) */}
                {!isRealEstate && trackInventory ? (
                    isOutOfStock ? (
                        <div className="mt-2.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shrink-0" />
                            <span>🚫 Agotado temporalmente {selectedVariant ? `(${selectedVariant.name})` : "(Sin existencias)"}</span>
                        </div>
                    ) : effectiveStock !== null && effectiveStock <= 0 && allowBackorders ? (
                        <div className="mt-2.5 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-900 text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shrink-0" />
                            <span>📦 Disponible bajo pedido (Envío programado)</span>
                        </div>
                    ) : isLowStock ? (
                        <div className="mt-2.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2 animate-pulse">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                            <span>⚠️ ¡Pocas unidades disponibles! (Solo quedan {effectiveStock} unidades en stock)</span>
                        </div>
                    ) : (
                        <div className="mt-2.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>✓ {effectiveStock !== null ? `${effectiveStock} unidades disponibles en stock` : "En stock para entrega inmediata"}</span>
                        </div>
                    )
                ) : !isRealEstate ? (
                    <div className="mt-2.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Disponible para contratación inmediata</span>
                    </div>
                ) : null}
            </div>

            {/* Real Estate Specifications & Ficha Técnica */}
            {isRealEstate && (() => {
                const re = item.real_estate_details || item.classification_metadata?.real_estate || item.metadata?.real_estate_details || {}
                const op = re.operation_type || (item.specifications as any)?.operation_type || "sale"
                const opLabel = op === "rent" ? "En Arriendo" : op === "temporary_rent" ? "Arriendo Temporal" : "En Venta"
                const propType = re.property_type || (item.specifications as any)?.property_type || "apartment"
                const typeLabel =
                    propType === "apartment" ? "Apartamento" :
                    propType === "house" ? "Casa" :
                    propType === "studio" ? "Apartaestudio" :
                    propType === "office" ? "Oficina" :
                    propType === "commercial" ? "Local Comercial" :
                    propType === "warehouse" ? "Bodega" :
                    propType === "land" ? "Lote / Terreno" :
                    propType === "country_house" ? "Finca / Casa Campestre" :
                    propType === "medical_office" ? "Consultorio" :
                    propType === "building" ? "Edificio" : "Inmueble"

                return (
                    <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 space-y-4">
                        {/* Operation and Property Type Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                            {(() => {
                                const isRent = op === "rent"
                                const isTemp = op === "temporary_rent"
                                const OpIcon = isRent ? Key : isTemp ? CalendarRange : Tag
                                return (
                                    <span className={cn(
                                        "px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5",
                                        isRent
                                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                            : isTemp
                                            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    )}>
                                        <OpIcon className="h-3 w-3" />
                                        <span>{opLabel}</span>
                                    </span>
                                )
                            })()}
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                                <span>{typeLabel}</span>
                            </span>
                        </div>

                        {/* Interactive Infinite Horizontal Scroll Spec Ticker */}
                        <RealEstateMetricsTicker details={re} item={item} />

                        {/* Location Banner */}
                        {(re.city || re.neighborhood) && (
                            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                                    <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>
                                        {re.neighborhood ? `${re.neighborhood}, ` : ""}
                                        {re.city || ""}
                                        {!re.hide_exact_address && re.address ? ` • ${re.address}` : ""}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full shrink-0">
                                    ✓ Ubicación Verificada
                                </span>
                            </div>
                        )}

                        {/* Áreas Comunes (Spanish: "Áreas Comunes") */}
                        {Array.isArray(re.common_areas) && re.common_areas.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                    <Trees className="h-3.5 w-3.5 text-emerald-600" />
                                    Áreas Comunes ({re.common_areas.length})
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {re.common_areas.map((area: string, idx: number) => (
                                        <span
                                            key={idx}
                                            className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 flex items-center gap-1"
                                        >
                                            <Check className="h-3 w-3 text-emerald-600" />
                                            {area}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Interactive Mortgage Calculator for Sale Properties (Only when enabled in widget config and property is for sale) */}
                        {themeConfig?.widget_config?.show_mortgage_calculator !== false &&
                         re.show_mortgage_calculator !== false &&
                         (op === "sale" || op === "venta" || !op || re.show_mortgage_calculator === true) &&
                         item.base_price > 0 &&
                         mortgageComputation && (
                            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setIsMortgageCalcOpen(!isMortgageCalcOpen)}
                                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                                        <Calculator className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span>Simulador de Crédito Hipotecario</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isMortgageCalcOpen && (
                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                ~{mortgageComputation.formattedMonthlyPayment}/mes
                                            </span>
                                        )}
                                        {isMortgageCalcOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                                    </div>
                                </button>

                                {isMortgageCalcOpen && (
                                    <div className="p-4 pt-1 border-t border-zinc-200/60 dark:border-zinc-800 space-y-3.5 text-xs">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Cuota Inicial ({downPaymentPercent}%)</label>
                                                <input
                                                    type="range"
                                                    min={10}
                                                    max={60}
                                                    step={5}
                                                    value={downPaymentPercent}
                                                    onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                                                    className="w-full accent-emerald-600 cursor-pointer"
                                                />
                                                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">{mortgageComputation.formattedDownPayment}</span>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Plazo ({loanTermYears} años)</label>
                                                <input
                                                    type="range"
                                                    min={5}
                                                    max={30}
                                                    step={5}
                                                    value={loanTermYears}
                                                    onChange={(e) => setLoanTermYears(Number(e.target.value))}
                                                    className="w-full accent-emerald-600 cursor-pointer"
                                                />
                                                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">{loanTermYears * 12} meses</span>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Tasa E.A. ({annualInterestRate}%)</label>
                                                <input
                                                    type="range"
                                                    min={8}
                                                    max={18}
                                                    step={0.5}
                                                    value={annualInterestRate}
                                                    onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
                                                    className="w-full accent-emerald-600 cursor-pointer"
                                                />
                                                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">{annualInterestRate}% anual</span>
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">Cuota Mensual Estimada</span>
                                                <span className="text-base font-black text-emerald-700 dark:text-emerald-300">{mortgageComputation.formattedMonthlyPayment} COP / mes</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 sm:text-right max-w-[160px] leading-tight">
                                                Monto financiado: {mortgageComputation.formattedLoanAmount}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Multimedia Actions: 360 Tour & PDF Brochure */}
                        {(re.virtual_tour_url || re.brochure_pdf_url) && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {re.virtual_tour_url && (
                                    <a
                                        href={re.virtual_tour_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 min-w-[200px] h-9 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <Video className="h-3.5 w-3.5" />
                                        <span>Ver Recorrido Virtual 360°</span>
                                        <ExternalLink className="h-3 w-3 opacity-70" />
                                    </a>
                                )}
                                {re.brochure_pdf_url && (
                                    <a
                                        href={re.brochure_pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 min-w-[200px] h-9 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        <span>Descargar Ficha Técnica PDF</span>
                                        <ExternalLink className="h-3 w-3 opacity-70" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* Visual Variant Selector */}
            {item.has_variants && (
                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                    <VariantSelector
                        item={item}
                        selectedVariant={selectedVariant}
                        selectedAttributes={selectedAttributes}
                        onAttributeChange={handleAttributeChange}
                        disabled={isOutOfStock}
                    />
                </div>
            )}

            {/* Dynamic Add-on Selector */}
            {item.addon_groups && item.addon_groups.length > 0 && (
                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                        Personalizaciones & Adicionales
                    </h3>
                    <AddonSelector
                        groups={item.addon_groups}
                        selectedAddons={selectedAddons}
                        onAddonsChange={(addons) => setSelectedAddons(addons)}
                        currency={currency}
                        disabled={isOutOfStock}
                    />
                </div>
            )}

            {/* Quantity Selector (Hidden for Real Estate) */}
            {!isRealEstate && (
                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Cantidad:
                    </span>
                    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            disabled={quantity <= 1 || isOutOfStock}
                        >
                            <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs font-bold px-2 min-w-[24px] text-center">
                            {quantity}
                        </span>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => setQuantity(q => q + 1)}
                            disabled={isOutOfStock || (effectiveStock !== null && quantity >= effectiveStock)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Action Hub Buttons */}
            <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800">
                <ActionHubButtons
                    item={item}
                    selectedVariant={selectedVariant}
                    selectedAddons={selectedAddons}
                    quantity={quantity}
                    calculatedTotalPrice={pricing.bundleTotalPrice}
                    currency={currency}
                    portalToken={portalToken}
                    organizationId={organizationId}
                    themeConfig={themeConfig}
                    deepLinkUrl={currentDeepLink}
                    isOutOfStock={isOutOfStock}
                    onAddToCart={handleAddToCartModal}
                    onRequestQuote={onRequestQuote}
                    onWompiCheckout={onWompiCheckout}
                />
            </div>

            {/* Industry-Adaptive Specification Tabs */}
            <div className="pt-4 border-t border-zinc-200/60 dark:border-zinc-800">
                <SpecificationTabs item={item} />
            </div>
        </div>
    )

    // --------------------------------------------------------------------------
    // 1. DESKTOP VIEWPORT: RADIX DIALOG MODAL (2-Column Grid)
    // --------------------------------------------------------------------------
    if (isDesktop) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className={cn(
                    "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-5xl max-h-[92vh] backdrop-blur-2xl border shadow-2xl rounded-3xl overflow-hidden p-0 flex flex-col focus:outline-none",
                    isDarkTheme
                        ? "dark bg-[#09090b]/95 border-zinc-800 text-zinc-100"
                        : "bg-white/95 border-zinc-200 text-zinc-900",
                    isDarkTheme && "dark"
                )}>
                    <VisuallyHidden.Root>
                        <DialogTitle>{item.name} - Detalle de Producto</DialogTitle>
                        <DialogDescription>{item.description || "Detalles completos y opciones de personalización"}</DialogDescription>
                    </VisuallyHidden.Root>

                    {/* Modal Close Button */}
                    <button
                        type="button"
                        onClick={handleClose}
                        className={cn(
                            "absolute right-4 top-4 z-50 p-2.5 rounded-full transition-all shadow-sm cursor-pointer",
                            isDarkTheme
                                ? "bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60"
                                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200"
                        )}
                        aria-label="Cerrar modal de producto"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {/* 2-Column Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-hidden">
                        {/* LEFT COLUMN: Gallery Carousel */}
                        <div className={cn(
                            "p-6 flex flex-col justify-start border-r overflow-y-auto",
                            isDarkTheme
                                ? "bg-zinc-950/60 border-zinc-800/80"
                                : "bg-zinc-50/50 border-zinc-200/50"
                        )}>
                            <GalleryCarousel
                                images={item.gallery_images}
                                coverImage={item.image_url}
                                videoUrl={item.video_url}
                                threeSixtyFrames={item.metadata?.three_sixty_images}
                                selectedVariantImageUrl={selectedVariant?.image_url}
                                itemName={item.name}
                                badges={badgesList}
                                discountPercent={pricing.savingsPercentage}
                                aspectRatio="square"
                            />
                        </div>

                        {/* RIGHT COLUMN: Interactive Details & Actions */}
                        <div className="flex-1 overflow-y-auto max-h-[92vh]">
                            {renderModalBody()}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    // --------------------------------------------------------------------------
    // 2. MOBILE VIEWPORT: VAUL BOTTOM DRAWER
    // --------------------------------------------------------------------------
    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DrawerContent className={cn(
                "fixed inset-x-0 bottom-0 z-50 max-h-[92vh] flex flex-col rounded-t-[28px] border-t shadow-2xl overflow-hidden focus:outline-none",
                isDarkTheme
                    ? "dark bg-[#09090b] border-zinc-800 text-zinc-100"
                    : "bg-white border-zinc-200 text-zinc-900",
                isDarkTheme && "dark"
            )}>
                <VisuallyHidden.Root>
                    <DrawerTitle>{item.name} - Detalle de Producto</DrawerTitle>
                    <DrawerDescription>{item.description || "Detalles completos de producto"}</DrawerDescription>
                </VisuallyHidden.Root>

                {/* Top Drag Handle Bar */}
                <div className={cn(
                    "mx-auto mt-3 h-1.5 w-12 rounded-full shrink-0",
                    isDarkTheme ? "bg-zinc-700" : "bg-zinc-300"
                )} />

                {/* Scrollable Column */}
                <div className="flex-1 overflow-y-auto pb-28">
                    {/* Carousel on Mobile */}
                    <div className={cn(
                        "p-4",
                        isDarkTheme ? "bg-zinc-950/60" : "bg-zinc-50/50"
                    )}>
                        <GalleryCarousel
                            images={item.gallery_images}
                            coverImage={item.image_url}
                            videoUrl={item.video_url}
                            threeSixtyFrames={item.metadata?.three_sixty_images}
                            selectedVariantImageUrl={selectedVariant?.image_url}
                            itemName={item.name}
                            badges={badgesList}
                            discountPercent={pricing.savingsPercentage}
                            aspectRatio="portrait"
                        />
                    </div>

                    {/* Details and selectors */}
                    {renderModalBody()}
                </div>

                {/* Sticky Bottom Action Bar on Mobile */}
                <div className={cn(
                    "fixed bottom-0 inset-x-0 p-4 backdrop-blur-xl border-t flex items-center justify-between gap-4 z-50 pb-[calc(1rem+env(safe-area-inset-bottom))]",
                    isDarkTheme
                        ? "bg-[#09090b]/95 border-zinc-800 text-zinc-100"
                        : "bg-white/95 border-zinc-200 text-zinc-900"
                )}>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-zinc-400">Total:</span>
                        <span className="text-lg font-black text-zinc-900 dark:text-white">
                            {pricing.formattedTotalPrice}
                        </span>
                    </div>

                    <div className="flex-1">
                        {isRealEstate ? (
                            <Button
                                type="button"
                                onClick={() => {
                                    handleClose()
                                    const cleanPhone = (settings?.whatsapp_number || "573000000000").replace(/\D/g, "")
                                    const text = `Hola, estoy interesado en el inmueble: *${item.name}* (Precio: ${pricing.formattedTotalPrice}). ¿Podrían brindarme más información y agendar una visita?\n\n${currentDeepLink}`
                                    window.open(`https://wa.me/${cleanPhone || "573000000000"}?text=${encodeURIComponent(text)}`, "_blank")
                                }}
                                className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/25 text-xs flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="h-4 w-4" />
                                <span>Agendar Visita / WhatsApp</span>
                            </Button>
                        ) : item.classification === "service" ? (
                            <Button
                                type="button"
                                onClick={() => {
                                    if (onRequestQuote) {
                                        onRequestQuote({
                                            actionType: "quote",
                                            itemId: item.id,
                                            variantId: selectedVariant?.id || null,
                                            selectedVariant: selectedVariant || null,
                                            selectedAddons: selectedAddons.map(a => ({
                                                groupId: a.groupId,
                                                optionId: a.optionId,
                                                name: a.name,
                                                priceDelta: a.priceDelta,
                                                quantity: a.quantity || 1
                                            })),
                                            calculatedTotalPrice: pricing.bundleTotalPrice,
                                            quantity,
                                            deepLinkUrl: currentDeepLink,
                                            portalToken: portalToken || null,
                                            organizationId: organizationId || item.organization_id || null,
                                            currency: currency || "COP"
                                        })
                                        handleClose()
                                    } else {
                                        handleAddToCartModal()
                                    }
                                }}
                                className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 text-xs flex items-center justify-center gap-2"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                <span>Solicitar Cotización</span>
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                disabled={isOutOfStock}
                                onClick={handleAddToCartModal}
                                className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 text-xs flex items-center justify-center gap-2"
                            >
                                <ShoppingCart className="h-4 w-4" />
                                <span>{isOutOfStock ? "Agotado" : "Añadir al Carrito"}</span>
                            </Button>
                        )}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    )
}


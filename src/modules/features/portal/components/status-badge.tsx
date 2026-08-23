"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/modules/infrastructure/utils/utils"
import {
    Sparkles,
    Flame,
    AlertTriangle,
    Clock,
    CheckCircle2,
    TrendingDown,
    Tag,
    XCircle,
    Package
} from "lucide-react"
import { CatalogVariant, UniversalCatalogItem } from "@/types/catalog"

export type StorefrontBadgeType =
    | "in_stock"
    | "low_stock"
    | "sold_out"
    | "out_of_stock"
    | "pre_order"
    | "preorder"
    | "backorder"
    | "new"
    | "novedad"
    | "featured"
    | "destacado"
    | "discount"
    | "custom"

export interface StorefrontStatusBadgeProps {
    type?: StorefrontBadgeType | string
    label?: string
    stockQuantity?: number | null
    discountPercentage?: number | null
    discountPercent?: number | null
    className?: string
    icon?: React.ReactNode
}

export type StatusBadgeProps = StorefrontStatusBadgeProps

export interface PriceBreakdownResult {
    basePrice: number
    variantDelta: number
    variantUnitPrice: number
    addonsTotal: number
    unitPrice: number
    bundleTotalPrice: number
    compareAtUnitPrice?: number | null
    savingsAmount?: number
    savingsPercentage?: number
    formattedUnitPrice: string
    formattedTotalPrice: string
    formattedCompareAt?: string
    formattedSavings?: string
}

export interface SelectedAddonSummary {
    name?: string
    priceDelta?: number
    price?: number
    quantity?: number
}

/**
 * Normalizes and formats COP currency with Colombian locale
 */
export function formatCOPCurrency(price: number): string {
    const integerCOP = Math.max(0, Math.round(price))
    return `$${integerCOP.toLocaleString('es-CO')} COP`
}

/**
 * Converts price in COP to Wompi cents (integer multiplied by 100)
 */
export function convertCOPToWompiCents(price: number): number {
    const integerCOP = Math.max(0, Math.round(price))
    return integerCOP * 100
}

/**
 * Helper to compute badge styling and icons
 */
export function getBadgeStyle(badgeName: string): { label: string; bgClass: string; icon: string } {
    if (badgeName === "Agotado" || badgeName.toLowerCase().includes("agotado") || badgeName === "Sold Out") {
        return { label: "Agotado", bgClass: "bg-zinc-700 text-zinc-200 dark:bg-zinc-800 dark:text-zinc-400", icon: "XCircle" }
    }
    if (badgeName === "Disponible bajo pedido" || badgeName.toLowerCase().includes("bajo pedido") || badgeName === "Bajo Pedido") {
        return { label: "Disponible bajo pedido", bgClass: "bg-gradient-to-r from-sky-600 to-blue-600 text-white", icon: "Package" }
    }
    if (badgeName.startsWith("¡Últimas") || badgeName.startsWith("¡Solo quedan") || badgeName === "Pocas Unidades") {
        return { label: badgeName, bgClass: "bg-gradient-to-r from-rose-500 to-red-600 text-white animate-pulse shadow-rose-500/30", icon: "AlertTriangle" }
    }
    switch (badgeName) {
        case "Destacado":
            return { label: "Destacado", bgClass: "bg-amber-500 text-white", icon: "Sparkles" }
        case "Novedad":
            return { label: "Novedad", bgClass: "bg-emerald-500 text-white", icon: "Flame" }
        case "Pocas Unidades":
            return { label: "Pocas Unidades", bgClass: "bg-rose-500 text-white", icon: "AlertTriangle" }
        default:
            return { label: badgeName, bgClass: "bg-primary text-primary-foreground", icon: "Tag" }
    }
}

/**
 * Evaluates whether an item was created within the last 30 days
 */
export function isNewItem(createdAtIso: string, referenceDateIso: string = new Date().toISOString()): boolean {
    if (!createdAtIso) return false
    const created = new Date(createdAtIso).getTime()
    const reference = new Date(referenceDateIso).getTime()
    if (isNaN(created) || isNaN(reference)) return false
    const diffDays = (reference - created) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 30
}

/**
 * Determines whether the low stock badge should be triggered
 */
export function shouldShowLowStockBadge(
    inventoryQuantity: number,
    lowStockThreshold: number,
    trackInventory: boolean
): boolean {
    if (!trackInventory) return false
    return inventoryQuantity > 0 && inventoryQuantity <= lowStockThreshold
}

/**
 * Determines whether an item or variant is completely out of stock and cannot be purchased
 */
export function isOutOfStockGuard(
    stockQuantity: number | null | undefined,
    trackInventory: boolean | undefined,
    allowBackorders: boolean | undefined
): boolean {
    if (!trackInventory) return false
    const qty = Number(stockQuantity ?? 0)
    return qty <= 0 && !allowBackorders
}

/**
 * Calculates discount badge text based on base and compare-at prices
 */
export function calculateDiscountBadge(basePrice: number, compareAtPrice?: number): string | null {
    if (!compareAtPrice || compareAtPrice <= basePrice) return null
    const discountPercent = Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100)
    return `-${discountPercent}%`
}

/**
 * Enforces maximum badge display limit for clean visual UI
 */
export function getDisplayedBadges(allBadges: string[], maxLimit: number = 3): string[] {
    return (allBadges || []).slice(0, maxLimit)
}

/**
 * Evaluates dynamic badges array based on item properties and inventory state
 */
export function evaluateDynamicBadges(
    item: UniversalCatalogItem | {
        base_price: number;
        compare_at_price?: number | null;
        created_at?: string | null;
        badges?: any[];
        track_inventory?: boolean;
        track_stock?: boolean;
        inventory_quantity?: number | null;
        stock_quantity?: number | null;
        low_stock_threshold?: number;
        allow_backorders?: boolean;
    },
    selectedVariant?: CatalogVariant | null
): string[] {
    const evaluated: string[] = []

    // Inventory attributes
    const trackInventory = Boolean(
        selectedVariant?.track_inventory ??
        selectedVariant?.track_stock ??
        item.track_inventory ??
        (item as any).track_stock ??
        false
    )

    const rawStock =
        selectedVariant?.stock_quantity ??
        selectedVariant?.inventory_quantity ??
        item.stock_quantity ??
        item.inventory_quantity ??
        0

    const stockQty = Number(rawStock ?? 0)
    const allowBackorders = Boolean(
        selectedVariant?.allow_backorders ??
        item.allow_backorders ??
        false
    )
    const threshold = Number(
        selectedVariant?.low_stock_threshold ??
        item.low_stock_threshold ??
        5
    )

    // 1. Strict Stock Badges
    if (trackInventory) {
        if (stockQty <= 0 && !allowBackorders) {
            evaluated.push("Agotado")
        } else if (stockQty > 0 && stockQty <= threshold) {
            evaluated.push(`¡Últimas ${stockQty} unidades!`)
        } else if (allowBackorders && stockQty <= 0) {
            evaluated.push("Disponible bajo pedido")
        }
    } else if (allowBackorders) {
        evaluated.push("Disponible bajo pedido")
    }

    // 2. Explicit badges from item (manual user configuration)
    if (Array.isArray(item.badges)) {
        for (const b of item.badges) {
            if (typeof b === "string" && b.trim()) {
                const clean = b.trim()
                // Prevent duplicate discount text if saved from previous version
                if (!clean.toLowerCase().startsWith("descuento") && !clean.toLowerCase().includes("% off")) {
                    evaluated.push(clean)
                }
            } else if (b && typeof b === "object" && (b as any).label) {
                const clean = String((b as any).label).trim()
                if (!clean.toLowerCase().startsWith("descuento") && !clean.toLowerCase().includes("% off")) {
                    evaluated.push(clean)
                }
            }
        }
    }

    // Return deduplicated list strictly respecting user settings
    return Array.from(new Set(evaluated))
}

/**
 * Comprehensive pricing engine: variant overrides, modifiers, add-on totals, quantity, discounts, and currency formatting
 */
export function calculateStorefrontPricing(
    item: UniversalCatalogItem | { base_price: number; compare_at_price?: number | null },
    selectedVariant: CatalogVariant | null | undefined,
    selectedAddons: SelectedAddonSummary[] | null | undefined,
    quantity: number = 1,
    currency: string = "COP"
): PriceBreakdownResult {
    const basePrice = Number(item.base_price || 0)
    let variantDelta = 0

    if (selectedVariant) {
        if (selectedVariant.price_override !== undefined && selectedVariant.price_override !== null && selectedVariant.price_override >= 0) {
            variantDelta = selectedVariant.price_override - basePrice
        } else if (selectedVariant.price_type === 'fixed' || selectedVariant.price_modifier_type === 'fixed' || selectedVariant.price_type === 'absolute') {
            variantDelta = Number(selectedVariant.price_modifier || 0) - basePrice
        } else if (selectedVariant.price_type === 'percentage' || selectedVariant.price_modifier_type === 'percentage' || selectedVariant.price_type === 'offset_percentage') {
            variantDelta = (basePrice * Number(selectedVariant.price_modifier || 0)) / 100
        } else {
            // Offset / default
            variantDelta = Number(selectedVariant.price_modifier || 0)
        }
    }

    const variantUnitPrice = Math.max(0, basePrice + variantDelta)
    const addonsTotal = (selectedAddons || []).reduce((acc, a) => {
        const delta = Number(a.priceDelta ?? a.price ?? 0)
        const qty = Number(a.quantity ?? 1)
        return acc + (delta * qty)
    }, 0)

    const unitPrice = Math.max(0, variantUnitPrice + addonsTotal)
    const safeQuantity = Math.max(1, quantity)
    const bundleTotalPrice = Math.max(0, unitPrice * safeQuantity)

    const compareAt = item.compare_at_price ? Number(item.compare_at_price) : null
    let savingsAmount: number | undefined
    let savingsPercentage: number | undefined

    if (compareAt && compareAt > unitPrice) {
        savingsAmount = (compareAt - unitPrice) * safeQuantity
        savingsPercentage = Math.round(((compareAt - unitPrice) / compareAt) * 100)
    }

    const formatFn = (amt: number) => {
        if (currency === "USD") {
            return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amt)
        }
        if (currency === "EUR") {
            return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(amt)
        }
        return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amt)
    }

    return {
        basePrice,
        variantDelta,
        variantUnitPrice,
        addonsTotal,
        unitPrice,
        bundleTotalPrice,
        compareAtUnitPrice: compareAt,
        savingsAmount,
        savingsPercentage,
        formattedUnitPrice: formatFn(unitPrice),
        formattedTotalPrice: formatFn(bundleTotalPrice),
        formattedCompareAt: compareAt ? formatFn(compareAt * safeQuantity) : undefined,
        formattedSavings: savingsAmount ? formatFn(savingsAmount) : undefined,
    }
}

/**
 * Calculates raw effective total price with zero-floor protection
 */
export function calculateEffectiveTotalPrice(
    item: { base_price: number },
    selectedVariant?: CatalogVariant | null,
    selectedAddons?: SelectedAddonSummary[] | null,
    quantity: number = 1
): number {
    const result = calculateStorefrontPricing(item, selectedVariant, selectedAddons, quantity)
    return result.bundleTotalPrice
}

/**
 * Calculates item price with variant modifiers, add-on totals, quantity, and floor protection
 */
export function calculateCatalogItemPrice(
    basePriceOrItem: number | { base_price: number },
    variant?: CatalogVariant | null,
    selectedAddons?: Array<{ priceDelta?: number; price_delta?: number; price?: number; name?: string; quantity?: number }> | null,
    quantity: number = 1
): number {
    const base = typeof basePriceOrItem === "number" ? { base_price: basePriceOrItem } : basePriceOrItem
    const normalizedAddons: SelectedAddonSummary[] = (selectedAddons || []).map(a => ({
        name: a.name,
        priceDelta: a.priceDelta ?? a.price_delta ?? a.price ?? 0,
        quantity: a.quantity ?? 1
    }))
    return calculateEffectiveTotalPrice(base, variant, normalizedAddons, quantity)
}

/**
 * Visual Status Badge Component
 */
export function StatusBadge({
    type = "custom",
    label,
    stockQuantity,
    discountPercentage,
    discountPercent,
    className,
    icon
}: StorefrontStatusBadgeProps) {
    const effectiveDiscount = discountPercentage ?? discountPercent

    // Normalized badge type identification
    let normalizedType = (type || "").toLowerCase().replace(/[\s-]/g, "_")
    let displayLabel = label || ""
    let badgeClass = "bg-black/60 backdrop-blur-md border-white/15"
    let renderIcon = icon

    switch (normalizedType) {
        case "destacado":
        case "featured":
            displayLabel = displayLabel || "Destacado"
            badgeClass = "bg-black/60 backdrop-blur-md text-white border-white/15"
            renderIcon = renderIcon || <Sparkles className="h-3 w-3 mr-1 shrink-0 text-amber-400" />
            break

        case "novedad":
        case "new":
            displayLabel = displayLabel || "Novedad"
            badgeClass = "bg-black/60 backdrop-blur-md text-white border-white/15"
            renderIcon = renderIcon || <Flame className="h-3 w-3 mr-1 shrink-0 text-emerald-400" />
            break

        case "low_stock":
        case "pocas_unidades":
        case "ultimas_unidades":
            displayLabel = displayLabel || (stockQuantity !== undefined && stockQuantity !== null ? (stockQuantity === 1 ? "¡Última 1 unidad!" : `¡Últimas ${stockQuantity} unidades!`) : "Pocas Unidades")
            badgeClass = "bg-black/60 backdrop-blur-md text-white border-white/15"
            renderIcon = renderIcon || <AlertTriangle className="h-3 w-3 mr-1 shrink-0 text-rose-400" />
            break

        case "sold_out":
        case "out_of_stock":
        case "agotado":
            displayLabel = displayLabel || "Agotado"
            badgeClass = "bg-black/60 backdrop-blur-md text-white border-white/15"
            renderIcon = renderIcon || <XCircle className="h-3 w-3 mr-1 shrink-0 text-zinc-400" />
            break

        case "pre_order":
        case "preorder":
            displayLabel = displayLabel || "Pre-Orden"
            badgeClass = "bg-black/60 backdrop-blur-md text-white border-white/15"
            renderIcon = renderIcon || <Clock className="h-3 w-3 mr-1 shrink-0 text-purple-400" />
            break

        case "backorder":
        case "bajo_pedido":
        case "disponible_bajo_pedido":
            displayLabel = displayLabel || "Disponible bajo pedido"
            badgeClass = "bg-black/60 backdrop-blur-md text-white border-white/15"
            renderIcon = renderIcon || <Package className="h-3 w-3 mr-1 shrink-0 text-sky-400" />
            break

        case "discount":
        case "descuento":
        case "on_sale":
            displayLabel = displayLabel || (effectiveDiscount ? `-${effectiveDiscount}% OFF` : "Descuento")
            badgeClass = "bg-black/60 backdrop-blur-md text-white border-white/15"
            renderIcon = renderIcon || <TrendingDown className="h-3 w-3 mr-1 shrink-0 text-rose-400" />
            break

        case "in_stock":
        case "disponible":
            displayLabel = displayLabel || "En Stock"
            badgeClass = "bg-black/60 backdrop-blur-md text-white border-white/15"
            renderIcon = renderIcon || <CheckCircle2 className="h-3 w-3 mr-1 shrink-0 text-emerald-400" />
            break

        default:
            displayLabel = displayLabel || type || "Etiqueta"
            badgeClass = "bg-black/60 backdrop-blur-md text-white border-white/15"
            renderIcon = renderIcon || <Tag className="h-3 w-3 mr-1 shrink-0 opacity-80" />
            break
    }

    return (
        <Badge
            className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-sm backdrop-blur-md border border-white/15 transition-all text-white bg-black/60",
                badgeClass,
                className
            )}
        >
            {renderIcon}
            <span>{displayLabel}</span>
        </Badge>
    )
}

export const StorefrontStatusBadge = StatusBadge

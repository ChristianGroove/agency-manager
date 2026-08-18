"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
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
import { X, Plus, Minus, Shield, Sparkles, Check, Share2, ShoppingCart } from "lucide-react"
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

    // 2. Local selection states
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({})
    const [selectedVariant, setSelectedVariant] = useState<CatalogVariant | null>(null)
    const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([])
    const [quantity, setQuantity] = useState(1)

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
                {/* Badges Ribbon */}
                {badgesList.length > 0 && (
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

                {/* Subtitle / Category / SKU */}
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    <span className="uppercase tracking-wider font-semibold">{item.category}</span>
                    {(selectedVariant?.sku || item.sku) && (
                        <>
                            <span>•</span>
                            <span>SKU: {selectedVariant?.sku || item.sku}</span>
                        </>
                    )}
                </div>

                {/* Price Display Recalculator */}
                <div className="mt-3.5 flex items-baseline gap-3" aria-live="polite">
                    <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                        {pricing.formattedTotalPrice}
                    </span>

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

                {/* Stock & Availability Indicator Box */}
                {trackInventory ? (
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
                ) : (
                    <div className="mt-2.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Disponible para contratación inmediata</span>
                    </div>
                )}
            </div>

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

            {/* Quantity Selector */}
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
                <DialogContent className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[95vw] max-w-5xl max-h-[92vh] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-3xl overflow-hidden p-0 flex flex-col focus:outline-none">
                    <VisuallyHidden.Root>
                        <DialogTitle>{item.name} - Detalle de Producto</DialogTitle>
                        <DialogDescription>{item.description || "Detalles completos y opciones de personalización"}</DialogDescription>
                    </VisuallyHidden.Root>

                    {/* Modal Close Button */}
                    <button
                        type="button"
                        onClick={handleClose}
                        className="absolute right-4 top-4 z-50 p-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all shadow-sm"
                        aria-label="Cerrar modal de producto"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {/* 2-Column Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-hidden">
                        {/* LEFT COLUMN: Gallery Carousel */}
                        <div className="p-6 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col justify-start border-r border-zinc-200/50 dark:border-zinc-800 overflow-y-auto">
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
            <DrawerContent className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] flex flex-col rounded-t-[28px] border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden focus:outline-none">
                <VisuallyHidden.Root>
                    <DrawerTitle>{item.name} - Detalle de Producto</DrawerTitle>
                    <DrawerDescription>{item.description || "Detalles completos de producto"}</DrawerDescription>
                </VisuallyHidden.Root>

                {/* Top Drag Handle Bar */}
                <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0" />

                {/* Scrollable Column */}
                <div className="flex-1 overflow-y-auto pb-28">
                    {/* Carousel on Mobile */}
                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/30">
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
                <div className="fixed bottom-0 inset-x-0 p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 z-50 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-zinc-400">Total:</span>
                        <span className="text-lg font-black text-zinc-900 dark:text-white">
                            {pricing.formattedTotalPrice}
                        </span>
                    </div>

                    <div className="flex-1">
                        <Button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={handleAddToCartModal}
                            className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 text-xs flex items-center justify-center gap-2"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            <span>{isOutOfStock ? "Agotado" : "Añadir al Carrito"}</span>
                        </Button>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    )
}


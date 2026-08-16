"use client"

import React, { useMemo } from "react"
import {
    CatalogVariant,
    CatalogAttributeGroup,
    CatalogAttributeOption,
    UniversalCatalogItem
} from "@/types/catalog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/modules/infrastructure/utils/utils"
import { Check, Sparkles, AlertCircle, Ban } from "lucide-react"

export interface VariantSelectorProps {
    item?: UniversalCatalogItem
    variantAttributes?: CatalogAttributeGroup[]
    variants?: CatalogVariant[]
    selectedVariant?: CatalogVariant | null
    selectedAttributes: Record<string, string>
    onAttributeChange: (attributeName: string, optionValue: string) => void
    onVariantSelect?: (variant: CatalogVariant) => void
    onVariantChange?: (variant: CatalogVariant | null, selectedAttributes: Record<string, string>) => void
    disabled?: boolean
    trackInventory?: boolean
    className?: string
}

/**
 * Matrix evaluation helper: determines whether picking optionVal for attrName leads to a valid active variant
 */
export function isOptionAvailable(
    attrName: string,
    optionVal: string,
    currentSelections: Record<string, string> = {},
    variants: CatalogVariant[] = []
): { valid: boolean; stockStatus: "in_stock" | "low_stock" | "sold_out" } {
    const activeVariants = (variants || []).filter((v) => v.is_active !== false)
    if (activeVariants.length === 0) {
        return { valid: true, stockStatus: "in_stock" }
    }

    // Find all variants matching other current selections + this candidate option
    const matching = activeVariants.filter((v) => {
        const val = typeof v.attributes[attrName] === "object"
            ? (v.attributes[attrName] as any)?.value
            : v.attributes[attrName]

        if (val !== optionVal) return false

        for (const [otherAttr, otherVal] of Object.entries(currentSelections)) {
            if (otherAttr === attrName) continue
            const existingVal = typeof v.attributes[otherAttr] === "object"
                ? (v.attributes[otherAttr] as any)?.value
                : v.attributes[otherAttr]

            if (existingVal && existingVal !== otherVal) {
                return false
            }
        }
        return true
    })

    if (matching.length === 0) {
        return { valid: false, stockStatus: "sold_out" }
    }

    // Check inventory across matching variants
    const totalStock = matching.reduce((acc, v) => acc + (v.inventory_quantity ?? v.stock_quantity ?? 999), 0)
    const trackAny = matching.some((v) => v.track_inventory ?? v.track_stock)
    const allowBackorder = matching.some((v) => v.allow_backorders)

    if (trackAny && totalStock <= 0 && !allowBackorder) {
        return { valid: true, stockStatus: "sold_out" }
    }

    if (trackAny && totalStock <= 5 && !allowBackorder) {
        return { valid: true, stockStatus: "low_stock" }
    }

    return { valid: true, stockStatus: "in_stock" }
}

export function VariantSelector({
    item,
    variantAttributes,
    variants,
    selectedVariant,
    selectedAttributes = {},
    onAttributeChange,
    onVariantSelect,
    onVariantChange,
    disabled = false,
    trackInventory = false,
    className
}: VariantSelectorProps) {
    const activeGroups: CatalogAttributeGroup[] = useMemo(() => {
        if (variantAttributes && variantAttributes.length > 0) return variantAttributes
        if (item?.variant_attributes && item.variant_attributes.length > 0) return item.variant_attributes
        if (item?.variants_config && typeof item.variants_config === "object" && "attributes" in item.variants_config) {
            return (item.variants_config as any).attributes || []
        }
        return []
    }, [variantAttributes, item])

    const activeVariants: CatalogVariant[] = useMemo(() => {
        if (variants && variants.length > 0) return variants
        if (item?.variants && item.variants.length > 0) return item.variants
        return []
    }, [variants, item])

    if (!activeGroups || activeGroups.length === 0) {
        return null
    }

    return (
        <TooltipProvider delayDuration={150}>
            <div className={cn("space-y-5 w-full", className)}>
                {activeGroups.map((group) => {
                    const currentSelectedValue = selectedAttributes[group.name] || ""
                    const swatchType = (group.swatch_type || group.display_type || group.type || "pill").toLowerCase()
                    const isSelectMode = swatchType === "select" || group.options.length > 8

                    return (
                        <div key={group.id || group.name} className="space-y-2.5">
                            {/* Attribute Title & Active Value */}
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                    {group.name}:
                                    {currentSelectedValue && (
                                        <span className="font-normal text-zinc-500 dark:text-zinc-400">
                                            {currentSelectedValue}
                                        </span>
                                    )}
                                </span>
                            </div>

                            {/* Dropdown Select Mode */}
                            {isSelectMode ? (
                                <Select
                                    value={currentSelectedValue}
                                    onValueChange={(val) => !disabled && onAttributeChange(group.name, val)}
                                    disabled={disabled}
                                >
                                    <SelectTrigger className="w-full h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs">
                                        <SelectValue placeholder={`Seleccionar ${group.name}`} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {group.options.map((opt) => {
                                            const optVal = opt.value || opt.label
                                            const availability = isOptionAvailable(group.name, optVal, selectedAttributes, activeVariants)

                                            return (
                                                <SelectItem
                                                    key={opt.id || optVal}
                                                    value={optVal}
                                                    disabled={!availability.valid || availability.stockStatus === "sold_out"}
                                                    className="text-xs"
                                                >
                                                    <div className="flex items-center justify-between w-full gap-4">
                                                        <span>{opt.label || opt.value}</span>
                                                        {availability.stockStatus === "sold_out" && (
                                                            <span className="text-[10px] text-rose-500 font-semibold">(Agotado)</span>
                                                        )}
                                                        {availability.stockStatus === "low_stock" && (
                                                            <span className="text-[10px] text-amber-500 font-semibold">(Últimas unidades)</span>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                            ) : (
                                /* Swatches & Chips Row */
                                <div className="flex flex-wrap gap-2.5 items-center">
                                    {group.options.map((opt) => {
                                        const optVal = opt.value || opt.label
                                        const isSelected = currentSelectedValue === optVal
                                        const availability = isOptionAvailable(group.name, optVal, selectedAttributes, activeVariants)
                                        const isSoldOut = availability.stockStatus === "sold_out"
                                        const isLowStock = availability.stockStatus === "low_stock"
                                        const isInvalid = !availability.valid

                                        // Color Swatch
                                        if (swatchType === "color" || swatchType === "color_swatch") {
                                            const hexColor = opt.hex_color || opt.swatch_value || "#3b82f6"

                                            return (
                                                <Tooltip key={opt.id || optVal}>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            disabled={disabled || isInvalid}
                                                            onClick={() => onAttributeChange(group.name, optVal)}
                                                            className={cn(
                                                                "relative h-9 w-9 rounded-full transition-all duration-200 flex items-center justify-center shadow-xs",
                                                                isSelected
                                                                    ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-950 scale-110 shadow-md"
                                                                    : "hover:scale-105 border border-zinc-200 dark:border-zinc-700",
                                                                (isInvalid || isSoldOut) && "opacity-40 cursor-not-allowed",
                                                                disabled && "opacity-50 cursor-not-allowed"
                                                            )}
                                                            style={{ backgroundColor: hexColor }}
                                                            aria-label={`${group.name}: ${opt.label || opt.value}`}
                                                        >
                                                            {isSelected && (
                                                                <Check className={cn(
                                                                    "h-4 w-4 drop-shadow-md",
                                                                    hexColor.toLowerCase() === "#ffffff" || hexColor.toLowerCase() === "#fff" || hexColor.toLowerCase().includes("white")
                                                                        ? "text-zinc-900"
                                                                        : "text-white"
                                                                )} />
                                                            )}
                                                            {(isInvalid || isSoldOut) && (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-full h-[1.5px] bg-rose-500 rotate-45" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-xs font-semibold py-1 px-2.5 rounded-lg shadow-md">
                                                        <span>{opt.label || opt.value}</span>
                                                        {isSoldOut && <span className="text-rose-400 block text-[10px]">Agotado</span>}
                                                        {isLowStock && <span className="text-amber-400 block text-[10px]">Pocas unidades</span>}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )
                                        }

                                        // Image Swatch
                                        if (swatchType === "image" || swatchType === "image_swatch") {
                                            const imgUrl = opt.image_url || opt.swatch_value

                                            return (
                                                <Tooltip key={opt.id || optVal}>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            disabled={disabled || isInvalid}
                                                            onClick={() => onAttributeChange(group.name, optVal)}
                                                            className={cn(
                                                                "relative h-11 w-11 rounded-xl overflow-hidden transition-all border-2",
                                                                isSelected
                                                                    ? "border-primary ring-2 ring-primary/30 scale-105 shadow-md"
                                                                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400",
                                                                (isInvalid || isSoldOut) && "opacity-40 cursor-not-allowed",
                                                                disabled && "opacity-50 cursor-not-allowed"
                                                            )}
                                                            aria-label={`${group.name}: ${opt.label || opt.value}`}
                                                        >
                                                            {imgUrl ? (
                                                                <img
                                                                    src={imgUrl}
                                                                    alt={opt.label || opt.value}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                                                                    {opt.label?.slice(0, 2)}
                                                                </div>
                                                            )}
                                                            {(isInvalid || isSoldOut) && (
                                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                    <div className="w-full h-[1.5px] bg-rose-500 rotate-45" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-xs font-semibold py-1 px-2.5 rounded-lg shadow-md">
                                                        <span>{opt.label || opt.value}</span>
                                                        {isSoldOut && <span className="text-rose-400 block text-[10px]">Agotado</span>}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )
                                        }

                                        // Pill / Chip Button (Default)
                                        return (
                                            <button
                                                key={opt.id || optVal}
                                                type="button"
                                                disabled={disabled || isInvalid || isSoldOut}
                                                onClick={() => onAttributeChange(group.name, optVal)}
                                                className={cn(
                                                    "relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 border",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                                                        : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-850",
                                                    (isInvalid || isSoldOut) && "line-through opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-850",
                                                    disabled && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                <span>{opt.label || opt.value}</span>
                                                {isLowStock && !isSelected && (
                                                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block align-middle animate-ping" />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </TooltipProvider>
    )
}

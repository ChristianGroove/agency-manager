"use client"

import React, { useMemo } from "react"
import { CatalogAddonGroup, CatalogAddonOption } from "@/types/catalog"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Plus, Minus, Check, AlertCircle, Info } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface SelectedAddon {
    groupId: string
    optionId: string
    name: string
    priceDelta: number
    quantity: number
    skuSuffix?: string | null
}

export type SelectedAddonItem = SelectedAddon

export interface AddonSelectorProps {
    groups?: CatalogAddonGroup[]
    addonGroups?: CatalogAddonGroup[]
    selectedAddons: SelectedAddon[]
    onChange?: (selectedAddons: SelectedAddon[]) => void
    onAddonsChange?: (selectedAddons: SelectedAddon[], totalDelta: number) => void
    currency?: string
    disabled?: boolean
    className?: string
}

export function AddonSelector({
    groups,
    addonGroups,
    selectedAddons = [],
    onChange,
    onAddonsChange,
    currency = "COP",
    disabled = false,
    className
}: AddonSelectorProps) {
    const activeGroups = groups || addonGroups || []

    const formatDelta = (delta: number) => {
        if (delta === 0) return "Incluido"
        const prefix = delta > 0 ? "+" : ""
        if (currency === "USD") {
            return `${prefix}${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(delta)}`
        }
        if (currency === "EUR") {
            return `${prefix}${new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(delta)}`
        }
        return `${prefix}${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(delta)}`
    }

    const handleUpdate = (updated: SelectedAddon[]) => {
        const totalDelta = updated.reduce((acc, a) => acc + (a.priceDelta * (a.quantity || 1)), 0)
        if (onChange) {
            onChange(updated)
        }
        if (onAddonsChange) {
            onAddonsChange(updated, totalDelta)
        }
    }

    // Toggle single-select
    const handleSingleSelect = (group: CatalogAddonGroup, optionId: string) => {
        if (disabled) return
        let updated = selectedAddons.filter(a => a.groupId !== group.id)

        if (optionId !== "none") {
            const opt = group.options.find(o => o.id === optionId)
            if (opt) {
                updated.push({
                    groupId: group.id,
                    optionId: opt.id,
                    name: opt.name,
                    priceDelta: Number(opt.price_delta || opt.price || 0),
                    quantity: 1,
                    skuSuffix: opt.sku_suffix
                })
            }
        }
        handleUpdate(updated)
    }

    // Toggle multi-select checkbox
    const handleMultiToggle = (group: CatalogAddonGroup, opt: CatalogAddonOption, isChecked: boolean) => {
        if (disabled) return
        let updated = [...selectedAddons]
        const existingIdx = updated.findIndex(a => a.groupId === group.id && a.optionId === opt.id)

        if (isChecked) {
            if (existingIdx === -1) {
                // Check max_selections constraint
                const currentGroupCount = updated.filter(a => a.groupId === group.id).length
                if (group.max_selections && currentGroupCount >= group.max_selections) {
                    return
                }
                updated.push({
                    groupId: group.id,
                    optionId: opt.id,
                    name: opt.name,
                    priceDelta: Number(opt.price_delta || opt.price || 0),
                    quantity: 1,
                    skuSuffix: opt.sku_suffix
                })
            }
        } else {
            if (existingIdx !== -1) {
                updated.splice(existingIdx, 1)
            }
        }
        handleUpdate(updated)
    }

    // Quantity stepper
    const handleQuantityChange = (groupId: string, optionId: string, deltaQty: number) => {
        if (disabled) return
        const updated = selectedAddons.map(a => {
            if (a.groupId === groupId && a.optionId === optionId) {
                const newQty = Math.max(1, (a.quantity || 1) + deltaQty)
                return { ...a, quantity: newQty }
            }
            return a
        })
        handleUpdate(updated)
    }

    if (!activeGroups || activeGroups.length === 0) {
        return null
    }

    return (
        <div className={cn("space-y-6 w-full", className)}>
            {activeGroups.map((group) => {
                const selectedInGroup = selectedAddons.filter(a => a.groupId === group.id)
                const selectedCount = selectedInGroup.length
                const isSingle = group.selection_type === "single"
                const currentSelectedOptionId = isSingle ? (selectedInGroup[0]?.optionId || "none") : null
                const maxReached = Boolean(group.max_selections && selectedCount >= group.max_selections)
                const minMissing = Boolean(group.is_required && group.min_selections && selectedCount < group.min_selections)

                return (
                    <div
                        key={group.id}
                        className="p-4 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 backdrop-blur-sm"
                    >
                        {/* Group Header */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                        {group.name}
                                    </h4>
                                    {group.is_required && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                                            Obligatorio
                                        </span>
                                    )}
                                </div>
                                {group.description && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        {group.description}
                                    </p>
                                )}
                            </div>

                            {/* Constraints badge */}
                            <div className="text-[11px] font-semibold text-zinc-400">
                                {isSingle ? (
                                    <span>Selecciona 1</span>
                                ) : group.max_selections ? (
                                    <span>Máx. {group.max_selections} ({selectedCount}/{group.max_selections})</span>
                                ) : (
                                    <span>Opcional</span>
                                )}
                            </div>
                        </div>

                        {/* Options List */}
                        {isSingle ? (
                            <RadioGroup
                                value={currentSelectedOptionId || "none"}
                                onValueChange={(val) => handleSingleSelect(group, val)}
                                disabled={disabled}
                                className="space-y-2"
                            >
                                {!group.is_required && (
                                    <label
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                            currentSelectedOptionId === "none"
                                                ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/60 dark:hover:bg-zinc-850"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <RadioGroupItem value="none" id={`${group.id}-none`} />
                                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                                Sin adicional / Ninguno
                                            </span>
                                        </div>
                                        <span className="text-xs text-zinc-400 font-semibold">$0</span>
                                    </label>
                                )}

                                {group.options.map((opt) => {
                                    const isOptSelected = currentSelectedOptionId === opt.id
                                    const delta = Number(opt.price_delta || opt.price || 0)

                                    return (
                                        <label
                                            key={opt.id}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                                isOptSelected
                                                    ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                                                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/60 dark:hover:bg-zinc-850"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <RadioGroupItem value={opt.id} id={`${group.id}-${opt.id}`} />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                        {opt.name}
                                                    </span>
                                                    {opt.description && (
                                                        <span className="text-[11px] text-zinc-500">
                                                            {opt.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded-md",
                                                delta > 0
                                                    ? "text-primary bg-primary/10"
                                                    : "text-zinc-400"
                                            )}>
                                                {formatDelta(delta)}
                                            </span>
                                        </label>
                                    )
                                })}
                            </RadioGroup>
                        ) : (
                            <div className="space-y-2">
                                {group.options.map((opt) => {
                                    const selectedItem = selectedInGroup.find(a => a.optionId === opt.id)
                                    const isChecked = Boolean(selectedItem)
                                    const delta = Number(opt.price_delta || opt.price || 0)
                                    const isOptionDisabled = disabled || (!isChecked && maxReached)

                                    return (
                                        <div
                                            key={opt.id}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-xl border transition-all",
                                                isChecked
                                                    ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                                                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/60 dark:hover:bg-zinc-850",
                                                isOptionDisabled && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <div
                                                className="flex items-center gap-3 flex-1 cursor-pointer"
                                                onClick={() => !isOptionDisabled && handleMultiToggle(group, opt, !isChecked)}
                                            >
                                                <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => handleMultiToggle(group, opt, Boolean(checked))}
                                                    disabled={isOptionDisabled}
                                                    id={`${group.id}-${opt.id}`}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                        {opt.name}
                                                    </span>
                                                    {opt.description && (
                                                        <span className="text-[11px] text-zinc-500">
                                                            {opt.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Optional Quantity Stepper if checked */}
                                                {isChecked && (
                                                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-0.5">
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleQuantityChange(group.id, opt.id, -1)
                                                            }}
                                                            disabled={(selectedItem?.quantity || 1) <= 1}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <span className="text-xs font-bold px-1.5 min-w-[20px] text-center">
                                                            {selectedItem?.quantity || 1}
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-6 w-6 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleQuantityChange(group.id, opt.id, 1)
                                                            }}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}

                                                <span className={cn(
                                                    "text-xs font-bold px-2 py-0.5 rounded-md",
                                                    delta > 0
                                                        ? "text-primary bg-primary/10"
                                                        : "text-zinc-400"
                                                )}>
                                                    {formatDelta(delta * (selectedItem?.quantity || 1))}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {minMissing && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>Por favor selecciona al menos {group.min_selections} opción(es).</span>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

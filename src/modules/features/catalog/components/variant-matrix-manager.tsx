"use client"

import React, { useState, useMemo, useCallback, useEffect } from "react"
import {
  CatalogAttributeGroup,
  CatalogVariant,
  CatalogPriceModifierType,
  AttributeSwatchType,
} from "@/types/catalog"
import {
  createAttributeGroupAction,
} from "@/modules/features/catalog/attributes-actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  Trash2,
  RefreshCw,
  Sparkles,
  Layers,
  Package,
  DollarSign,
  Plus,
  Check,
  Star,
  LayoutList,
  LayoutGrid,
  Sliders,
  Tag,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface VariantMatrixManagerProps {
  itemId?: string
  basePrice?: number
  skuPrefix?: string
  attributeGroups: CatalogAttributeGroup[]
  variants: CatalogVariant[]
  onChange: (variants: CatalogVariant[]) => void
  onSave?: () => Promise<void>
  onRefreshAttributeGroups?: () => void
  isSaving?: boolean
  disabled?: boolean
}

export function VariantMatrixManager({
  itemId,
  basePrice = 0,
  skuPrefix = "PROD",
  attributeGroups = [],
  variants = [],
  onChange,
  onSave,
  onRefreshAttributeGroups,
  isSaving = false,
  disabled = false,
}: VariantMatrixManagerProps) {
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [selectedOptionIds, setSelectedOptionIds] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (attributeGroups.length === 0) return

    if (variants.length > 0) {
      const usedGroupNames = new Set<string>()
      variants.forEach((v) => {
        if (v.attributes) {
          Object.keys(v.attributes).forEach((k) => usedGroupNames.add(k.toLowerCase()))
        }
      })

      const matchedGroupIds: string[] = []
      const matchedOptionIds: Record<string, string[]> = {}

      attributeGroups.forEach((group) => {
        const isUsed =
          usedGroupNames.has(group.name.toLowerCase()) ||
          usedGroupNames.has(group.slug.toLowerCase())

        if (isUsed) {
          matchedGroupIds.push(group.id)
          const usedOptValues = new Set<string>()
          variants.forEach((v) => {
            if (v.attributes) {
              const val = v.attributes[group.name] || v.attributes[group.slug]
              if (val) {
                const strVal = typeof val === "object" ? (val as any)?.value || (val as any)?.label : String(val)
                usedOptValues.add(strVal.toLowerCase())
              }
            }
          })

          const activeOpts = (group.options || [])
            .filter(
              (opt) =>
                usedOptValues.size === 0 ||
                usedOptValues.has(opt.value.toLowerCase()) ||
                usedOptValues.has(opt.label.toLowerCase())
            )
            .map((opt) => opt.id || opt.value)

          matchedOptionIds[group.id] =
            activeOpts.length > 0 ? activeOpts : (group.options || []).map((o) => o.id || o.value)
        }
      })

      if (matchedGroupIds.length > 0) {
        setSelectedGroupIds(matchedGroupIds)
        setSelectedOptionIds(matchedOptionIds)
        return
      }
    }

    if (selectedGroupIds.length === 0 && attributeGroups.length > 0) {
      const defaultGroups = attributeGroups.slice(0, 2)
      setSelectedGroupIds(defaultGroups.map((g) => g.id))
      const optsMap: Record<string, string[]> = {}
      defaultGroups.forEach((g) => {
        optsMap[g.id] = (g.options || []).map((o) => o.id || o.value)
      })
      setSelectedOptionIds(optsMap)
    }
  }, [attributeGroups.length])

  const [bulkPriceType, setBulkPriceType] = useState<CatalogPriceModifierType>("fixed")
  const [bulkPriceValue, setBulkPriceValue] = useState<string>("")
  const [bulkStockValue, setBulkStockValue] = useState<string>("")
  const [bulkTrackStock, setBulkTrackStock] = useState<boolean>(true)
  const [bulkAllowBackorders, setBulkAllowBackorders] = useState<boolean>(false)

  const [isQuickAttrModalOpen, setIsQuickAttrModalOpen] = useState(false)
  const [quickAttrName, setQuickAttrName] = useState("")
  const [quickAttrType, setQuickAttrType] = useState<AttributeSwatchType>("pill")
  const [quickAttrOptions, setQuickAttrOptions] = useState<string>("")
  const [isCreatingQuickAttr, setIsCreatingQuickAttr] = useState(false)

  const activeProductGroups = useMemo(() => {
    return attributeGroups
      .filter((g) => selectedGroupIds.includes(g.id))
      .map((g) => {
        const allowedOpts = selectedOptionIds[g.id] || []
        const filteredOptions = (g.options || []).filter(
          (o) => allowedOpts.length === 0 || allowedOpts.includes(o.id || o.value)
        )
        return {
          ...g,
          options: filteredOptions,
        }
      })
      .filter((g) => g.options.length > 0)
  }, [attributeGroups, selectedGroupIds, selectedOptionIds])

  const totalPermutations = useMemo(() => {
    if (activeProductGroups.length === 0) return 0
    return activeProductGroups.reduce((acc, g) => acc * g.options.length, 1)
  }, [activeProductGroups])

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const isSelected = prev.includes(groupId)
      if (isSelected) {
        return prev.filter((id) => id !== groupId)
      } else {
        const group = attributeGroups.find((g) => g.id === groupId)
        if (group && !selectedOptionIds[groupId]) {
          setSelectedOptionIds((oPrev) => ({
            ...oPrev,
            [groupId]: (group.options || []).map((o) => o.id || o.value),
          }))
        }
        return [...prev, groupId]
      }
    })
  }

  const handleToggleOption = (groupId: string, optionIdOrValue: string) => {
    setSelectedOptionIds((prev) => {
      const current = prev[groupId] || []
      const isSelected = current.includes(optionIdOrValue)
      const next = isSelected
        ? current.filter((id) => id !== optionIdOrValue)
        : [...current, optionIdOrValue]

      return {
        ...prev,
        [groupId]: next,
      }
    })
  }

  const handleCreateQuickAttribute = async () => {
    if (!quickAttrName.trim()) {
      toast.error("Ingresa el nombre del atributo")
      return
    }

    const rawOptions = quickAttrOptions
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (rawOptions.length === 0) {
      toast.error("Ingresa al menos una opción")
      return
    }

    setIsCreatingQuickAttr(true)
    try {
      const slug = quickAttrName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")

      const options = rawOptions.map((optLabel, idx) => ({
        id: crypto.randomUUID(),
        label: optLabel,
        value: optLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        swatch_type: quickAttrType,
        hex_color: quickAttrType === "color" ? "#000000" : undefined,
        price_modifier: 0,
        order_index: idx,
      }))

      const res = await createAttributeGroupAction({
        name: quickAttrName.trim(),
        slug,
        swatch_type: quickAttrType,
        options,
      })

      if (res.success && res.data) {
        toast.success(`Atributo "${quickAttrName}" creado`)
        setIsQuickAttrModalOpen(false)
        setQuickAttrName("")
        setQuickAttrOptions("")

        setSelectedGroupIds((prev) => [...prev, res.data!.id])
        setSelectedOptionIds((prev) => ({
          ...prev,
          [res.data!.id]: (res.data!.options || []).map((o) => o.id || o.value),
        }))

        if (onRefreshAttributeGroups) {
          onRefreshAttributeGroups()
        }
      } else {
        toast.error(res.error || "Error al crear atributo")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al crear atributo")
    } finally {
      setIsCreatingQuickAttr(false)
    }
  }

  const handleGenerateMatrix = useCallback(() => {
    if (activeProductGroups.length === 0) {
      toast.error("Selecciona atributos y opciones para generar variantes")
      return
    }

    if (totalPermutations > 60) {
      toast.error(`La combinación genera ${totalPermutations} variantes. Máximo: 60.`)
      return
    }

    const cartesian = (arrays: any[][]): any[][] => {
      return arrays.reduce<any[][]>(
        (acc, curr) => acc.flatMap((c) => curr.map((n) => [...c, n])),
        [[]]
      )
    }

    const combinations = cartesian(activeProductGroups.map((g) => g.options))

    const generated: CatalogVariant[] = combinations.map((combo, index) => {
      const attrRecord: Record<string, string> = {}
      const titleParts: string[] = []
      const skuParts: string[] = skuPrefix ? [skuPrefix.toUpperCase()] : []

      combo.forEach((opt: any, gIdx: number) => {
        const groupName = activeProductGroups[gIdx].name
        attrRecord[groupName] = opt.value || opt.label
        titleParts.push(opt.label)
        skuParts.push(String(opt.value || opt.label).toUpperCase().replace(/[^A-Z0-9]/g, ""))
      })

      const title = titleParts.join(" / ")
      const defaultSku = skuParts.join("-")

      const existing = variants.find((v) => {
        if (!v.attributes) return false
        for (const [k, val] of Object.entries(attrRecord)) {
          const vVal = typeof v.attributes[k] === "object" ? (v.attributes[k] as any)?.value : v.attributes[k]
          if (vVal !== val) return false
        }
        return true
      })

      if (existing) {
        return {
          ...existing,
          title,
          attributes: attrRecord,
          order_index: index,
          sku: existing.sku || defaultSku,
        }
      }

      return {
        id: `var-gen-${Date.now().toString(36)}-${index}`,
        title,
        name: title,
        sku: defaultSku,
        barcode: null,
        price_modifier: 0,
        price_type: "fixed",
        price_modifier_type: "fixed",
        price_override: null,
        price: basePrice,
        inventory_quantity: 0,
        stock_quantity: 0,
        track_inventory: false,
        track_stock: false,
        allow_backorders: false,
        image_url: null,
        attributes: attrRecord,
        is_active: true,
        is_default: index === 0,
        order_index: index,
        metadata: {},
      }
    })

    onChange(generated)
    toast.success(`Matriz generada: ${generated.length} variantes`)
  }, [activeProductGroups, totalPermutations, variants, basePrice, skuPrefix, onChange])

  const handleAddManualVariant = () => {
    const newIdx = variants.length
    const manualTitle = `Variante #${newIdx + 1}`
    const newVariant: CatalogVariant = {
      id: `var-manual-${Date.now().toString(36)}-${newIdx}`,
      title: manualTitle,
      name: manualTitle,
      sku: `${skuPrefix.toUpperCase()}-${newIdx + 1}`,
      barcode: null,
      price_modifier: 0,
      price_type: "fixed",
      price_modifier_type: "fixed",
      price_override: basePrice,
      price: basePrice,
      inventory_quantity: 0,
      stock_quantity: 0,
      track_inventory: false,
      track_stock: false,
      allow_backorders: false,
      image_url: null,
      attributes: { "Info": manualTitle },
      is_active: true,
      is_default: variants.length === 0,
      order_index: newIdx,
      metadata: {},
    }
    onChange([...variants, newVariant])
    toast.success("Variante agregada")
  }

  const handleApplyBulkPrice = () => {
    const val = parseFloat(bulkPriceValue)
    if (isNaN(val)) return toast.error("Valor inválido")
    const updated = variants.map((v) => {
      let override: number | null = null
      let modifier = 0
      if (bulkPriceType === "fixed") override = val
      else if (bulkPriceType === "offset") { modifier = val; override = Math.max(0, basePrice + val) }
      else if (bulkPriceType === "percentage") { modifier = val; override = Math.max(0, basePrice * (1 + val / 100)) }
      return { ...v, price_type: bulkPriceType, price_modifier_type: bulkPriceType, price_modifier: modifier, price_override: override, price: override ?? basePrice }
    })
    onChange(updated)
    toast.success("Precios actualizados")
  }

  const handleApplyBulkStock = () => {
    const qty = parseInt(bulkStockValue, 10)
    if (isNaN(qty)) return toast.error("Cantidad inválida")
    const updated = variants.map((v) => ({ ...v, inventory_quantity: Math.max(0, qty), stock_quantity: Math.max(0, qty), track_inventory: bulkTrackStock, track_stock: bulkTrackStock, allow_backorders: bulkAllowBackorders }))
    onChange(updated)
    toast.success("Inventario actualizado")
  }

  const handleUpdateRow = (index: number, patch: Partial<CatalogVariant>) => {
    const updated = [...variants]
    const current = updated[index]
    const merged = { ...current, ...patch }
    if (patch.inventory_quantity !== undefined || patch.stock_quantity !== undefined) {
      const qty = patch.inventory_quantity !== undefined ? patch.inventory_quantity : patch.stock_quantity!
      merged.inventory_quantity = qty; merged.stock_quantity = qty
    }
    if (patch.track_inventory !== undefined || patch.track_stock !== undefined) {
      const track = patch.track_inventory !== undefined ? patch.track_inventory : patch.track_stock!
      merged.track_inventory = track; merged.track_stock = track
    }
    if (patch.price_override !== undefined || patch.price_modifier !== undefined || patch.price_type !== undefined) {
      const pType = patch.price_type || current.price_type || "fixed"
      if (pType === "fixed") merged.price = merged.price_override ?? basePrice
      else if (pType === "offset") merged.price = Math.max(0, basePrice + Number(merged.price_modifier || 0))
      else if (pType === "percentage") merged.price = Math.max(0, basePrice * (1 + Number(merged.price_modifier || 0) / 100))
    }
    updated[index] = merged
    onChange(updated)
  }

  const handleSetDefault = (index: number) => {
    const updated = variants.map((v, i) => ({ ...v, is_default: i === index }))
    onChange(updated)
  }

  const handleDeleteRow = (index: number) => {
    onChange(variants.filter((_, i) => i !== index))
  }

  const formatPrice = (price: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(price)

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/10 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-brand-pink" />
              <span>1. Selecciona atributos y opciones</span>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickAttrModalOpen(true)} className="h-8 text-xs font-semibold rounded-xl border-dashed border-brand-pink/40 text-brand-pink hover:bg-brand-pink/10">
            <Plus className="h-3.5 w-3.5 mr-1" /> Crear Rápido
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attributeGroups.map((group) => {
            const isGroupActive = selectedGroupIds.includes(group.id)
            const allowedOptions = selectedOptionIds[group.id] || []
            const allOpts = group.options || []
            return (
              <div key={group.id} className={cn("p-3.5 rounded-2xl border transition-all space-y-2.5", isGroupActive ? "bg-white dark:bg-zinc-950 border-brand-pink/40 shadow-xs" : "bg-zinc-100/60 dark:bg-zinc-900/40 border-zinc-200/60 opacity-70")}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isGroupActive} onChange={() => handleToggleGroup(group.id)} className="h-4 w-4 rounded accent-brand-pink" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">{group.name}</span>
                  </label>
                  <Badge variant="secondary" className="text-[10px]">{allowedOptions.length} de {allOpts.length}</Badge>
                </div>
                {isGroupActive && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {allOpts.map((opt) => {
                      const optKey = opt.id || opt.value
                      const isChecked = allowedOptions.includes(optKey)
                      return (
                        <button key={optKey} type="button" onClick={() => handleToggleOption(group.id, optKey)} className={cn("px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all", isChecked ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500")}>
                          {opt.label} {isChecked && <Check className="h-3 w-3 inline" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-pink" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
              Combinaciones Resultantes: {totalPermutations} variantes
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Precio base del producto: <span className="font-bold text-zinc-900 dark:text-white">{formatPrice(basePrice)} COP</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleGenerateMatrix} disabled={disabled || activeProductGroups.length === 0} className="rounded-2xl bg-brand-pink text-white text-xs font-bold px-4 h-9 shadow-md shadow-brand-pink/20 cursor-pointer">Generar</Button>
          <Button variant="outline" onClick={handleAddManualVariant} className="rounded-2xl text-xs font-semibold border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 h-9 px-3 cursor-pointer">Manual</Button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* STEP 3: BULK ACTIONS & VIEW MODE SWITCH                               */}
      {/* --------------------------------------------------------------------- */}
      {variants.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-brand-pink" />
              <span>Edición Masiva en Lote</span>
            </div>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  viewMode === "cards"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Tarjetas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>Tabla</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bulk Price */}
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/80 space-y-2">
              <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                <span>Establecer Precio a Todas</span>
              </Label>
              <div className="flex items-center gap-2">
                <Select value={bulkPriceType} onValueChange={(val: any) => setBulkPriceType(val)}>
                  <SelectTrigger className="w-[125px] h-8 text-xs rounded-xl bg-white dark:bg-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Precio Fijo</SelectItem>
                    <SelectItem value="offset">Ajuste (+/- $)</SelectItem>
                    <SelectItem value="percentage">Ajuste (+/- %)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder={bulkPriceType === "percentage" ? "+15%" : "85000"}
                  value={bulkPriceValue}
                  onChange={(e) => setBulkPriceValue(e.target.value)}
                  className="h-8 text-xs rounded-xl bg-white dark:bg-zinc-800"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleApplyBulkPrice}
                  className="h-8 px-3 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Aplicar
                </Button>
              </div>
            </div>

            {/* Bulk Stock */}
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/80 space-y-2">
              <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-blue-500" />
                <span>Establecer Inventario a Todas</span>
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  placeholder="Cant. (ej: 20)"
                  value={bulkStockValue}
                  onChange={(e) => setBulkStockValue(e.target.value)}
                  className="h-8 text-xs rounded-xl w-24 bg-white dark:bg-zinc-800"
                />
                <div className="flex items-center gap-1 shrink-0 px-1">
                  <Switch
                    checked={bulkTrackStock}
                    onCheckedChange={setBulkTrackStock}
                    id="bulk-track-sw"
                  />
                  <Label htmlFor="bulk-track-sw" className="text-[10px] cursor-pointer text-zinc-500">
                    Rastrear
                  </Label>
                </div>
                <div className="flex items-center gap-1 shrink-0 px-1">
                  <Switch
                    checked={bulkAllowBackorders}
                    onCheckedChange={setBulkAllowBackorders}
                    id="bulk-back-sw"
                  />
                  <Label htmlFor="bulk-back-sw" className="text-[10px] cursor-pointer text-zinc-500">
                    Bajo Pedido
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleApplyBulkStock}
                  className="h-8 px-3 rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* STEP 4: VARIANTS LIST (CARDS VIEW OR COMPACT TABLE VIEW)              */}
      {/* --------------------------------------------------------------------- */}
      {variants.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30">
          <Layers className="h-10 w-10 text-zinc-400 mb-3" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
            No has generado las variantes aún
          </h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-5 leading-relaxed">
            Revisa los atributos seleccionados en el Paso 1 y haz clic en &ldquo;Generar Variantes&rdquo; para crearlas automáticamente.
          </p>
          <Button
            type="button"
            onClick={handleGenerateMatrix}
            disabled={disabled || activeProductGroups.length === 0}
            className="rounded-2xl bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-bold px-6 h-10 shadow-md cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Generar Variantes Ahora
          </Button>
        </div>
      ) : viewMode === "cards" ? (
        /* VISTA TARJETAS (PREDETERMINADA, ALTO UX/UI, NUNCA SE ROMPE) */
        <div className="space-y-3">
          {variants.map((v, idx) => {
            const effectivePrice =
              v.price_override ??
              (v.price_type === "offset"
                ? Math.max(0, basePrice + Number(v.price_modifier || 0))
                : v.price_type === "percentage"
                ? Math.max(0, basePrice * (1 + Number(v.price_modifier || 0) / 100))
                : basePrice)

            const qty = Number(v.inventory_quantity ?? v.stock_quantity ?? 0)
            const isTracked = v.track_inventory ?? v.track_stock ?? false
            const isBackorders = v.allow_backorders ?? false

            return (
              <div
                key={v.id || idx}
                className={cn(
                  "p-4 rounded-3xl border transition-all bg-white dark:bg-zinc-950 shadow-xs space-y-3",
                  v.is_default
                    ? "border-brand-pink/50 ring-1 ring-brand-pink/20"
                    : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                {/* Variant Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    {/* Default Radio */}
                    <button
                      type="button"
                      onClick={() => handleSetDefault(idx)}
                      className={cn(
                        "h-7 px-2.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border",
                        v.is_default
                          ? "bg-brand-pink text-white border-brand-pink shadow-xs"
                          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                      )}
                      title="Marcar como variante predeterminada al cargar la tienda"
                    >
                      <Star className={cn("h-3 w-3", v.is_default ? "fill-current" : "")} />
                      <span>{v.is_default ? "Predeterminada" : "Hacer Principal"}</span>
                    </button>

                    {/* Variant Title */}
                    <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
                      {v.title}
                    </span>

                    {/* Attribute Tags */}
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(v.attributes || {}).map(([grp, val]) => (
                        <span
                          key={grp}
                          className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-800"
                        >
                          {typeof val === "object" ? (val as any)?.label || (val as any)?.value : String(val)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Active Switch */}
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={v.is_active !== false}
                        onCheckedChange={(checked) => handleUpdateRow(idx, { is_active: checked })}
                        id={`active-${idx}`}
                      />
                      <Label htmlFor={`active-${idx}`} className="text-[11px] cursor-pointer text-zinc-500 font-semibold">
                        {v.is_active !== false ? "Visible" : "Oculta"}
                      </Label>
                    </div>

                    {/* Delete Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRow(idx)}
                      className="h-7 w-7 text-zinc-400 hover:text-red-600 rounded-xl cursor-pointer"
                      title="Eliminar esta variante"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Variant Body Grid: 3 Clean Columns (Never overflows) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  {/* Col 1: SKU & Barcode */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60">
                    <Label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <span>Identificación (SKU)</span>
                    </Label>
                    <Input
                      value={v.sku || ""}
                      onChange={(e) => handleUpdateRow(idx, { sku: e.target.value })}
                      placeholder="SKU-VARIANTE"
                      className="h-8 text-xs font-mono rounded-xl bg-white dark:bg-zinc-800"
                    />
                    <Input
                      value={v.barcode || ""}
                      onChange={(e) => handleUpdateRow(idx, { barcode: e.target.value })}
                      placeholder="Código de barras (opcional)"
                      className="h-8 text-[11px] font-mono rounded-xl bg-white dark:bg-zinc-800"
                    />
                  </div>

                  {/* Col 2: Price Configuration */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-emerald-500" />
                        <span>Precio</span>
                      </Label>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {formatPrice(effectivePrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Select
                        value={v.price_type || "fixed"}
                        onValueChange={(val: any) => handleUpdateRow(idx, { price_type: val })}
                      >
                        <SelectTrigger className="h-8 text-[11px] rounded-xl w-[100px] bg-white dark:bg-zinc-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fijo</SelectItem>
                          <SelectItem value="offset">Ajuste +$</SelectItem>
                          <SelectItem value="percentage">Ajuste +%</SelectItem>
                        </SelectContent>
                      </Select>

                      {v.price_type === "fixed" ? (
                        <Input
                          type="number"
                          value={v.price_override ?? basePrice}
                          onChange={(e) =>
                            handleUpdateRow(idx, { price_override: parseFloat(e.target.value) || 0 })
                          }
                          className="h-8 text-xs font-bold rounded-xl flex-1 bg-white dark:bg-zinc-800"
                        />
                      ) : (
                        <Input
                          type="number"
                          value={v.price_modifier ?? 0}
                          onChange={(e) =>
                            handleUpdateRow(idx, { price_modifier: parseFloat(e.target.value) || 0 })
                          }
                          className="h-8 text-xs font-bold rounded-xl flex-1 bg-white dark:bg-zinc-800"
                        />
                      )}
                    </div>
                  </div>

                  {/* Col 3: Stock & Availability */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                        <Package className="h-3 w-3 text-blue-500" />
                        <span>Inventario</span>
                      </Label>
                      {!isTracked ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Ilimitado
                        </Badge>
                      ) : qty <= 0 && !isBackorders ? (
                        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] px-1.5 py-0 font-bold">
                          Agotado
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0 font-bold">
                          Stock: {qty}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={qty}
                        disabled={!isTracked}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0
                          handleUpdateRow(idx, {
                            inventory_quantity: val,
                            stock_quantity: val,
                          })
                        }}
                        placeholder="0"
                        className="h-8 text-xs font-bold rounded-xl w-20 bg-white dark:bg-zinc-800"
                      />

                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={isTracked}
                            onCheckedChange={(checked) =>
                              handleUpdateRow(idx, {
                                track_inventory: checked,
                                track_stock: checked,
                              })
                            }
                            id={`track-${idx}`}
                          />
                          <Label htmlFor={`track-${idx}`} className="text-[10px] cursor-pointer text-zinc-500">
                            Controlar
                          </Label>
                        </div>

                        <div className="flex items-center gap-1">
                          <Switch
                            checked={isBackorders}
                            onCheckedChange={(checked) =>
                              handleUpdateRow(idx, {
                                allow_backorders: checked,
                              })
                            }
                            id={`back-${idx}`}
                          />
                          <Label htmlFor={`back-${idx}`} className="text-[10px] cursor-pointer text-zinc-500">
                            Bajo Pedido
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* VISTA TABLA COMPACTA */
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 overflow-x-auto bg-white dark:bg-zinc-950 shadow-xs">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/80">
              <TableRow>
                <TableHead className="w-[45px] text-center">Pred.</TableHead>
                <TableHead className="min-w-[160px]">Variante</TableHead>
                <TableHead className="min-w-[120px]">SKU</TableHead>
                <TableHead className="min-w-[110px]">Tipo Precio</TableHead>
                <TableHead className="min-w-[110px]">Valor</TableHead>
                <TableHead className="min-w-[100px]">Precio Final</TableHead>
                <TableHead className="min-w-[85px]">Stock</TableHead>
                <TableHead className="w-[70px] text-center">Rastrear</TableHead>
                <TableHead className="w-[70px] text-center">Bajo Ped.</TableHead>
                <TableHead className="w-[65px] text-center">Visible</TableHead>
                <TableHead className="w-[45px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v, idx) => {
                const effectivePrice =
                  v.price_override ??
                  (v.price_type === "offset"
                    ? Math.max(0, basePrice + Number(v.price_modifier || 0))
                    : v.price_type === "percentage"
                    ? Math.max(0, basePrice * (1 + Number(v.price_modifier || 0) / 100))
                    : basePrice)

                const isTracked = v.track_inventory ?? v.track_stock ?? false

                return (
                  <TableRow key={v.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                    <TableCell className="text-center">
                      <input
                        type="radio"
                        name="default-variant"
                        checked={v.is_default || false}
                        onChange={() => handleSetDefault(idx)}
                        className="accent-brand-pink h-4 w-4 cursor-pointer"
                        title="Variante por defecto"
                      />
                    </TableCell>

                    <TableCell className="font-bold text-xs">
                      {v.title}
                    </TableCell>

                    <TableCell>
                      <Input
                        value={v.sku || ""}
                        onChange={(e) => handleUpdateRow(idx, { sku: e.target.value })}
                        placeholder="SKU"
                        className="h-8 text-xs font-mono rounded-xl"
                      />
                    </TableCell>

                    <TableCell>
                      <Select
                        value={v.price_type || "fixed"}
                        onValueChange={(val: any) => handleUpdateRow(idx, { price_type: val })}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fijo</SelectItem>
                          <SelectItem value="offset">Ajuste +$</SelectItem>
                          <SelectItem value="percentage">Ajuste +%</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      {v.price_type === "fixed" ? (
                        <Input
                          type="number"
                          value={v.price_override ?? basePrice}
                          onChange={(e) =>
                            handleUpdateRow(idx, { price_override: parseFloat(e.target.value) || 0 })
                          }
                          className="h-8 text-xs rounded-xl font-bold"
                        />
                      ) : (
                        <Input
                          type="number"
                          value={v.price_modifier ?? 0}
                          onChange={(e) =>
                            handleUpdateRow(idx, { price_modifier: parseFloat(e.target.value) || 0 })
                          }
                          className="h-8 text-xs rounded-xl font-bold"
                        />
                      )}
                    </TableCell>

                    <TableCell className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                      {formatPrice(effectivePrice)}
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={v.inventory_quantity ?? 0}
                        disabled={!isTracked}
                        onChange={(e) =>
                          handleUpdateRow(idx, {
                            inventory_quantity: parseInt(e.target.value, 10) || 0,
                            stock_quantity: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="h-8 text-xs rounded-xl w-20 font-bold"
                      />
                    </TableCell>

                    <TableCell className="text-center">
                      <Switch
                        checked={isTracked}
                        onCheckedChange={(checked) =>
                          handleUpdateRow(idx, {
                            track_inventory: checked,
                            track_stock: checked,
                          })
                        }
                      />
                    </TableCell>

                    <TableCell className="text-center">
                      <Switch
                        checked={v.allow_backorders || false}
                        onCheckedChange={(checked) =>
                          handleUpdateRow(idx, {
                            allow_backorders: checked,
                          })
                        }
                      />
                    </TableCell>

                    <TableCell className="text-center">
                      <Switch
                        checked={v.is_active !== false}
                        onCheckedChange={(checked) => handleUpdateRow(idx, { is_active: checked })}
                      />
                    </TableCell>

                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRow(idx)}
                        className="h-7 w-7 text-zinc-400 hover:text-red-600 rounded-xl cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* QUICK INLINE ATTRIBUTE CREATION DIALOG                                */}
      {/* --------------------------------------------------------------------- */}
      <Dialog open={isQuickAttrModalOpen} onOpenChange={setIsQuickAttrModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border border-zinc-200 dark:border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-pink" />
              <span>Crear Atributo Rápido</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Crea un nuevo grupo de opciones (ej. Talla, Color, Capacidad) para usar en este y otros productos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Nombre del Atributo *</Label>
              <Input
                placeholder="ej. Talla, Color, Acabado"
                value={quickAttrName}
                onChange={(e) => setQuickAttrName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Tipo de Visualización</Label>
              <Select value={quickAttrType} onValueChange={(val: any) => setQuickAttrType(val)}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pill">Píldora de Texto (Pill)</SelectItem>
                  <SelectItem value="color">Muestra de Color (Paleta HEX)</SelectItem>
                  <SelectItem value="select">Menú Desplegable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Opciones (Separadas por comas) *</Label>
              <Input
                placeholder="ej. Pequeño, Mediano, Grande o Rojo, Azul, Negro"
                value={quickAttrOptions}
                onChange={(e) => setQuickAttrOptions(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuickAttrModalOpen(false)}
              className="rounded-xl text-xs font-semibold h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateQuickAttribute}
              disabled={isCreatingQuickAttr}
              className="rounded-xl bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-bold h-9 px-5 cursor-pointer"
            >
              {isCreatingQuickAttr ? "Creando..." : "Crear y Aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

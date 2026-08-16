"use client"

import React, { useState, useMemo, useCallback } from "react"
import {
  CatalogAttributeGroup,
  CatalogVariant,
  CatalogPriceModifierType,
} from "@/types/catalog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Trash2,
  RefreshCw,
  Sparkles,
  Layers,
  Package,
  DollarSign,
} from "lucide-react"
import { toast } from "sonner"

export interface VariantMatrixManagerProps {
  itemId?: string
  basePrice?: number
  skuPrefix?: string
  attributeGroups: CatalogAttributeGroup[]
  variants: CatalogVariant[]
  onChange: (variants: CatalogVariant[]) => void
  onSave?: () => Promise<void>
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
  isSaving = false,
  disabled = false,
}: VariantMatrixManagerProps) {
  // Bulk action states
  const [bulkPriceType, setBulkPriceType] = useState<CatalogPriceModifierType>("fixed")
  const [bulkPriceValue, setBulkPriceValue] = useState<string>("")
  const [bulkStockValue, setBulkStockValue] = useState<string>("")
  const [bulkTrackStock, setBulkTrackStock] = useState<boolean>(true)

  // Active attribute groups that have options
  const activeGroups = useMemo(() => {
    return attributeGroups.filter(g => g.is_active !== false && g.options && g.options.length > 0)
  }, [attributeGroups])

  // Total possible permutations
  const totalPermutations = useMemo(() => {
    if (activeGroups.length === 0) return 0
    return activeGroups.reduce((acc, g) => acc * g.options.length, 1)
  }, [activeGroups])

  // Cartesian Product Generator
  const handleGenerateMatrix = useCallback(() => {
    if (activeGroups.length === 0) {
      toast.error("Debe configurar al menos un atributo con opciones para generar variantes")
      return
    }

    if (totalPermutations > 50) {
      toast.error(`La combinación genera ${totalPermutations} variantes (máximo permitido: 50)`)
      return
    }

    const cartesian = (arrays: any[][]): any[][] => {
      return arrays.reduce<any[][]>(
        (acc, curr) => acc.flatMap(c => curr.map(n => [...c, n])),
        [[]]
      )
    }

    const combinations = cartesian(activeGroups.map(g => g.options))

    const generated: CatalogVariant[] = combinations.map((combo, index) => {
      const attrRecord: Record<string, string> = {}
      const titleParts: string[] = []
      const skuParts: string[] = skuPrefix ? [skuPrefix.toUpperCase()] : []

      combo.forEach((opt: any, gIdx: number) => {
        const groupName = activeGroups[gIdx].name
        attrRecord[groupName] = opt.value || opt.label
        titleParts.push(opt.label)
        skuParts.push(String(opt.value || opt.label).toUpperCase().replace(/[^A-Z0-9]/g, ''))
      })

      const title = titleParts.join(" / ")
      const defaultSku = skuParts.join("-")

      // Match existing variant to retain customizations
      const existing = variants.find(v => {
        for (const [k, val] of Object.entries(attrRecord)) {
          const vVal = typeof v.attributes[k] === 'object' ? (v.attributes[k] as any)?.value : v.attributes[k]
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
        }
      }

      return {
        id: `var-gen-${Date.now().toString(36)}-${index}`,
        title,
        name: title,
        sku: defaultSku,
        barcode: null,
        price_modifier: 0,
        price_type: 'fixed',
        price_modifier_type: 'fixed',
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
    toast.success(`Matriz generada: ${generated.length} variantes listas`)
  }, [activeGroups, totalPermutations, variants, basePrice, skuPrefix, onChange])

  // Bulk Apply Price
  const handleApplyBulkPrice = () => {
    const val = parseFloat(bulkPriceValue)
    if (isNaN(val)) {
      toast.error("Ingrese un valor numérico válido")
      return
    }
    const updated = variants.map(v => {
      let override: number | null = null
      let modifier = 0
      if (bulkPriceType === 'fixed') {
        override = val
      } else if (bulkPriceType === 'offset') {
        modifier = val
        override = Math.max(0, basePrice + val)
      } else if (bulkPriceType === 'percentage') {
        modifier = val
        override = Math.max(0, basePrice * (1 + val / 100))
      }
      return {
        ...v,
        price_type: bulkPriceType,
        price_modifier_type: bulkPriceType,
        price_modifier: modifier,
        price_override: override,
        price: override ?? basePrice,
      }
    })
    onChange(updated)
    toast.success(`Precios actualizados en ${updated.length} variantes`)
  }

  // Bulk Apply Stock
  const handleApplyBulkStock = () => {
    const qty = parseInt(bulkStockValue, 10)
    if (isNaN(qty)) {
      toast.error("Ingrese una cantidad entera válida")
      return
    }
    const updated = variants.map(v => ({
      ...v,
      inventory_quantity: Math.max(0, qty),
      stock_quantity: Math.max(0, qty),
      track_inventory: bulkTrackStock,
      track_stock: bulkTrackStock,
    }))
    onChange(updated)
    toast.success(`Inventario actualizado en ${updated.length} variantes`)
  }

  // Row update helper
  const handleUpdateRow = (index: number, patch: Partial<CatalogVariant>) => {
    const updated = [...variants]
    const current = updated[index]
    const merged = { ...current, ...patch }

    // Recalculate effective price if price fields changed
    if (patch.price_override !== undefined || patch.price_modifier !== undefined || patch.price_type !== undefined) {
      const pType = patch.price_type || current.price_type || 'fixed'
      if (pType === 'fixed') {
        merged.price = merged.price_override ?? basePrice
      } else if (pType === 'offset') {
        merged.price = Math.max(0, basePrice + Number(merged.price_modifier || 0))
      } else if (pType === 'percentage') {
        merged.price = Math.max(0, basePrice * (1 + Number(merged.price_modifier || 0) / 100))
      }
    }

    updated[index] = merged
    onChange(updated)
  }

  // Set default variant
  const handleSetDefault = (index: number) => {
    const updated = variants.map((v, i) => ({
      ...v,
      is_default: i === index,
    }))
    onChange(updated)
  }

  // Delete row
  const handleDeleteRow = (index: number) => {
    const updated = variants.filter((_, i) => i !== index)
    onChange(updated)
  }

  return (
    <div className="space-y-6">
      {/* Top Toolbar & Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-pink" />
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">
              Matriz de Variantes ({variants.length})
            </h3>
            {totalPermutations > 0 && (
              <Badge variant="outline" className="text-xs bg-white dark:bg-zinc-800">
                {totalPermutations} combinaciones posibles
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Precio base del producto: <span className="font-bold text-zinc-900 dark:text-white">${basePrice.toLocaleString()} COP</span>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateMatrix}
            disabled={disabled || activeGroups.length === 0}
            className="rounded-xl border-brand-pink/30 hover:bg-brand-pink/10 text-brand-pink text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Generar / Regenerar Matriz
          </Button>
          {onSave && (
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={disabled || isSaving || variants.length === 0}
              className="bg-brand-pink hover:bg-brand-pink/90 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              {isSaving ? "Guardando..." : "Guardar Variantes"}
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Action Controls */}
      {variants.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 shadow-xs">
          {/* Bulk Price */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              Edición Masiva de Precio
            </Label>
            <div className="flex items-center gap-2">
              <Select value={bulkPriceType} onValueChange={(val: any) => setBulkPriceType(val)}>
                <SelectTrigger className="w-[120px] h-9 text-xs rounded-xl">
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
                placeholder={bulkPriceType === "percentage" ? "+10%" : "50000"}
                value={bulkPriceValue}
                onChange={(e) => setBulkPriceValue(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleApplyBulkPrice}
                className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0"
              >
                Aplicar
              </Button>
            </div>
          </div>

          {/* Bulk Stock */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-blue-500" />
              Edición Masiva de Inventario
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Cantidad (ej: 25)"
                value={bulkStockValue}
                onChange={(e) => setBulkStockValue(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
              <div className="flex items-center gap-1.5 shrink-0 px-2">
                <Switch
                  checked={bulkTrackStock}
                  onCheckedChange={setBulkTrackStock}
                  id="bulk-track"
                />
                <Label htmlFor="bulk-track" className="text-[11px] cursor-pointer text-zinc-500">
                  Rastrear
                </Label>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleApplyBulkStock}
                className="h-9 px-3 rounded-xl text-xs font-semibold shrink-0"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Table */}
      {variants.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/30">
          <Layers className="h-10 w-10 text-zinc-400 mb-3" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
            No hay variantes generadas
          </h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-4">
            Selecciona atributos para este producto y haz clic en &ldquo;Generar Matriz&rdquo; para crear todas las combinaciones automáticamente.
          </p>
          <Button
            type="button"
            onClick={handleGenerateMatrix}
            disabled={disabled || activeGroups.length === 0}
            className="rounded-xl bg-brand-pink text-white text-xs font-bold px-6 h-9"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Generar Variantes Ahora
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden shadow-xs bg-white dark:bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/80">
              <TableRow>
                <TableHead className="w-[40px] text-center">Pred.</TableHead>
                <TableHead className="min-w-[180px]">Combinación / Título</TableHead>
                <TableHead className="min-w-[130px]">SKU</TableHead>
                <TableHead className="min-w-[120px]">Código Barras</TableHead>
                <TableHead className="min-w-[140px]">Tipo Precio</TableHead>
                <TableHead className="min-w-[120px]">Modificador / Precio</TableHead>
                <TableHead className="min-w-[100px]">Precio Final</TableHead>
                <TableHead className="min-w-[90px]">Stock</TableHead>
                <TableHead className="w-[80px] text-center">Rastrear</TableHead>
                <TableHead className="w-[70px] text-center">Activo</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v, idx) => {
                const effectivePrice = v.price_override ?? (
                  v.price_type === "offset"
                    ? Math.max(0, basePrice + Number(v.price_modifier || 0))
                    : v.price_type === "percentage"
                    ? Math.max(0, basePrice * (1 + Number(v.price_modifier || 0) / 100))
                    : basePrice
                )

                return (
                  <TableRow key={v.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50">
                    {/* Default Radio */}
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

                    {/* Combination Title */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-zinc-900 dark:text-white">
                          {v.title}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(v.attributes || {}).map(([grp, val]) => (
                            <Badge key={grp} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                              {grp}: {typeof val === "object" ? (val as any)?.value : String(val)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>

                    {/* SKU */}
                    <TableCell>
                      <Input
                        value={v.sku || ""}
                        onChange={(e) => handleUpdateRow(idx, { sku: e.target.value })}
                        placeholder="SKU-001"
                        className="h-8 text-xs font-mono rounded-lg"
                      />
                    </TableCell>

                    {/* Barcode */}
                    <TableCell>
                      <Input
                        value={v.barcode || ""}
                        onChange={(e) => handleUpdateRow(idx, { barcode: e.target.value })}
                        placeholder="770000000000"
                        className="h-8 text-xs font-mono rounded-lg"
                      />
                    </TableCell>

                    {/* Price Type */}
                    <TableCell>
                      <Select
                        value={v.price_type || "fixed"}
                        onValueChange={(val: any) => handleUpdateRow(idx, { price_type: val, price_modifier_type: val })}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Precio Fijo</SelectItem>
                          <SelectItem value="offset">Offset (+/- $)</SelectItem>
                          <SelectItem value="percentage">Offset (+/- %)</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Price Modifier / Override Value */}
                    <TableCell>
                      {v.price_type === "fixed" ? (
                        <Input
                          type="number"
                          value={v.price_override ?? basePrice}
                          onChange={(e) => handleUpdateRow(idx, { price_override: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-xs rounded-lg"
                        />
                      ) : (
                        <Input
                          type="number"
                          value={v.price_modifier ?? 0}
                          onChange={(e) => handleUpdateRow(idx, { price_modifier: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-xs rounded-lg"
                        />
                      )}
                    </TableCell>

                    {/* Effective Price */}
                    <TableCell>
                      <span className="font-extrabold text-xs text-zinc-900 dark:text-white">
                        ${Math.round(effectivePrice).toLocaleString()}
                      </span>
                    </TableCell>

                    {/* Inventory Quantity */}
                    <TableCell>
                      <Input
                        type="number"
                        value={v.inventory_quantity ?? 0}
                        disabled={!v.track_inventory}
                        onChange={(e) => handleUpdateRow(idx, {
                          inventory_quantity: parseInt(e.target.value, 10) || 0,
                          stock_quantity: parseInt(e.target.value, 10) || 0,
                        })}
                        className="h-8 text-xs rounded-lg w-20"
                      />
                    </TableCell>

                    {/* Track Inventory Switch */}
                    <TableCell className="text-center">
                      <Switch
                        checked={v.track_inventory || false}
                        onCheckedChange={(checked) => handleUpdateRow(idx, {
                          track_inventory: checked,
                          track_stock: checked,
                        })}
                      />
                    </TableCell>

                    {/* Active Switch */}
                    <TableCell className="text-center">
                      <Switch
                        checked={v.is_active !== false}
                        onCheckedChange={(checked) => handleUpdateRow(idx, { is_active: checked })}
                      />
                    </TableCell>

                    {/* Delete Row */}
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRow(idx)}
                        className="h-8 w-8 text-zinc-400 hover:text-red-600 rounded-lg"
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
    </div>
  )
}

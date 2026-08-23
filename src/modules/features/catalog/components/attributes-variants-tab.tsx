"use client"

import React, { useState, useEffect } from "react"
import {
  CatalogAttributeGroup,
  CatalogAttributeOption,
  AttributeSwatchType,
} from "@/types/catalog"
import {
  getAttributeGroupsAction,
  createAttributeGroupAction,
  updateAttributeGroupAction,
  deleteAttributeGroupAction,
} from "@/modules/features/catalog/attributes-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
  Palette,
  Sparkles,
  Shirt,
  Smartphone,
  Coffee,
  CheckCircle2,
  Info,
  Sliders,
  Building2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface AttributesVariantsTabProps {
  initialAttributeGroups?: CatalogAttributeGroup[]
  organizationId?: string
}

interface AttributePreset {
  id: string
  name: string
  desc: string
  icon: any
  groups: Array<{
    name: string
    slug: string
    swatch_type: AttributeSwatchType
    options: Array<{ label: string; value: string; hex_color?: string; swatch_value?: string }>
  }>
}

const ATTRIBUTE_PRESETS: AttributePreset[] = [
  {
    id: "fashion",
    name: "Moda & Ropa",
    desc: "Tallas (XS - XL) y Paleta de Colores Básicos",
    icon: Shirt,
    groups: [
      {
        name: "Talla",
        slug: "talla",
        swatch_type: "pill",
        options: [
          { label: "XS", value: "xs" },
          { label: "S", value: "s" },
          { label: "M", value: "m" },
          { label: "L", value: "l" },
          { label: "XL", value: "xl" },
        ],
      },
      {
        name: "Color",
        slug: "color",
        swatch_type: "color",
        options: [
          { label: "Negro", value: "negro", hex_color: "#09090b", swatch_value: "#09090b" },
          { label: "Blanco", value: "blanco", hex_color: "#ffffff", swatch_value: "#ffffff" },
          { label: "Azul Marino", value: "azul-marino", hex_color: "#1e3a8a", swatch_value: "#1e3a8a" },
          { label: "Rojo Carmín", value: "rojo-carmin", hex_color: "#dc2626", swatch_value: "#dc2626" },
          { label: "Verde Oliva", value: "verde-oliva", hex_color: "#65a30d", swatch_value: "#65a30d" },
        ],
      },
    ],
  },
  {
    id: "tech",
    name: "Tecnología & Hardware",
    desc: "Capacidades de memoria y Acabados de material",
    icon: Smartphone,
    groups: [
      {
        name: "Capacidad",
        slug: "capacidad",
        swatch_type: "pill",
        options: [
          { label: "128 GB", value: "128gb" },
          { label: "256 GB", value: "256gb" },
          { label: "512 GB", value: "512gb" },
          { label: "1 TB", value: "1tb" },
        ],
      },
      {
        name: "Acabado",
        slug: "acabado",
        swatch_type: "pill",
        options: [
          { label: "Titanio Natural", value: "titanio-natural" },
          { label: "Negro Espacial", value: "negro-espacial" },
          { label: "Plata Estelar", value: "plata-estelar" },
        ],
      },
    ],
  },
  {
    id: "food",
    name: "Gastronomía & Bebidas",
    desc: "Porciones (Tamaño) y Tipo de preparación / Leche",
    icon: Coffee,
    groups: [
      {
        name: "Tamaño",
        slug: "tamano",
        swatch_type: "pill",
        options: [
          { label: "Pequeño (8 oz)", value: "pequeno" },
          { label: "Mediano (12 oz)", value: "mediano" },
          { label: "Grande (16 oz)", value: "grande" },
        ],
      },
      {
        name: "Tipo de Leche",
        slug: "tipo-leche",
        swatch_type: "pill",
        options: [
          { label: "Entera", value: "entera" },
          { label: "Deslactosada", value: "deslactosada" },
          { label: "Almendras", value: "almendras" },
          { label: "Avena", value: "avena" },
        ],
      },
    ],
  },
  {
    id: "real_estate",
    name: "Inmobiliaria & Inmuebles",
    desc: "Estado de entrega y Tipo de vista",
    icon: Building2,
    groups: [
      {
        name: "Estado de Entrega",
        slug: "estado-entrega",
        swatch_type: "pill",
        options: [
          { label: "Obra Gris", value: "obra-gris" },
          { label: "Obra Blanca", value: "obra-blanca" },
          { label: "Totalmente Terminado", value: "terminado" },
          { label: "Amoblado / Equipado", value: "amoblado" },
        ],
      },
      {
        name: "Tipo de Vista",
        slug: "tipo-vista",
        swatch_type: "pill",
        options: [
          { label: "Vista Exterior Panorámica", value: "exterior-panoramica" },
          { label: "Vista Interior", value: "interior" },
          { label: "Vista a Reserva Natural", value: "reserva-natural" },
        ],
      },
    ],
  },
]

export function AttributesVariantsTab({
  initialAttributeGroups = [],
  organizationId,
}: AttributesVariantsTabProps) {
  const [attributeGroups, setAttributeGroups] = useState<CatalogAttributeGroup[]>(initialAttributeGroups)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<CatalogAttributeGroup | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isApplyingPreset, setIsApplyingPreset] = useState<string | null>(null)

  // Form State
  const [groupName, setGroupName] = useState("")
  const [groupSlug, setGroupSlug] = useState("")
  const [swatchType, setSwatchType] = useState<AttributeSwatchType>("pill")
  const [options, setOptions] = useState<CatalogAttributeOption[]>([])

  const loadGroups = async () => {
    setLoading(true)
    try {
      const data = await getAttributeGroupsAction(organizationId)
      setAttributeGroups(data || [])
    } catch (err) {
      console.error("Error loading attribute groups:", err)
      toast.error("Error al cargar grupos de atributos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialAttributeGroups.length === 0) {
      loadGroups()
    }
  }, [organizationId])

  const handleOpenCreate = () => {
    setEditingGroup(null)
    setGroupName("")
    setGroupSlug("")
    setSwatchType("pill")
    setOptions([
      { id: crypto.randomUUID(), label: "", value: "", order_index: 0 },
    ])
    setIsModalOpen(true)
  }

  const handleOpenEdit = (group: CatalogAttributeGroup) => {
    setEditingGroup(group)
    setGroupName(group.name)
    setGroupSlug(group.slug)
    setSwatchType(group.swatch_type || group.display_type || "pill")
    setOptions(
      group.options && group.options.length > 0
        ? group.options
        : [{ id: crypto.randomUUID(), label: "", value: "", order_index: 0 }]
    )
    setIsModalOpen(true)
  }

  const handleAddOption = () => {
    setOptions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", value: "", order_index: prev.length },
    ])
  }

  const handleRemoveOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleOptionChange = (idx: number, patch: Partial<CatalogAttributeOption>) => {
    setOptions((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], ...patch }
      if (patch.label && !copy[idx].value) {
        copy[idx].value = patch.label
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
      }
      return copy
    })
  }

  const handleSave = async () => {
    if (!groupName.trim()) {
      toast.error("El nombre del atributo es obligatorio (ej. Color, Talla, Material)")
      return
    }

    const validOptions = options
      .filter((o) => o.label.trim().length > 0)
      .map((o, idx) => ({
        ...o,
        price_modifier: o.price_modifier ?? 0,
        order_index: o.order_index ?? idx,
      }))

    if (validOptions.length === 0) {
      toast.error("Debe agregar al menos una opción válida para este atributo")
      return
    }

    const slug =
      groupSlug.trim() ||
      groupName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")

    setIsSaving(true)
    try {
      if (editingGroup) {
        const res = await updateAttributeGroupAction(editingGroup.id, {
          name: groupName,
          slug,
          swatch_type: swatchType,
          options: validOptions,
        })
        if (res.success) {
          toast.success("Grupo de atributos actualizado exitosamente")
          setIsModalOpen(false)
          loadGroups()
        } else {
          toast.error(res.error || "Error al actualizar atributo")
        }
      } else {
        const res = await createAttributeGroupAction({
          name: groupName,
          slug,
          swatch_type: swatchType,
          options: validOptions,
        })
        if (res.success) {
          toast.success("Grupo de atributos creado exitosamente")
          setIsModalOpen(false)
          loadGroups()
        } else {
          toast.error(res.error || "Error al crear atributo")
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `¿Eliminar el atributo "${name}"? Las variantes de productos que ya lo utilicen mantendrán sus valores guardados.`
      )
    ) {
      return
    }
    try {
      const res = await deleteAttributeGroupAction(id)
      if (res.success) {
        toast.success("Grupo de atributos eliminado")
        loadGroups()
      } else {
        toast.error(res.error || "Error al eliminar")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar")
    }
  }

  const handleApplyPreset = async (preset: AttributePreset) => {
    setIsApplyingPreset(preset.id)
    try {
      let createdCount = 0
      for (const group of preset.groups) {
        const existing = attributeGroups.find(
          (g) => g.slug === group.slug || g.name.toLowerCase() === group.name.toLowerCase()
        )
        if (!existing) {
          await createAttributeGroupAction({
            name: group.name,
            slug: group.slug,
            swatch_type: group.swatch_type,
            options: group.options.map((opt, idx) => ({
              id: crypto.randomUUID(),
              label: opt.label,
              value: opt.value,
              hex_color: opt.hex_color,
              swatch_value: opt.swatch_value,
              swatch_type: group.swatch_type,
              price_modifier: 0,
              order_index: idx,
            })),
          })
          createdCount++
        }
      }
      toast.success(
        createdCount > 0
          ? `Plantilla "${preset.name}" aplicada: se crearon ${createdCount} atributos nuevos.`
          : `Los atributos de la plantilla "${preset.name}" ya existen en tu catálogo.`
      )
      loadGroups()
    } catch (err: any) {
      toast.error(err.message || "Error al aplicar plantilla")
    } finally {
      setIsApplyingPreset(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Conceptual Clarity */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-brand-pink/10 text-brand-pink rounded-2xl shrink-0">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
                  Biblioteca de Atributos & Variantes
                </h2>
                <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold">
                  {attributeGroups.length} {attributeGroups.length === 1 ? "Atributo" : "Atributos"}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl mt-0.5 leading-relaxed">
                Define las especificaciones reutilizables (ej. Talla, Color, Capacidad, Acabado). Luego, en cada producto podrás elegir qué atributos aplican para generar sus combinaciones con precio y stock independientes.
              </p>
            </div>
          </div>

          <Button
            onClick={handleOpenCreate}
            className="bg-brand-pink hover:bg-brand-pink/90 text-white font-bold text-xs rounded-2xl h-11 px-5 shadow-lg shadow-brand-pink/20 cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Atributo
          </Button>
        </div>

        {/* 2. Quick Preset Templates Bar */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
            <Sparkles className="h-3.5 w-3.5 text-brand-pink" />
            <span>Plantillas Rápidas (Aditivas):</span>
            <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">
              (No sobreescribe ni modifica atributos existentes)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ATTRIBUTE_PRESETS.map((preset) => {
              const Icon = preset.icon
              const isApplying = isApplyingPreset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={isApplying}
                  onClick={() => handleApplyPreset(preset)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title={`${preset.desc} - Agrega sólo los atributos que aún no existan.`}
                >
                  <Icon className="h-3.5 w-3.5 text-brand-pink" />
                  <span>{preset.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 3. Grid of Attribute Groups */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-zinc-100 dark:bg-zinc-900/60 rounded-3xl animate-pulse border border-zinc-200 dark:border-zinc-800"
            />
          ))}
        </div>
      ) : attributeGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/20">
          <div className="h-16 w-16 rounded-3xl bg-brand-pink/10 text-brand-pink flex items-center justify-center mb-4">
            <Palette className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
            No tienes atributos globales configurados
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mb-6 leading-relaxed">
            Los atributos permiten que tus productos tengan selector de color, tallas o acabados en la tienda en vivo. Crea uno manualmente o haz clic en una plantilla rápida arriba.
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleOpenCreate}
              className="rounded-2xl bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-bold px-6 h-10 shadow-md cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Mi Primer Atributo
            </Button>
            <Button
              variant="outline"
              onClick={() => handleApplyPreset(ATTRIBUTE_PRESETS[0])}
              className="rounded-2xl text-xs font-semibold px-5 h-10 border-zinc-200 dark:border-zinc-800 cursor-pointer"
            >
              <Shirt className="h-4 w-4 mr-2 text-brand-pink" />
              Cargar Moda & Tallas
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {attributeGroups.map((group) => {
            const displayType = group.swatch_type || group.display_type || "pill"
            const optionsList = group.options || []

            return (
              <Card
                key={group.id}
                className="rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden bg-white dark:bg-zinc-950"
              >
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-black text-zinc-900 dark:text-white truncate">
                        {group.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full shrink-0"
                      >
                        {displayType === "color" ? "🎨 Color" : displayType === "image" ? "🖼️ Swatch" : "🏷️ Pills"}
                      </Badge>
                    </div>
                    <CardDescription className="text-[11px] font-mono text-zinc-400 truncate">
                      identificador: {group.slug}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(group)}
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl cursor-pointer"
                      title="Editar atributo"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(group.id, group.name)}
                      className="h-8 w-8 text-zinc-400 hover:text-red-600 rounded-xl cursor-pointer"
                      title="Eliminar atributo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-1 pb-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-zinc-500 mb-2 flex items-center justify-between">
                      <span>Opciones disponibles ({optionsList.length}):</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {optionsList.map((opt, oIdx) => (
                        <div
                          key={opt.id || oIdx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                        >
                          {displayType === "color" && (opt.swatch_value || opt.hex_color) && (
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/20 shrink-0 shadow-xs"
                              style={{
                                backgroundColor: opt.swatch_value || opt.hex_color,
                              }}
                            />
                          )}
                          <span>{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                    <span>Reutilizable en todo el catálogo</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(group)}
                      className="text-brand-pink font-bold hover:underline cursor-pointer"
                    >
                      + Añadir opción
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 4. Create / Edit Attribute Group Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-7 border border-zinc-200 dark:border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <Sliders className="h-5 w-5 text-brand-pink" />
              <span>{editingGroup ? "Editar Grupo de Atributos" : "Nuevo Grupo de Atributos"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Configura el tipo de visualización y las opciones (ej. Tallas S, M, L o Colores con código HEX).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Nombre del Atributo *
                </Label>
                <Input
                  placeholder="ej. Color, Talla, Material, Capacidad"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Tipo de Visualización (Swatch)
                </Label>
                <Select value={swatchType} onValueChange={(val: any) => setSwatchType(val)}>
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pill">Píldora de Texto (Pill)</SelectItem>
                    <SelectItem value="color">Muestra de Color (Paleta HEX)</SelectItem>
                    <SelectItem value="image">Muestra con Imagen (Swatch)</SelectItem>
                    <SelectItem value="select">Menú Desplegable (Select)</SelectItem>
                    <SelectItem value="radio">Botón de Radio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic Options List */}
            <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Opciones de este Atributo ({options.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  className="h-8 text-xs rounded-xl px-3 font-semibold border-brand-pink/30 text-brand-pink hover:bg-brand-pink/10 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar Opción
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {options.map((opt, idx) => (
                  <div
                    key={opt.id || idx}
                    className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800"
                  >
                    <span className="text-[10px] font-mono text-zinc-400 px-1 font-bold">
                      #{idx + 1}
                    </span>
                    <Input
                      placeholder="Etiqueta (ej. Rojo Carmín, XL, 256GB)"
                      value={opt.label}
                      onChange={(e) => handleOptionChange(idx, { label: e.target.value })}
                      className="h-9 text-xs rounded-xl flex-1 font-medium"
                    />

                    {swatchType === "color" && (
                      <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-zinc-800 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <input
                          type="color"
                          value={opt.swatch_value || opt.hex_color || "#3b82f6"}
                          onChange={(e) =>
                            handleOptionChange(idx, {
                              swatch_value: e.target.value,
                              hex_color: e.target.value,
                              swatch_type: "color",
                            })
                          }
                          className="h-7 w-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                          title="Seleccionar color"
                        />
                        <Input
                          placeholder="#3B82F6"
                          value={opt.swatch_value || opt.hex_color || ""}
                          onChange={(e) =>
                            handleOptionChange(idx, {
                              swatch_value: e.target.value,
                              hex_color: e.target.value,
                              swatch_type: "color",
                            })
                          }
                          className="h-7 w-20 text-[11px] font-mono rounded-lg border-none shadow-none px-1 uppercase"
                        />
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(idx)}
                      disabled={options.length <= 1}
                      className="h-8 w-8 text-zinc-400 hover:text-red-600 rounded-xl shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-2xl text-xs font-semibold h-10 px-5"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-2xl bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-bold px-6 h-10 shadow-md cursor-pointer"
            >
              {isSaving ? "Guardando..." : "Guardar Atributo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
} from "lucide-react"
import { toast } from "sonner"

export interface AttributesVariantsTabProps {
  initialAttributeGroups?: CatalogAttributeGroup[]
  organizationId?: string
}

export function AttributesVariantsTab({
  initialAttributeGroups = [],
  organizationId,
}: AttributesVariantsTabProps) {
  const [attributeGroups, setAttributeGroups] = useState<CatalogAttributeGroup[]>(initialAttributeGroups)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<CatalogAttributeGroup | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
    setOptions(group.options && group.options.length > 0 ? group.options : [
      { id: crypto.randomUUID(), label: "", value: "", order_index: 0 },
    ])
    setIsModalOpen(true)
  }

  const handleAddOption = () => {
    setOptions(prev => [
      ...prev,
      { id: crypto.randomUUID(), label: "", value: "", order_index: prev.length },
    ])
  }

  const handleRemoveOption = (idx: number) => {
    setOptions(prev => prev.filter((_, i) => i !== idx))
  }

  const handleOptionChange = (idx: number, patch: Partial<CatalogAttributeOption>) => {
    setOptions(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], ...patch }
      // Auto-generate value slug from label if empty
      if (patch.label && !copy[idx].value) {
        copy[idx].value = patch.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      }
      return copy
    })
  }

  const handleSave = async () => {
    if (!groupName.trim()) {
      toast.error("El nombre del atributo es obligatorio")
      return
    }

    const validOptions = options
      .filter(o => o.label.trim().length > 0)
      .map((o, idx) => ({
        ...o,
        price_modifier: o.price_modifier ?? 0,
        order_index: o.order_index ?? idx,
      }))
    if (validOptions.length === 0) {
      toast.error("Debe agregar al menos una opción válida con nombre")
      return
    }

    const slug = groupSlug.trim() || groupName.toLowerCase().replace(/[^a-z0-9]+/g, "-")

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
          toast.success("Grupo de atributos actualizado")
          setIsModalOpen(false)
          loadGroups()
        } else {
          toast.error(res.error || "Error al actualizar")
        }
      } else {
        const res = await createAttributeGroupAction({
          name: groupName,
          slug,
          swatch_type: swatchType,
          options: validOptions,
        })
        if (res.success) {
          toast.success("Grupo de atributos creado")
          setIsModalOpen(false)
          loadGroups()
        } else {
          toast.error(res.error || "Error al crear")
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el grupo de atributos "${name}"? Esta acción afectará a las variantes que lo utilicen.`)) {
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-zinc-900 to-zinc-950 text-white border border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-pink/20 rounded-xl text-brand-pink">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Atributos y Variantes Globales</h2>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl">
            Define especificaciones reutilizables (Color con paleta HEX, Talla, Material) para generar matrices de variantes automáticas en todo tu catálogo.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-brand-pink hover:bg-brand-pink/90 text-white font-bold text-xs rounded-2xl h-11 px-5 shadow-lg shadow-brand-pink/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Atributo
        </Button>
      </div>

      {/* Grid of Attribute Groups */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 bg-zinc-100 dark:bg-zinc-900 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : attributeGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/20">
          <Palette className="h-12 w-12 text-zinc-400 mb-3" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
            No tienes atributos creados
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mb-5">
            Crea tu primer grupo de atributos (ej. Color, Talla, Acabado) para empezar a crear variantes con precios y stock individuales.
          </p>
          <Button
            onClick={handleOpenCreate}
            className="rounded-2xl bg-brand-pink text-white text-xs font-bold px-6 h-10 shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Atributo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {attributeGroups.map(group => {
            const displayType = group.swatch_type || group.display_type || "pill"
            return (
              <Card key={group.id} className="rounded-3xl border border-zinc-200/80 dark:border-white/10 shadow-xs hover:shadow-md transition-all">
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-zinc-900 dark:text-white">
                        {group.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0">
                        {displayType}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs font-mono mt-0.5">
                      slug: {group.slug}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(group)}
                      className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(group.id, group.name)}
                      className="h-8 w-8 text-zinc-400 hover:text-red-600 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="text-xs font-semibold text-zinc-500 mb-2">
                    Opciones configuradas ({group.options?.length || 0}):
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {group.options?.map((opt, oIdx) => (
                      <div
                        key={opt.id || oIdx}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium"
                      >
                        {displayType === "color" && (opt.swatch_value || opt.hex_color) && (
                          <span
                            className="h-3 w-3 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: opt.swatch_value || opt.hex_color }}
                          />
                        )}
                        <span>{opt.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingGroup ? "Editar Grupo de Atributos" : "Nuevo Grupo de Atributos"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configura el tipo de visualización y las opciones disponibles para este atributo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nombre del Atributo</Label>
                <Input
                  placeholder="ej. Color, Talla, Material"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tipo de Visualización (Swatch)</Label>
                <Select value={swatchType} onValueChange={(val: any) => setSwatchType(val)}>
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pill">Píldora de Texto (Pill)</SelectItem>
                    <SelectItem value="color">Muestra de Color (Hex Color)</SelectItem>
                    <SelectItem value="image">Muestra con Imagen (Swatch)</SelectItem>
                    <SelectItem value="select">Menú Desplegable (Select)</SelectItem>
                    <SelectItem value="radio">Botón de Radio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dynamic Options List */}
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Opciones del Atributo</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  className="h-7 text-xs rounded-lg px-2.5"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar Opción
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {options.map((opt, idx) => (
                  <div key={opt.id || idx} className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <Input
                      placeholder="Etiqueta (ej. Azul Marino)"
                      value={opt.label}
                      onChange={e => handleOptionChange(idx, { label: e.target.value })}
                      className="h-8 text-xs rounded-lg flex-1"
                    />

                    {swatchType === "color" && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={opt.swatch_value || opt.hex_color || "#3b82f6"}
                          onChange={e => handleOptionChange(idx, {
                            swatch_value: e.target.value,
                            hex_color: e.target.value,
                            swatch_type: "color",
                          })}
                          className="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                          title="Seleccionar color"
                        />
                        <Input
                          placeholder="#3B82F6"
                          value={opt.swatch_value || opt.hex_color || ""}
                          onChange={e => handleOptionChange(idx, {
                            swatch_value: e.target.value,
                            hex_color: e.target.value,
                            swatch_type: "color",
                          })}
                          className="h-8 w-24 text-xs font-mono rounded-lg"
                        />
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(idx)}
                      disabled={options.length <= 1}
                      className="h-8 w-8 text-zinc-400 hover:text-red-600 rounded-lg shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-brand-pink text-white text-xs font-bold px-6"
            >
              {isSaving ? "Guardando..." : "Guardar Atributo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

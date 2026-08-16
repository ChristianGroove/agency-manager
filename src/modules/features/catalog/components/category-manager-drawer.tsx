"use client"

import React, { useState, useEffect } from "react"
import {
  ServiceCategory,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/modules/features/catalog/categories-actions"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Folder,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Coffee,
  Briefcase,
  Zap,
  Star,
  Shield,
  Box,
  Smartphone,
  Palette,
  Code,
  Camera,
  Music,
  Video,
  Award,
  Heart,
  Flame,
  Globe,
  Compass,
  Cpu,
  Layers,
  Tag,
  ShoppingBag,
  Package,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

export const ICON_OPTIONS = [
  { name: "Folder", icon: Folder },
  { name: "Tag", icon: Tag },
  { name: "ShoppingBag", icon: ShoppingBag },
  { name: "Package", icon: Package },
  { name: "Sparkles", icon: Sparkles },
  { name: "Coffee", icon: Coffee },
  { name: "Briefcase", icon: Briefcase },
  { name: "Zap", icon: Zap },
  { name: "Star", icon: Star },
  { name: "Shield", icon: Shield },
  { name: "Box", icon: Box },
  { name: "Smartphone", icon: Smartphone },
  { name: "Palette", icon: Palette },
  { name: "Code", icon: Code },
  { name: "Camera", icon: Camera },
  { name: "Music", icon: Music },
  { name: "Video", icon: Video },
  { name: "Award", icon: Award },
  { name: "Heart", icon: Heart },
  { name: "Flame", icon: Flame },
  { name: "Globe", icon: Globe },
  { name: "Compass", icon: Compass },
  { name: "Cpu", icon: Cpu },
  { name: "Layers", icon: Layers },
]

export const COLOR_OPTIONS = [
  { name: "blue", bg: "bg-blue-500", text: "text-blue-500", light: "bg-blue-50 dark:bg-blue-950/40" },
  { name: "purple", bg: "bg-purple-500", text: "text-purple-500", light: "bg-purple-50 dark:bg-purple-950/40" },
  { name: "pink", bg: "bg-pink-500", text: "text-pink-500", light: "bg-pink-50 dark:bg-pink-950/40" },
  { name: "indigo", bg: "bg-indigo-500", text: "text-indigo-500", light: "bg-indigo-50 dark:bg-indigo-950/40" },
  { name: "green", bg: "bg-green-500", text: "text-green-500", light: "bg-green-50 dark:bg-green-950/40" },
  { name: "orange", bg: "bg-orange-500", text: "text-orange-500", light: "bg-orange-50 dark:bg-orange-950/40" },
  { name: "cyan", bg: "bg-cyan-500", text: "text-cyan-500", light: "bg-cyan-50 dark:bg-cyan-950/40" },
  { name: "amber", bg: "bg-amber-500", text: "text-amber-500", light: "bg-amber-50 dark:bg-amber-950/40" },
  { name: "gray", bg: "bg-gray-500", text: "text-gray-500", light: "bg-gray-50 dark:bg-gray-950/40" },
  { name: "red", bg: "bg-red-500", text: "text-red-500", light: "bg-red-50 dark:bg-red-950/40" },
]

export interface CategoryManagerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CategoryManagerDrawer({
  open,
  onOpenChange,
  onSuccess,
}: CategoryManagerDrawerProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [isFormView, setIsFormView] = useState(false)

  // Form State
  const [name, setName] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("Folder")
  const [selectedColor, setSelectedColor] = useState("pink")
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getCategories()
      setCategories(data || [])
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar categorías")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadData()
      setIsFormView(false)
    }
  }, [open])

  const handleOpenCreate = () => {
    setEditingCategory(null)
    setName("")
    setSelectedIcon("Folder")
    setSelectedColor("pink")
    setIsFormView(true)
  }

  const handleOpenEdit = (cat: ServiceCategory) => {
    setEditingCategory(cat)
    setName(cat.name)
    setSelectedIcon(cat.icon || "Folder")
    setSelectedColor(cat.color || "pink")
    setIsFormView(true)
  }

  const handleSaveForm = async () => {
    if (!name.trim()) {
      toast.error("El nombre de la categoría es obligatorio")
      return
    }

    setIsSaving(true)
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
        })
        toast.success("Categoría actualizada")
      } else {
        await createCategory({
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
        })
        toast.success("Categoría creada con éxito")
      }
      setIsFormView(false)
      loadData()
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Error al guardar categoría")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`¿Eliminar la categoría "${catName}"?`)) return
    try {
      await deleteCategory(id)
      toast.success("Categoría eliminada")
      loadData()
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar categoría")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[540px] w-full p-0 gap-0 border-none shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col"
      >
        {/* Drawer Header */}
        <SheetHeader className="px-6 py-5 border-b border-zinc-100 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-pink/10 rounded-2xl text-brand-pink">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold text-zinc-900 dark:text-white">
                {isFormView ? (editingCategory ? "Editar Categoría" : "Nueva Categoría") : "Gestor de Categorías"}
              </SheetTitle>
              <SheetDescription className="text-xs text-zinc-500">
                {isFormView ? "Personaliza nombre, icono y color" : "Organiza y clasifica tus servicios y productos"}
              </SheetDescription>
            </div>
          </div>

          {!isFormView && (
            <Button
              onClick={handleOpenCreate}
              className="bg-brand-pink hover:bg-brand-pink/90 text-white rounded-xl text-xs font-bold h-9 px-4 shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva
            </Button>
          )}
        </SheetHeader>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isFormView ? (
            /* CREATE / EDIT FORM VIEW */
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nombre de la Categoría</Label>
                <Input
                  placeholder="ej. Marketing Digital, Diseño Web, Calzado"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              {/* Color Swatch Picker */}
              <div className="space-y-2">
                <Label className="text-xs font-bold">Color Identificador</Label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_OPTIONS.map(col => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => setSelectedColor(col.name)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-xl border text-xs capitalize transition-all",
                        selectedColor === col.name
                          ? "border-brand-pink bg-brand-pink/5 font-bold"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                      )}
                    >
                      <span className={cn("h-3.5 w-3.5 rounded-full shrink-0", col.bg)} />
                      <span className="truncate">{col.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Grid Picker */}
              <div className="space-y-2">
                <Label className="text-xs font-bold">Icono Representativo</Label>
                <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  {ICON_OPTIONS.map(item => {
                    const IconComp = item.icon
                    const isSelected = selectedIcon === item.name
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setSelectedIcon(item.name)}
                        className={cn(
                          "p-3 rounded-xl border flex flex-col items-center justify-center transition-all",
                          isSelected
                            ? "border-brand-pink bg-brand-pink/10 text-brand-pink shadow-xs"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        )}
                        title={item.name}
                      >
                        <IconComp className="h-5 w-5" />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons in Form View */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormView(false)}
                  className="rounded-xl text-xs h-10 px-4"
                >
                  Volver a la Lista
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveForm}
                  disabled={isSaving}
                  className="bg-brand-pink hover:bg-brand-pink/90 text-white rounded-xl text-xs font-bold h-10 px-6"
                >
                  {isSaving ? "Guardando..." : "Guardar Categoría"}
                </Button>
              </div>
            </div>
          ) : (
            /* CATEGORIES LIST VIEW */
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/50">
                  <FolderOpen className="h-10 w-10 text-zinc-400 mb-2" />
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">No hay categorías</p>
                  <p className="text-xs text-zinc-500 mb-4">Crea tu primera categoría para clasificar tu oferta</p>
                  <Button onClick={handleOpenCreate} className="bg-brand-pink text-white text-xs rounded-xl font-bold">
                    Crear Categoría
                  </Button>
                </div>
              ) : (
                categories.map(cat => {
                  const iconObj = ICON_OPTIONS.find(i => i.name === cat.icon) || { icon: Folder }
                  const IconComponent = iconObj.icon
                  const colorObj = COLOR_OPTIONS.find(c => c.name === cat.color) || COLOR_OPTIONS[0]

                  return (
                    <div
                      key={cat.id}
                      className="group flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs hover:border-brand-pink/40 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("p-2.5 rounded-xl shrink-0", colorObj.light)}>
                          <IconComponent className={cn("h-5 w-5", colorObj.text)} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                            {cat.name}
                          </h4>
                          <span className="text-[11px] text-zinc-400 font-mono">
                            /{cat.slug}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(cat)}
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="h-8 w-8 text-zinc-400 hover:text-red-600 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

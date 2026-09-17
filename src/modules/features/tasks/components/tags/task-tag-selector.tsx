"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import {
  Tag,
  Plus,
  X,
  Check,
  Search,
  Star,
  Trash2,
  ChevronsUpDown,
  Sparkles,
  Loader2,
  AlertTriangle
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { cn } from "@/modules/infrastructure/utils/utils"
import { TenantTaskTag, DEFAULT_TENANT_TASK_TAGS, SYSTEM_STAGE_TAGS } from "../../types"
import {
  getTenantTaskTags,
  createTenantTaskTag,
  toggleFavoriteTenantTaskTag,
  deleteTenantTaskTag,
  getTagUsageCount
} from "../../actions/task-tag-actions"
import { toast } from "sonner"

interface TaskTagSelectorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  readOnly?: boolean
  canManageCatalog?: boolean // PM in portal or Platform admin
  portalToken?: string
  organizationId?: string
  className?: string
}

export function getTagColorInfo(colorName?: string) {
  switch (colorName?.toLowerCase()) {
    case "red":
      return {
        badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
        dot: "bg-red-500",
        pill: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
      }
    case "purple":
      return {
        badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        dot: "bg-purple-500",
        pill: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
      }
    case "amber":
    case "orange":
      return {
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        dot: "bg-amber-500",
        pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
      }
    case "emerald":
    case "green":
      return {
        badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-500",
        pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
      }
    case "blue":
      return {
        badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        dot: "bg-blue-500",
        pill: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
      }
    case "indigo":
      return {
        badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        dot: "bg-indigo-500",
        pill: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
      }
    case "rose":
    case "pink":
      return {
        badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
        dot: "bg-rose-500",
        pill: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
      }
    case "cyan":
      return {
        badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
        dot: "bg-cyan-500",
        pill: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
      }
    default:
      return {
        badge: "bg-secondary text-secondary-foreground border-border/80",
        dot: "bg-slate-400 dark:bg-slate-500",
        pill: "bg-secondary text-secondary-foreground border-border/80"
      }
  }
}

export function TaskTagSelector({
  tags = [],
  onChange,
  readOnly = false,
  canManageCatalog = true,
  portalToken,
  organizationId,
  className,
}: TaskTagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [catalogTags, setCatalogTags] = useState<TenantTaskTag[]>(DEFAULT_TENANT_TASK_TAGS)
  const [canManage, setCanManage] = useState(canManageCatalog)

  // Deletion confirmation state
  const [tagToDelete, setTagToDelete] = useState<{
    id: string
    name: string
    label: string
  } | null>(null)
  const [tagUsageCount, setTagUsageCount] = useState<number | null>(null)
  const [checkingUsage, setCheckingUsage] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const currentTags = Array.isArray(tags) ? tags : []

  // Load catalog on mount and when popover opens
  const fetchCatalog = async () => {
    try {
      setLoadingCatalog(true)
      const res = await getTenantTaskTags(organizationId, portalToken)
      if (res.success && res.tags) {
        setCatalogTags(res.tags)
        setCanManage(res.canManageCatalog)
      }
    } catch (err) {
      console.error("Error cargando etiquetas:", err)
    } finally {
      setLoadingCatalog(false)
    }
  }

  useEffect(() => {
    fetchCatalog()
  }, [organizationId, portalToken])

  // Combine catalog tags with any orphan tags currently on the task
  const allAvailableTags = useMemo(() => {
    const map = new Map<string, TenantTaskTag>()

    // 1. Add catalog tags
    for (const ct of catalogTags) {
      map.set(ct.id.toLowerCase(), ct)
    }

    // 2. Add current task tags if not present
    for (const t of currentTags) {
      const lower = t.toLowerCase()
      if (!map.has(lower)) {
        const sys = SYSTEM_STAGE_TAGS[lower]
        map.set(lower, {
          id: lower,
          name: lower,
          label: sys?.shortLabel || sys?.label || lower,
          color: sys?.color || "blue",
          is_favorite: false
        })
      }
    }

    return Array.from(map.values())
  }, [catalogTags, currentTags])

  // Split into favorites and regular
  const { favoriteTags, regularTags } = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^[#@]+/, "")
    const filtered = allAvailableTags.filter(
      (t) =>
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.label.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
    )

    const favs = filtered.filter((t) => t.is_favorite)
    const regulars = filtered.filter((t) => !t.is_favorite)

    return { favoriteTags: favs, regularTags: regulars }
  }, [allAvailableTags, search])

  // Toggle selection of a tag on the task
  const handleToggleTag = (tagId: string) => {
    if (readOnly) return
    const exists = currentTags.some((t) => t.toLowerCase() === tagId.toLowerCase())
    if (exists) {
      onChange(currentTags.filter((t) => t.toLowerCase() !== tagId.toLowerCase()))
    } else {
      onChange([...currentTags, tagId])
    }
  }

  // Remove a tag from the task
  const handleRemoveTag = (tagToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (readOnly) return
    onChange(currentTags.filter((t) => t.toLowerCase() !== tagToRemove.toLowerCase()))
  }

  // Create new tag globally in tenant
  const handleCreateNewTag = async () => {
    const raw = search.trim().replace(/^[#@]+/, "")
    if (!raw) return

    setIsCreating(true)
    try {
      const res = await createTenantTaskTag(
        {
          name: raw,
          label: raw,
          color: "blue",
          is_favorite: false,
          orgId: organizationId
        },
        portalToken
      )

      if (res.success && res.tag) {
        toast.success(`Etiqueta #${res.tag.name} creada exitosamente`)
        // Update catalog local state
        setCatalogTags((prev) => {
          if (prev.some((t) => t.id === res.tag!.id)) return prev
          return [...prev, res.tag!]
        })
        // Automatically select it on the task
        if (!currentTags.includes(res.tag.id)) {
          onChange([...currentTags, res.tag.id])
        }
        setSearch("")
      } else {
        toast.error(res.error || "No se pudo crear la etiqueta")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al crear la etiqueta")
    } finally {
      setIsCreating(false)
    }
  }

  // Toggle favorite in catalog
  const handleToggleFavorite = async (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canManage) return

    try {
      const res = await toggleFavoriteTenantTaskTag(tagId, organizationId, portalToken)
      if (res.success && res.tags) {
        setCatalogTags(res.tags)
      }
    } catch (err: any) {
      toast.error("Error al actualizar etiqueta favorita")
    }
  }

  // Request delete from catalog (opens confirmation modal with usage count)
  const handleRequestDelete = async (
    tag: { id: string; name: string; label: string },
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    if (!canManage) return

    setTagToDelete(tag)
    setTagUsageCount(null)
    setCheckingUsage(true)

    try {
      const res = await getTagUsageCount(tag.id, organizationId, portalToken)
      if (res.success) {
        setTagUsageCount(res.count)
      } else {
        setTagUsageCount(0)
      }
    } catch {
      setTagUsageCount(0)
    } finally {
      setCheckingUsage(false)
    }
  }

  // Confirm delete from catalog
  const handleConfirmDelete = async () => {
    if (!tagToDelete || !canManage) return
    setIsDeleting(true)

    try {
      const res = await deleteTenantTaskTag(tagToDelete.id, organizationId, portalToken)
      if (res.success && res.tags) {
        setCatalogTags(res.tags)
        // Also remove from task if present
        if (currentTags.some((t) => t.toLowerCase() === tagToDelete.id.toLowerCase())) {
          onChange(currentTags.filter((t) => t.toLowerCase() !== tagToDelete.id.toLowerCase()))
        }
        toast.success(`Etiqueta #${tagToDelete.name} eliminada del catálogo`)
        setTagToDelete(null)
      } else {
        toast.error(res.error || "No se pudo eliminar la etiqueta")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar etiqueta")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const q = search.trim().toLowerCase().replace(/^[#@]+/, "")
      const exactMatch = allAvailableTags.find(
        (t) => t.name.toLowerCase() === q || t.id.toLowerCase() === q
      )
      if (exactMatch) {
        handleToggleTag(exactMatch.id)
        setSearch("")
      } else if (canManage && q) {
        handleCreateNewTag()
      }
    }
  }

  const cleanSearch = search.trim().replace(/^[#@]+/, "")
  const hasExactMatch = allAvailableTags.some(
    (t) => t.name.toLowerCase() === cleanSearch.toLowerCase() || t.id.toLowerCase() === cleanSearch.toLowerCase()
  )

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-muted-foreground" />
          Etiquetas
        </label>
      </div>

      {/* Popover Combobox Selector */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] p-1.5 bg-background border border-border/70 rounded-xl transition-all hover:border-border">
          {/* Selected Tag Badges */}
          {currentTags.map((tagKey) => {
            const found = allAvailableTags.find(
              (t) => t.id.toLowerCase() === tagKey.toLowerCase() || t.name.toLowerCase() === tagKey.toLowerCase()
            )
            const colorInfo = getTagColorInfo(found?.color)
            const label = found?.label || SYSTEM_STAGE_TAGS[tagKey]?.shortLabel || tagKey

            return (
              <span
                key={tagKey}
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-2xs transition-all",
                  colorInfo.pill
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", colorInfo.dot)} />
                <span className="truncate max-w-[120px]">{label}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveTag(tagKey, e)}
                    className="hover:opacity-75 focus:outline-none ml-0.5 rounded-full"
                    title={`Quitar ${label}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            )
          })}

          {/* Trigger Button to Open Popover */}
          {!readOnly && (
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors focus:outline-none",
                  currentTags.length === 0 && "w-full justify-between py-1.5"
                )}
              >
                {currentTags.length === 0 ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Plus className="w-3.5 h-3.5" />
                    Seleccionar etiquetas...
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-primary">
                    <Plus className="w-3 h-3" />
                    Añadir
                  </span>
                )}
                <ChevronsUpDown className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
              </button>
            </PopoverTrigger>
          )}

          {readOnly && currentTags.length === 0 && (
            <span className="text-[11px] text-muted-foreground/70 italic px-1">
              Sin etiquetas asignadas
            </span>
          )}
        </div>

        {/* Dropdown Content */}
        <PopoverContent
          className="w-72 p-2 z-[60] shadow-2xl rounded-2xl border border-border/80 bg-popover text-popover-foreground"
          align="start"
          sideOffset={6}
        >
          {/* Search Box */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar o filtrar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-muted/50 border border-border/60 text-xs rounded-xl pl-8 pr-2 h-8 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Option to create tag (PM or Platform only) */}
          {canManage && cleanSearch && !hasExactMatch && (
            <button
              type="button"
              onClick={handleCreateNewTag}
              disabled={isCreating}
              className="w-full text-left px-2.5 py-1.5 mb-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-2"
            >
              {isCreating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span className="truncate">Crear global "#{cleanSearch}"</span>
            </button>
          )}

          {/* Non-PM hint when search has no results */}
          {!canManage && cleanSearch && !hasExactMatch && favoriteTags.length === 0 && regularTags.length === 0 && (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              No encontrada. Solo los gestores de proyecto pueden crear nuevas etiquetas.
            </div>
          )}

          {/* Tag List */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {/* Section 1: FAVORITES (⭐ Predominan siempre arriba) */}
            {favoriteTags.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-amber-500/90 flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  Favoritas
                </div>
                <div className="space-y-0.5">
                  {favoriteTags.map((tag) => {
                    const isSelected = currentTags.some((t) => t.toLowerCase() === tag.id.toLowerCase())
                    const colorInfo = getTagColorInfo(tag.color)

                    return (
                      <div
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors group select-none",
                          isSelected ? "bg-primary/10 font-semibold" : "hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", colorInfo.dot)} />
                          <span className="truncate text-foreground text-xs">{tag.label}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleToggleFavorite(tag.id, e)}
                                className="p-1 text-amber-500 hover:opacity-75 transition-opacity"
                                title="Quitar de favoritas"
                              >
                                <Star className="w-3 h-3 fill-amber-500" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleRequestDelete(tag, e)}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                title="Eliminar del catálogo global"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Section 2: REGULAR TAGS */}
            {regularTags.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                  Otras Etiquetas
                </div>
                <div className="space-y-0.5">
                  {regularTags.map((tag) => {
                    const isSelected = currentTags.some((t) => t.toLowerCase() === tag.id.toLowerCase())
                    const colorInfo = getTagColorInfo(tag.color)

                    return (
                      <div
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors group select-none",
                          isSelected ? "bg-primary/10 font-semibold" : "hover:bg-muted/60"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", colorInfo.dot)} />
                          <span className="truncate text-foreground text-xs">{tag.label}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleToggleFavorite(tag.id, e)}
                                className="p-1 text-muted-foreground hover:text-amber-500 transition-colors"
                                title="Marcar como favorita"
                              >
                                <Star className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleRequestDelete(tag, e)}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                title="Eliminar del catálogo global"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {favoriteTags.length === 0 && regularTags.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No hay etiquetas que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Confirmation Dialog for Tag Deletion */}
      <AlertDialog open={!!tagToDelete} onOpenChange={(open) => !open && setTagToDelete(null)}>
        <AlertDialogContent className="z-[70] max-w-md rounded-2xl border-border bg-background p-6 shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-foreground">
                  ¿Eliminar etiqueta "#{tagToDelete?.name}"?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Esta acción retirará la etiqueta del catálogo global de la organización.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="my-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-2.5">
            {checkingUsage ? (
              <div className="flex items-center gap-2 text-muted-foreground py-1">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="font-medium">Consultando tareas que usan esta etiqueta...</span>
              </div>
            ) : tagUsageCount !== null && tagUsageCount > 0 ? (
              <div className="text-amber-600 dark:text-amber-400 font-medium flex items-start gap-2 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Atención: Esta etiqueta está asignada actualmente a <strong>{tagUsageCount}</strong> {tagUsageCount === 1 ? "tarea" : "tareas"}.
                </span>
              </div>
            ) : (
              <div className="text-muted-foreground flex items-center gap-2 bg-muted/60 p-2.5 rounded-lg">
                <span>ℹ️ Esta etiqueta no está asignada a ninguna tarea actualmente.</span>
              </div>
            )}

            <div className="text-[11px] text-muted-foreground/90 border-t border-border/40 pt-2 space-y-1">
              <p className="font-semibold text-foreground/90">¿Qué sucederá después de eliminarla?</p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li>
                  Ya <strong>no aparecerá en el catálogo</strong> ni podrá ser seleccionada en nuevas tareas.
                </li>
                <li>
                  Las tareas que ya la tengan asignada <strong>conservarán la etiqueta como texto histórico</strong> para preservar la trazabilidad.
                </li>
              </ul>
            </div>
          </div>

          <AlertDialogFooter className="flex items-center justify-end gap-2 pt-1">
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setTagToDelete(null)}
              className="h-9 px-4 text-xs font-semibold rounded-xl"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="h-9 px-4 text-xs font-semibold rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              {isDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Eliminando...
                </span>
              ) : (
                "Eliminar del Catálogo"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

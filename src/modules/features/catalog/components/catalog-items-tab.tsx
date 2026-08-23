"use client"

import React, { useState, useMemo } from "react"
import {
  UniversalCatalogItem,
  CatalogClassification,
  CatalogVariant,
  CatalogAttributeGroup,
  StorefrontThemeConfig,
  StorefrontIndustryPreset,
} from "@/types/catalog"
import { ServiceCategory } from "@/modules/features/catalog/categories-actions"
import {
  deleteCatalogItemAction,
  duplicateCatalogItemAction,
  updateCatalogItemAction,
} from "@/modules/features/catalog/actions"
import { CatalogItemFormSheet } from "./catalog-item-form-sheet"
import { CategoryManagerDrawer } from "./category-manager-drawer"
import { QRCodeDialog } from "./qr-code-dialog"
import { AICopywriterDialog } from "./ai-copywriter-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  QrCode,
  Sparkles,
  Eye,
  EyeOff,
  FolderOpen,
  Box,
  FileCode2,
  Briefcase,
  Repeat,
  Layers,
  CheckCircle2,
  Package,
  Zap,
  Building2,
  MapPin,
  Tag,
  Key,
  CalendarRange,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface CatalogItemsTabProps {
  items: UniversalCatalogItem[]
  categories: ServiceCategory[]
  attributeGroups?: CatalogAttributeGroup[]
  isLoading?: boolean
  onRefresh: () => Promise<void>
  spaceType?: string
  portalToken?: string | null
  organizationId?: string | null
  themeConfig?: StorefrontThemeConfig
  industryPreset?: StorefrontIndustryPreset | string
}

const CLASSIFICATION_FILTERS: Array<{ id: string; label: string; icon?: any }> = [
  { id: "all", label: "Todos" },
  { id: "real_estate", label: "Inmuebles", icon: Building2 },
  { id: "service", label: "Servicios", icon: Briefcase },
  { id: "physical", label: "Físicos", icon: Box },
  { id: "digital", label: "Digitales", icon: FileCode2 },
  { id: "subscription", label: "Suscripciones", icon: Repeat },
]

export function CatalogItemsTab({
  items = [],
  categories = [],
  attributeGroups = [],
  isLoading = false,
  onRefresh,
  spaceType = "agency",
  portalToken,
  organizationId,
  themeConfig,
  industryPreset,
}: CatalogItemsTabProps) {
  const activePreset = industryPreset || themeConfig?.industry_preset

  const dynamicClassificationFilters = useMemo(() => {
    let priorityId: string = "service"
    if (activePreset === "real_estate") {
      priorityId = "real_estate"
    } else if (activePreset === "physical_retail") {
      priorityId = "physical"
    } else if (activePreset === "digital_software") {
      priorityId = "digital"
    } else if (activePreset === "professional_services") {
      priorityId = "service"
    } else if (spaceType === "resto") {
      priorityId = "physical"
    }

    const allFilter: { id: string; label: string; icon?: any } = { id: "all", label: "Todos" }
    const rest = [...CLASSIFICATION_FILTERS.filter((f) => f.id !== "all")]
    rest.sort((a, b) => {
      if (a.id === priorityId) return -1
      if (b.id === priorityId) return 1
      return 0
    })
    return [allFilter, ...rest]
  }, [activePreset, spaceType])

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClassification, setSelectedClassification] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden" | "low_stock" | "out_of_stock">("all")

  // Sheet & Dialog states
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<UniversalCatalogItem | null>(null)
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false)
  const [qrItem, setQrItem] = useState<UniversalCatalogItem | null>(null)
  const [aiItem, setAiItem] = useState<UniversalCatalogItem | null>(null)

  // Filtered items logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search Query
      const query = searchTerm.toLowerCase().trim()
      if (query) {
        const matchesName = item.name.toLowerCase().includes(query)
        const matchesDesc = (item.description || "").toLowerCase().includes(query)
        const matchesSku = (item.sku || "").toLowerCase().includes(query)
        const matchesBarcode = (item.barcode || "").toLowerCase().includes(query)
        const re = item.real_estate_details || item.classification_metadata?.real_estate
        const matchesRe = Boolean(
          re && (
            re.neighborhood?.toLowerCase().includes(query) ||
            re.city?.toLowerCase().includes(query) ||
            re.address?.toLowerCase().includes(query) ||
            re.property_type?.toLowerCase().includes(query)
          )
        )
        if (!matchesName && !matchesDesc && !matchesSku && !matchesBarcode && !matchesRe) {
          return false
        }
      }

      // 2. Classification
      if (selectedClassification !== "all") {
        const itemClass =
          item.classification ||
          (item.type === "recurring"
            ? "subscription"
            : item.type === "product"
            ? "physical"
            : "service")
        if (itemClass !== selectedClassification) return false
      }

      // 3. Category
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false
      }

      // 4. Status Filter
      if (statusFilter === "active" && item.is_visible_in_portal === false) {
        return false
      }
      if (statusFilter === "hidden" && item.is_visible_in_portal !== false) {
        return false
      }
      if (statusFilter === "low_stock") {
        const qty = item.inventory_quantity ?? 0
        if (!item.track_inventory || qty <= 0 || qty > (item.low_stock_threshold || 5)) {
          return false
        }
      }
      if (statusFilter === "out_of_stock") {
        const qty = item.inventory_quantity ?? 0
        if (!item.track_inventory || qty > 0) {
          return false
        }
      }

      return true
    })
  }, [items, searchTerm, selectedClassification, selectedCategory, statusFilter])

  const handleCreate = () => {
    setEditingItem(null)
    setIsFormSheetOpen(true)
  }

  const handleEdit = (item: UniversalCatalogItem) => {
    setEditingItem(item)
    setIsFormSheetOpen(true)
  }

  const handleDuplicate = async (item: UniversalCatalogItem) => {
    try {
      const res = await duplicateCatalogItemAction(item.id)
      if (res.success) {
        toast.success(`Copia creada: "${item.name} (Copia)"`)
        await onRefresh()
      } else {
        toast.error(res.error || "Error al duplicar item")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al duplicar")
    }
  }

  const handleDelete = async (item: UniversalCatalogItem) => {
    if (!confirm(`¿Estás seguro de eliminar "${item.name}"?`)) return
    try {
      const res = await deleteCatalogItemAction(item.id)
      if (res.success) {
        toast.success("Producto / servicio eliminado")
        await onRefresh()
      } else {
        toast.error(res.error || "Error al eliminar")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar")
    }
  }

  const handleToggleVisibility = async (item: UniversalCatalogItem) => {
    const newVisibility = !item.is_visible_in_portal
    try {
      const res = await updateCatalogItemAction(item.id, {
        is_visible_in_portal: newVisibility,
      })
      if (res.success) {
        toast.success(newVisibility ? "Visible en la tienda" : "Oculto de la tienda")
        await onRefresh()
      } else {
        toast.error(res.error || "Error al actualizar visibilidad")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar visibilidad")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            Catálogo de Productos & Servicios
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Gestiona productos físicos, digitales, suscripciones, stock en tiempo real y precios.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryDrawerOpen(true)}
            className="rounded-2xl text-xs font-bold gap-2 h-10 border-zinc-200 dark:border-zinc-800"
          >
            <FolderOpen className="h-4 w-4" />
            Categorías
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            className="rounded-2xl bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-bold gap-2 h-10 shadow-md shadow-brand-pink/20"
          >
            <Plus className="h-4 w-4" />
            Nuevo Item
          </Button>
        </div>
      </div>

      {/* Filter & View Switcher Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Buscar por nombre, SKU, código, sector, ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-xs rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {/* Status Filter Buttons */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl text-xs shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer",
                  statusFilter === "all" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-bold" : "text-zinc-500"
                )}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer",
                  statusFilter === "active" ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold" : "text-zinc-500"
                )}
              >
                Activos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("low_stock")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5",
                  statusFilter === "low_stock" ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold" : "text-zinc-500"
                )}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                Bajo Stock
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("out_of_stock")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5",
                  statusFilter === "out_of_stock" ? "bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold" : "text-zinc-500"
                )}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                Agotados
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("hidden")}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer",
                  statusFilter === "hidden" ? "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 shadow-xs font-bold" : "text-zinc-500"
                )}
              >
                Ocultos
              </button>
            </div>

            {/* Grid / Table Mode Switcher */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "h-8 w-8 rounded-xl transition-all",
                  viewMode === "grid" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" : "text-zinc-500"
                )}
                title="Vista en cuadrícula"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("table")}
                className={cn(
                  "h-8 w-8 rounded-xl transition-all",
                  viewMode === "table" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" : "text-zinc-500"
                )}
                title="Vista en tabla"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Classification & Category Pill Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Classification Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {dynamicClassificationFilters.map((cf) => {
              const isSelected = selectedClassification === cf.id
              const IconComp = cf.icon
              return (
                <button
                  key={cf.id}
                  type="button"
                  onClick={() => setSelectedClassification(cf.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                    isSelected
                      ? "bg-brand-pink text-white shadow-xs"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  )}
                >
                  {IconComp && <IconComp className="h-3.5 w-3.5" />}
                  {cf.label}
                </button>
              )
            })}
          </div>

          <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">|</span>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer",
                selectedCategory === "all"
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold"
                  : "bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
              )}
            >
              Todas las Categorías
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs transition-all whitespace-nowrap cursor-pointer",
                  selectedCategory === cat.name
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold"
                    : "bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Rendering: Grid vs Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/20">
          <Package className="h-12 w-12 text-zinc-400 mb-3" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
            No se encontraron productos o servicios
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mb-5">
            Prueba ajustando los filtros de búsqueda o crea un nuevo elemento para empezar a vender.
          </p>
          <Button
            onClick={handleCreate}
            className="rounded-2xl bg-brand-pink text-white text-xs font-bold px-6 h-10 shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Producto / Servicio
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const rawBadges = item.badges || []
            const firstBadge = rawBadges.length > 0
              ? typeof rawBadges[0] === "string"
                ? rawBadges[0]
                : (rawBadges[0] as any).label || (rawBadges[0] as any).type
              : null

            const isTracking = Boolean(item.track_inventory)
            const stockQty = Number(item.inventory_quantity ?? 0)
            const hasVariants = Boolean(item.has_variants && item.variants && item.variants.length > 0)
            const totalVariantStock = hasVariants
              ? item.variants!.reduce((acc, v) => acc + Number(v.inventory_quantity ?? 0), 0)
              : 0
            const threshold = Number(item.low_stock_threshold ?? 5)
            const isLow = isTracking && stockQty > 0 && stockQty <= threshold
            const isOut = isTracking && stockQty <= 0 && !item.allow_backorders
            const isBackorder = isTracking && stockQty <= 0 && item.allow_backorders

            return (
              <div
                key={item.id}
                className="group relative rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                {/* Top Image & Badges */}
                <div className="h-44 w-full bg-zinc-100 dark:bg-zinc-900 relative overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-zinc-400">
                      <Box className="h-8 w-8 mb-1 opacity-50" />
                      <span className="text-[11px]">Sin foto de portada</span>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-60" />

                  {/* Badges on image */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[75%] z-10">
                    {item.classification === "real_estate" && (() => {
                      const re = item.real_estate_details || item.classification_metadata?.real_estate
                      const op = re?.operation_type || "sale"
                      const isRent = op === "rent"
                      const isTemp = op === "temporary_rent"
                      const opLabel = isRent ? "En Arriendo" : isTemp ? "Arriendo Temp." : "En Venta"
                      const OpIcon = isRent ? Key : isTemp ? CalendarRange : Tag
                      const opColor = op === "rent" ? "bg-blue-600 text-white" : op === "temporary_rent" ? "bg-purple-600 text-white" : "bg-emerald-600 text-white"
                      return (
                        <Badge className={cn("text-[10px] border-none font-black shadow-md flex items-center gap-1", opColor)}>
                          <OpIcon className="h-2.5 w-2.5" />
                          <span>{opLabel}</span>
                        </Badge>
                      )
                    })()}
                    <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-md text-[10px] border-none font-bold">
                      {item.category}
                    </Badge>
                    {firstBadge && (
                      <Badge className="bg-brand-pink text-white text-[10px] border-none font-bold shadow-xs">
                        {firstBadge}
                      </Badge>
                    )}
                  </div>

                  {/* Quick Stock Top-Right Pill + Action Dropdown */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {/* Floating Stock Badge */}
                    {hasVariants ? (
                      <Badge className="bg-indigo-600/90 text-white text-[10px] font-extrabold backdrop-blur-md border-none shadow-sm flex items-center gap-1">
                        <Package className="h-2.5 w-2.5" />
                        <span>{totalVariantStock} uds</span>
                      </Badge>
                    ) : isTracking ? (
                      <Badge
                        className={cn(
                          "text-[10px] font-extrabold backdrop-blur-md border-none shadow-sm flex items-center gap-1",
                          isOut
                            ? "bg-rose-600 text-white"
                            : isBackorder
                            ? "bg-sky-600 text-white"
                            : isLow
                            ? "bg-amber-500 text-white animate-pulse"
                            : "bg-emerald-600 text-white"
                        )}
                      >
                        <Package className="h-2.5 w-2.5" />
                        <span>{isOut ? "Agotado" : isBackorder ? "Bajo Pedido" : isLow ? `¡${stockQty} uds!` : `${stockQty} uds`}</span>
                      </Badge>
                    ) : null}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 shadow-xl">
                        <DropdownMenuItem onClick={() => handleEdit(item)} className="rounded-xl text-xs gap-2">
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(item)} className="rounded-xl text-xs gap-2">
                          <Copy className="h-3.5 w-3.5" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setQrItem(item)} className="rounded-xl text-xs gap-2">
                          <QrCode className="h-3.5 w-3.5" /> Generar Código QR
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleVisibility(item)} className="rounded-xl text-xs gap-2">
                          {item.is_visible_in_portal ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" /> Ocultar de Tienda
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" /> Mostrar en Tienda
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(item)}
                          className="rounded-xl text-xs gap-2 text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Price overlay pill */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="font-extrabold text-base tracking-tight drop-shadow-md">
                      ${item.base_price?.toLocaleString()} COP
                    </span>
                    {item.has_variants && (
                      <span className="text-[10px] font-semibold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full">
                        {item.variants?.length || 0} variantes
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-1 group-hover:text-brand-pink transition-colors">
                        {item.name}
                      </h3>

                      {/* Real Estate Subtitle in Admin Card */}
                      {item.classification === "real_estate" && (() => {
                        const re = item.real_estate_details || item.classification_metadata?.real_estate
                        const propType = re?.property_type || "apartment"
                        const typeMap: Record<string, string> = {
                          apartment: "Apartamento",
                          house: "Casa",
                          studio: "Apartaestudio",
                          office: "Oficina",
                          commercial: "Local Comercial",
                          warehouse: "Bodega",
                          land: "Lote / Terreno",
                          country_house: "Finca / Casa Campestre",
                          medical_office: "Consultorio",
                          building: "Edificio",
                        }
                        const typeLabel = typeMap[propType] || "Inmueble"
                        const loc = re?.neighborhood ? `${re.neighborhood}, ${re.city || ""}` : (re?.city || "")
                        return (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                            <span className="flex items-center gap-1 font-bold text-zinc-700 dark:text-zinc-300">
                              <Building2 className="h-3.5 w-3.5 text-brand-pink shrink-0" />
                              {typeLabel}
                            </span>
                            {loc && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                                  {loc}
                                </span>
                              </>
                            )}
                          </div>
                        )
                      })()}

                      {item.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Highly Visible Stock, Real Estate Specs and SKU Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {item.classification === "real_estate" ? (() => {
                        const re = item.real_estate_details || item.classification_metadata?.real_estate || {}
                        const pills: string[] = []
                        if (re.area_total_m2) pills.push(`📐 ${re.area_total_m2} m²`)
                        if (re.bedrooms) pills.push(`🛏️ ${re.bedrooms} Hab`)
                        if (re.bathrooms) pills.push(`🚿 ${re.bathrooms} Baños`)
                        if (re.parking_cars || re.parking_motorcycles) {
                          const pType = re.parking_type === "covered" ? "Cub." : re.parking_type === "uncovered" ? "Int." : ""
                          pills.push(`🚗 ${re.parking_cars || 0}${pType ? ` (${pType})` : ''}`)
                        }
                        return (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {pills.map((p, idx) => (
                              <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700">
                                {p}
                              </span>
                            ))}
                          </div>
                        )
                      })() : hasVariants ? (
                        <Badge variant="outline" className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 gap-1 py-0.5 rounded-lg">
                          <Layers className="h-3 w-3 text-indigo-500" />
                          <span>{totalVariantStock} en stock ({item.variants?.length} vars)</span>
                        </Badge>
                      ) : isTracking ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-bold gap-1 py-0.5 rounded-lg",
                            isOut
                              ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                              : isBackorder
                              ? "bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900"
                              : isLow
                              ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 animate-pulse"
                              : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                          )}
                        >
                          <Package className="h-3 w-3" />
                          <span>{isOut ? "Agotado (0 uds)" : isBackorder ? "Bajo Pedido (0 uds)" : isLow ? `Bajo Stock (${stockQty} uds)` : `${stockQty} uds en stock`}</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 gap-1 py-0.5 rounded-lg">
                          <Zap className="h-3 w-3 text-zinc-400" />
                          <span>{item.classification === "subscription" ? "Suscripción" : item.classification === "digital" ? "Digital (Ilimitado)" : "Servicio"}</span>
                        </Badge>
                      )}

                      {item.sku && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700">
                          SKU: {item.sku}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          item.is_visible_in_portal ? "bg-emerald-500" : "bg-zinc-400"
                        )}
                      />
                      <span className="text-[11px] text-zinc-400">
                        {item.is_visible_in_portal ? "Visible en tienda" : "Oculto"}
                      </span>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className="h-8 px-3.5 rounded-xl text-xs font-bold hover:bg-brand-pink hover:text-white transition-colors"
                    >
                      Editar
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-3xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/80">
              <TableRow>
                <TableHead className="w-[60px]">Foto</TableHead>
                <TableHead className="min-w-[200px]">Nombre & Categoría</TableHead>
                <TableHead className="min-w-[120px]">SKU</TableHead>
                <TableHead className="min-w-[120px]">Precio Base</TableHead>
                <TableHead className="min-w-[100px]">Variantes</TableHead>
                <TableHead className="min-w-[140px]">Stock Disponible</TableHead>
                <TableHead className="w-[90px] text-center">Visible</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const isTracking = Boolean(item.track_inventory)
                const stockQty = Number(item.inventory_quantity ?? 0)
                const hasVariants = Boolean(item.has_variants && item.variants && item.variants.length > 0)
                const totalVariantStock = hasVariants
                  ? item.variants!.reduce((acc, v) => acc + Number(v.inventory_quantity ?? 0), 0)
                  : 0
                const threshold = Number(item.low_stock_threshold ?? 5)
                const isLow = isTracking && stockQty > 0 && stockQty <= threshold
                const isOut = isTracking && stockQty <= 0 && !item.allow_backorders

                return (
                  <TableRow key={item.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/50">
                    <TableCell>
                      <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-zinc-400">
                            <Box className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-zinc-900 dark:text-white">{item.name}</span>
                          {item.classification === "real_estate" && (() => {
                            const re = item.real_estate_details || item.classification_metadata?.real_estate
                            const op = re?.operation_type || "sale"
                            const isRent = op === "rent"
                            const isTemp = op === "temporary_rent"
                            const opLabel = isRent ? "En Arriendo" : isTemp ? "Arriendo Temp." : "En Venta"
                            const OpIcon = isRent ? Key : isTemp ? CalendarRange : Tag
                            const opColor = op === "rent" ? "bg-blue-600 text-white" : op === "temporary_rent" ? "bg-purple-600 text-white" : "bg-emerald-600 text-white"
                            return (
                              <Badge className={cn("text-[9px] py-0 px-1.5 border-none font-bold flex items-center gap-1", opColor)}>
                                <OpIcon className="h-2 w-2" />
                                <span>{opLabel}</span>
                              </Badge>
                            )
                          })()}
                        </div>
                        <span className="text-[11px] text-zinc-400">{item.category}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-400">{item.sku || "—"}</span>
                    </TableCell>

                    <TableCell>
                      <span className="font-extrabold text-xs text-zinc-900 dark:text-white">
                        ${item.base_price?.toLocaleString()} COP
                      </span>
                    </TableCell>

                    <TableCell>
                      {item.has_variants ? (
                        <Badge variant="secondary" className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                          {item.variants?.length || 0} vars
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">No</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {item.classification === "real_estate" ? (() => {
                        const re = item.real_estate_details || item.classification_metadata?.real_estate || {}
                        return (
                          <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1">
                            <Building2 className="h-3 w-3 text-emerald-600" />
                            <span>{re.area_total_m2 ? `${re.area_total_m2} m²` : "Inmueble"}</span>
                          </Badge>
                        )
                      })() : hasVariants ? (
                        <Badge variant="outline" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50">
                          📦 {totalVariantStock} uds
                        </Badge>
                      ) : isTracking ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-bold",
                            isOut
                              ? "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50/50"
                              : isLow
                              ? "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 bg-amber-50/50 animate-pulse"
                              : "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50/50"
                          )}
                        >
                          {isOut ? "🚫 Agotado" : isLow ? `⚠️ ${stockQty} uds` : `📦 ${stockQty} uds`}
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">Ilimitado</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Switch
                        checked={item.is_visible_in_portal ?? true}
                        onCheckedChange={() => handleToggleVisibility(item)}
                      />
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 shadow-xl">
                          <DropdownMenuItem onClick={() => handleEdit(item)} className="rounded-xl text-xs gap-2">
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(item)} className="rounded-xl text-xs gap-2">
                            <Copy className="h-3.5 w-3.5" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setQrItem(item)} className="rounded-xl text-xs gap-2">
                            <QrCode className="h-3.5 w-3.5" /> Generar Código QR
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleVisibility(item)} className="rounded-xl text-xs gap-2">
                            {item.is_visible_in_portal ? (
                              <>
                                <EyeOff className="h-3.5 w-3.5" /> Ocultar de Tienda
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5" /> Mostrar en Tienda
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(item)}
                            className="rounded-xl text-xs gap-2 text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Slide-Over Form Sheet */}
      <CatalogItemFormSheet
        open={isFormSheetOpen}
        onOpenChange={setIsFormSheetOpen}
        itemToEdit={editingItem}
        categories={categories}
        attributeGroups={attributeGroups}
        onSuccess={onRefresh}
        spaceType={spaceType}
        portalToken={portalToken}
        organizationId={organizationId}
        industryPreset={activePreset}
      />

      {/* Category Manager Drawer */}
      <CategoryManagerDrawer
        open={isCategoryDrawerOpen}
        onOpenChange={setIsCategoryDrawerOpen}
        onSuccess={onRefresh}
      />

      {/* QR Code Dialog */}
      {qrItem && (
        <QRCodeDialog
          open={!!qrItem}
          onOpenChange={(open) => !open && setQrItem(null)}
          item={qrItem}
          portalToken={portalToken}
          organizationId={organizationId}
        />
      )}
    </div>
  )
}

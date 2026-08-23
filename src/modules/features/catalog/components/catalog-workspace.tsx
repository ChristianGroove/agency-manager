"use client"

import React, { useState, useTransition, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  UniversalCatalogItem,
  CatalogAttributeGroup,
  StorefrontThemeConfig,
} from "@/types/catalog"
import { ServiceCategory } from "@/modules/features/catalog/categories-actions"
import { OrganizationRole } from "@/modules/core/iam/services/org-roles"
import { getCatalogItemsAction } from "@/modules/features/catalog/actions"
import { getCategories } from "@/modules/features/catalog/categories-actions"
import { getAttributeGroupsAction } from "@/modules/features/catalog/attributes-actions"
import { CatalogItemsTab } from "./catalog-items-tab"
import { AttributesVariantsTab } from "./attributes-variants-tab"
import { StoreCustomizerTab } from "./store-customizer-tab"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Store,
  Layers,
  Palette,
  ExternalLink,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  FolderOpen,
  Plus,
  Building2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

export type WorkspaceTabKey = "catalog" | "attributes" | "customizer"

export interface CatalogWorkspaceProps {
  initialItems: UniversalCatalogItem[]
  initialCategories: ServiceCategory[]
  initialAttributeGroups: CatalogAttributeGroup[]
  initialThemeConfig: StorefrontThemeConfig
  organization: {
    id: string
    name: string
    slug?: string | null
    customDomain?: string | null
    customDomainStatus?: string | null
    spaceType?: string
    currency?: string
    logos?: {
      dark?: string | null
      light?: string | null
    }
  }
  userRole: OrganizationRole
  initialTab?: WorkspaceTabKey
}

export function CatalogWorkspace({
  initialItems = [],
  initialCategories = [],
  initialAttributeGroups = [],
  initialThemeConfig,
  organization,
  userRole,
  initialTab = "catalog",
}: CatalogWorkspaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // State
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>(() => {
    const queryTab = searchParams.get("tab") as WorkspaceTabKey | null
    if (queryTab === "attributes" || queryTab === "customizer") return queryTab
    return initialTab
  })

  const [items, setItems] = useState<UniversalCatalogItem[]>(initialItems)
  const [categories, setCategories] = useState<ServiceCategory[]>(initialCategories)
  const [attributeGroups, setAttributeGroups] = useState<CatalogAttributeGroup[]>(initialAttributeGroups)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Drawer & Sheet States
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<UniversalCatalogItem | null>(null)
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false)

  const handleCreateItem = () => {
    setEditingItem(null)
    setIsFormSheetOpen(true)
  }

  // Handle Tab Change with URL Synchronization
  const handleTabChange = (newTab: string) => {
    const tabKey = newTab as WorkspaceTabKey
    setActiveTab(tabKey)
    startTransition(() => {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", tabKey)
      window.history.replaceState({}, "", url.toString())
    })
  }

  // Refresh data handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [itemsRes, cats, groups] = await Promise.all([
        getCatalogItemsAction({ includeInactive: true }),
        getCategories(organization.id),
        getAttributeGroupsAction(organization.id),
      ])

      if (itemsRes.success && itemsRes.data) {
        setItems(itemsRes.data)
      }
      if (cats) {
        setCategories(cats)
      }
      if (groups) {
        setAttributeGroups(groups)
      }
    } catch (err: any) {
      console.error("Workspace refresh error:", err)
      toast.error("Error al actualizar datos del catálogo")
    } finally {
      setIsRefreshing(false)
    }
  }, [organization.id])

  const isResto = organization.spaceType === "resto"
  const isRealEstate = organization.spaceType === "real_estate" || initialThemeConfig?.industry_preset === "real_estate"
  const storeSlug = organization.slug || organization.id
  const hasActiveCustomDomain = organization.customDomain && organization.customDomainStatus === 'active'
  const liveStoreUrl = hasActiveCustomDomain
    ? `https://${organization.customDomain}`
    : `/portal/${storeSlug}`

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* 1. Standard Module Header (Single Title & Subtitle) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand-pink/10 text-brand-pink">
            {isRealEstate ? <Building2 className="h-6 w-6" /> : <Store className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {isResto ? "Menú & Catálogo Comercial" : isRealEstate ? "Propiedades & Inmuebles" : "Catálogo Comercial & Portafolio"}
              </h1>
              <Badge variant="outline" className="text-xs uppercase font-mono px-2.5 py-0.5">
                {organization.name}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {isRealEstate
                ? "Gestión de inmuebles, fichas técnicas, precios de oferta y vitrina inmobiliaria en vivo"
                : "Plataforma de inventario omnicanal, matriz de variantes y personalizador de tienda en vivo"}
            </p>
          </div>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-xl h-9 px-3 text-xs font-semibold gap-1.5"
            title="Recargar catálogo"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-brand-pink")} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(liveStoreUrl, "_blank")}
            className="rounded-xl h-9 px-3.5 text-xs font-bold gap-1.5 bg-white dark:bg-zinc-900 border-brand-pink/30 hover:bg-brand-pink/10 text-brand-pink"
            title={liveStoreUrl}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isRealEstate ? "Ver Portal en Vivo" : "Ver Tienda en Vivo"}</span>
            <span className="sm:hidden">{isRealEstate ? "Portal" : "Tienda"}</span>
          </Button>
        </div>
      </div>

      {/* 2. Unified Navigation Tabs Bar (Platform Standard CRM Settings Style) + Contextual Actions */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-white/10">
          {/* Multitab styled like CRM Settings */}
          <TabsList className="grid grid-cols-3 max-w-lg w-full p-1 bg-gray-100/60 dark:bg-white/5 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 rounded-xl h-11">
            <TabsTrigger
              value="catalog"
              className="flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground"
            >
              {isRealEstate ? <Building2 className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
              <span>{isResto ? "Platos & Items" : isRealEstate ? "Propiedades & Inmuebles" : "Productos & Servicios"}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">
                {items.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="attributes"
              className="flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Atributos & Variantes</span>
            </TabsTrigger>

            <TabsTrigger
              value="customizer"
              className="flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground"
            >
              <Palette className="h-3.5 w-3.5 text-brand-pink" />
              <span>{isRealEstate ? "Personalizar Portal" : "Personalizar Tienda"}</span>
            </TabsTrigger>
          </TabsList>

          {/* Actions in the same row on the right */}
          {activeTab === "catalog" && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCategoryDrawerOpen(true)}
                className="rounded-xl text-xs font-bold gap-2 h-10 border-zinc-200 dark:border-zinc-800"
              >
                <FolderOpen className="h-4 w-4" />
                {isRealEstate ? "Categorías / Tipos" : "Categorías"}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleCreateItem}
                className="rounded-xl bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-bold gap-2 h-10 shadow-sm shadow-brand-pink/20"
              >
                <Plus className="h-4 w-4" />
                {isRealEstate ? "Nueva Propiedad" : isResto ? "Nuevo Plato" : "Nuevo Item"}
              </Button>
            </div>
          )}
        </div>

        {/* TAB 1: CATALOG ITEMS WORKSPACE */}
        <TabsContent value="catalog" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <CatalogItemsTab
            items={items}
            categories={categories}
            attributeGroups={attributeGroups}
            isLoading={isRefreshing}
            onRefresh={handleRefresh}
            spaceType={organization.spaceType}
            organizationId={organization.id}
            themeConfig={initialThemeConfig}
            industryPreset={initialThemeConfig?.industry_preset}
            isFormSheetOpen={isFormSheetOpen}
            setIsFormSheetOpen={setIsFormSheetOpen}
            editingItem={editingItem}
            setEditingItem={setEditingItem}
            isCategoryDrawerOpen={isCategoryDrawerOpen}
            setIsCategoryDrawerOpen={setIsCategoryDrawerOpen}
          />
        </TabsContent>

        {/* TAB 2: CENTRAL ATTRIBUTES & VARIANTS MANAGER */}
        <TabsContent value="attributes" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <AttributesVariantsTab
            initialAttributeGroups={attributeGroups}
            organizationId={organization.id}
          />
        </TabsContent>

        {/* TAB 3: REAL-TIME STORE CUSTOMIZER STUDIO */}
        <TabsContent value="customizer" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <StoreCustomizerTab
            initialThemeConfig={initialThemeConfig}
            sampleItems={items}
            orgName={organization.name}
            organizationId={organization.id}
            organization={organization}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

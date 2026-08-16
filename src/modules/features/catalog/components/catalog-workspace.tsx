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
    spaceType?: string
    currency?: string
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Workspace Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-pink/10 text-brand-pink">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {isResto ? "Menú & Catálogo Comercial" : "Catálogo Comercial & Portafolio"}
                </h1>
                <Badge variant="outline" className="text-xs uppercase font-mono px-2.5 py-0.5">
                  {organization.name}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Plataforma de inventario omnicanal, matriz de variantes y personalizador de tienda en vivo
              </p>
            </div>
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
            className="rounded-xl h-10 px-3 text-xs font-semibold gap-1.5"
            title="Recargar catálogo"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-brand-pink")} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open("/portal", "_blank")}
            className="rounded-xl h-10 px-4 text-xs font-bold gap-1.5 bg-white dark:bg-zinc-900 border-brand-pink/30 hover:bg-brand-pink/10 text-brand-pink"
          >
            <ExternalLink className="h-4 w-4" />
            Ver Tienda en Vivo
          </Button>
        </div>
      </div>

      {/* 3-Tab Unified Navigation Container */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        {/* Navigation Tabs Pill Bar */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-white/10 pb-4">
          <TabsList className="grid grid-cols-3 h-12 p-1 bg-zinc-100 dark:bg-zinc-900/80 rounded-2xl max-w-xl w-full">
            <TabsTrigger
              value="catalog"
              className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs transition-all"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>{isResto ? "Platos & Items" : "Productos & Servicios"}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {items.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="attributes"
              className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs transition-all"
            >
              <Layers className="h-4 w-4" />
              <span>Atributos & Variantes</span>
            </TabsTrigger>

            <TabsTrigger
              value="customizer"
              className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs transition-all"
            >
              <Palette className="h-4 w-4 text-brand-pink" />
              <span>Personalizar Tienda</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: CATALOG ITEMS */}
        <TabsContent value="catalog" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <CatalogItemsTab
            items={items}
            categories={categories}
            attributeGroups={attributeGroups}
            isLoading={isRefreshing}
            onRefresh={handleRefresh}
            spaceType={organization.spaceType}
            organizationId={organization.id}
          />
        </TabsContent>

        {/* TAB 2: ATTRIBUTES & VARIANTS */}
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
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

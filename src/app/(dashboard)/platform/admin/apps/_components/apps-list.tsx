"use client"

import { useState } from "react"
import { SaasApp } from "@/modules/core/saas/app-management-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Settings, Users, Package, LayoutGrid, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { SearchFilterBar, FilterOption } from "@/components/shared/search-filter-bar"
import { ViewToggle, ViewMode } from "@/components/shared/view-toggle"
import { cn } from "@/lib/utils"

interface AppsListProps {
    initialApps: (SaasApp & { active_org_count: number })[]
    dict: any
}

export function AppsList({ initialApps, dict }: AppsListProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const [activeFilter, setActiveFilter] = useState('all')

    const filteredApps = initialApps.filter(app => {
        const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.category.toLowerCase().includes(searchTerm.toLowerCase())

        if (!matchesSearch) return false

        if (activeFilter === 'all') return true
        if (activeFilter === 'active') return app.is_active
        if (activeFilter === 'inactive') return !app.is_active
        // Add specific category filters if needed, strictly based on filter ID matching category?
        // For now, let's keep it simple with status

        return true
    })

    const counts = {
        all: initialApps.length,
        active: initialApps.filter(a => a.is_active).length,
        inactive: initialApps.filter(a => !a.is_active).length
    }

    const filterOptions: FilterOption[] = [
        { id: 'all', label: 'Todos', count: counts.all, color: 'gray' },
        { id: 'active', label: 'Activos', count: counts.active, color: 'emerald' },
        { id: 'inactive', label: 'Inactivos', count: counts.inactive, color: 'slate' },
    ]

    return (
        <div className="space-y-6">
            {/* Unified Control Bar */}
            <div className="flex flex-col md:flex-row gap-3 sticky top-4 z-30">
                <SearchFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={dict.form.search_placeholder || "Search templates..."}
                    filters={filterOptions}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />

                <ViewToggle
                    view={viewMode}
                    onViewChange={setViewMode}
                />
            </div>

            {/* Grid/List Container */}
            <div className={cn(
                "grid gap-5 transition-all duration-300",
                viewMode === 'list'
                    ? "grid-cols-1"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
                {filteredApps.map((app) => (
                    <Card key={app.id} className={cn(
                        "group hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden",
                        viewMode === 'list' ? "flex flex-col md:flex-row md:items-center" : ""
                    )}>
                        <CardHeader className={cn(
                            "pb-3",
                            viewMode === 'list' ? "flex-row items-center gap-4 space-y-0 w-full md:w-1/3 border-b md:border-b-0 md:border-r" : ""
                        )}>
                            <div className={cn(
                                "flex justify-between items-start w-full",
                                viewMode === 'list' ? "items-center" : ""
                            )}>
                                <div className="flex items-center gap-4 w-full">
                                    <div
                                        className={cn(
                                            "rounded-lg shrink-0 flex items-center justify-center",
                                            viewMode === 'list' ? "p-2.5 h-12 w-12" : "p-3 mb-3 h-14 w-14"
                                        )}
                                        style={{ backgroundColor: `${app.color}15`, color: app.color }}
                                    >
                                        <Package className={cn("transition-all", viewMode === 'list' ? "h-6 w-6" : "h-7 w-7")} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <CardTitle className="text-lg font-bold truncate">{app.name}</CardTitle>
                                            {viewMode === 'list' && (
                                                app.is_active
                                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                    : <XCircle className="h-4 w-4 text-slate-400 shrink-0" />
                                            )}
                                        </div>
                                        <CardDescription className={cn(
                                            "line-clamp-1 text-xs",
                                            viewMode === 'list' ? "" : "h-5"
                                        )}>
                                            {app.description}
                                        </CardDescription>
                                    </div>
                                </div>

                                {viewMode !== 'list' && (
                                    <div className="flex gap-2">
                                        {app.is_active ? (
                                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 h-6 px-2 text-[10px] uppercase font-bold tracking-wider">
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-muted-foreground h-6 px-2 text-[10px] uppercase font-bold tracking-wider">
                                                Inactive
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className={cn(
                            "flex-1",
                            viewMode === 'list' ? "p-4 flex items-center justify-between gap-6" : "pb-4 pt-1"
                        )}>
                            <div className={cn(
                                "flex text-sm text-muted-foreground",
                                viewMode === 'list' ? "gap-8 items-center" : "gap-4 items-center mb-4"
                            )}>
                                <div className="flex items-center gap-1.5 min-w-[100px]">
                                    <Users className="h-4 w-4 text-slate-400" />
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                        {app.active_org_count} <span className="text-slate-500 font-normal">{dict.active_organizations?.split(' ')[0] || 'Orgs'}</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Badge variant="outline" className="font-normal capitalize bg-slate-50 text-slate-600 border-slate-200">
                                        {app.category}
                                    </Badge>
                                </div>
                            </div>

                            <div className={cn(
                                "flex items-baseline gap-1",
                                viewMode === 'list' ? "mr-4" : ""
                            )}>
                                <span className={cn(
                                    "font-bold text-slate-900 dark:text-white",
                                    viewMode === 'list' ? "text-xl" : "text-2xl"
                                )}>${app.price_monthly}</span>
                                <span className="text-muted-foreground text-sm font-medium">/mo</span>
                            </div>
                        </CardContent>

                        <CardFooter className={cn(
                            "pt-0",
                            viewMode === 'list' ? "p-4 w-full md:w-auto border-t md:border-t-0 md:border-l bg-gray-50/50 md:bg-transparent justify-end" : "bg-gray-50/30 border-t border-slate-100 dark:border-slate-800 p-4"
                        )}>
                            <Link href={`/platform/admin/apps/${app.slug}`} className={viewMode === 'list' ? "" : "w-full"}>
                                <Button size={viewMode === 'list' ? "sm" : "default"} variant="outline" className={cn(
                                    "group-hover:border-primary/50 group-hover:text-primary transition-all bg-white",
                                    viewMode === 'list' ? "h-9 w-full md:w-auto px-4" : "w-full shadow-sm"
                                )}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    {dict.form.manage || "Gestionar Plantilla"}
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {filteredApps.length === 0 && (
                <div className="text-center py-24 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-white shadow-sm mb-4">
                        <Search className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No templates found</h3>
                    <p className="text-slate-500 mt-1 max-w-xs mx-auto">
                        No matches for "{searchTerm}". Try adjusting your filters or search terms.
                    </p>
                    <Button
                        variant="link"
                        onClick={() => { setSearchTerm(''); setActiveFilter('all') }}
                        className="mt-2 text-primary"
                    >
                        Clear all filters
                    </Button>
                </div>
            )}
        </div>
    )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Organization } from "@/types/organization"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreateOrganizationSheet } from "@/modules/core/organizations/components/create-organization-sheet"
import { OrganizationCard } from "@/modules/core/organizations/components/organization-card"
import { TenantConfigurationSheet } from "@/modules/core/organizations/components/tenant-configuration-sheet"
import { EditLimitsModal } from "@/modules/core/organizations/components/edit-limits-modal"
import { Plus, Building2, Settings2, BarChart3, Shield, Trash, ChevronLeft, ChevronRight } from "lucide-react"
import { HierarchyAnalytics } from "@/modules/core/organizations/components/hierarchy-analytics"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { SearchFilterBar, FilterOption } from "@/modules/core/ui/components/search-filter-bar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/modules/infrastructure/utils/utils"
import { SectionHeader } from "@/components/layout/section-header"
import { Checkbox } from "@/components/ui/checkbox"
import { BulkActionsFloatingBar } from "@/modules/core/ui/components/bulk-actions-floating-bar"
import { toast } from "sonner"
import { useDebouncedCallback } from "use-debounce"

interface OrganizationsClientViewProps {
    data: Organization[]
    count: number
    page: number
    limit: number
    searchParams: {
        search?: string
        type?: string
    }
}

export function OrganizationsClientView({ data, count, page, limit, searchParams }: OrganizationsClientViewProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isPending, startTransition] = useTransition()

    // Local State for Actions
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isLimitsOpen, setIsLimitsOpen] = useState(false)
    const [selectedOrgForLimits, setSelectedOrgForLimits] = useState<{ id: string, name: string } | null>(null)
    const [isConfigOpen, setIsConfigOpen] = useState(false)
    const [selectedOrgForConfig, setSelectedOrgForConfig] = useState<{ id: string, name: string } | null>(null)
    const [showAnalytics, setShowAnalytics] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)

    // Filter State (synced with URL via router)
    const [searchTerm, setSearchTerm] = useState(searchParams.search || "")
    const activeFilter = searchParams.type || 'all'

    // Debounced URL Update for Search
    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(window.location.search)
        if (term) {
            params.set('search', term)
        } else {
            params.delete('search')
        }
        params.set('page', '1') // Reset page on search
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`)
        })
    }, 300)

    const onSearchChange = (value: string) => {
        setSearchTerm(value)
        handleSearch(value)
    }

    const onFilterChange = (filterId: string) => {
        const params = new URLSearchParams(window.location.search)
        if (filterId === 'all') {
            params.delete('type')
        } else {
            params.set('type', filterId)
        }
        params.set('page', '1')
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`)
        })
    }

    const onPageChange = (newPage: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set('page', newPage.toString())
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`)
        })
    }

    // Actions
    const handleRefresh = () => {
        startTransition(() => {
            router.refresh()
        })
    }

    const handleOpenLimits = (org: Organization) => {
        setSelectedOrgForLimits({ id: org.id, name: org.name })
        setIsLimitsOpen(true)
    }

    const handleOpenConfig = (org: Organization) => {
        setSelectedOrgForConfig({ id: org.id, name: org.name })
        setIsConfigOpen(true)
    }

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds)
        if (newSelection.has(id)) newSelection.delete(id)
        else newSelection.add(id)
        setSelectedIds(newSelection)
    }

    const toggleAll = () => {
        if (selectedIds.size === data.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(data.map(o => o.id)))
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Â¿EstÃ¡s seguro de eliminar ${selectedIds.size} organizaciones?`)) return

        setIsDeleting(true)
        try {
            const { deleteOrganizations } = await import("@/modules/core/organizations/organization-actions")
            const result = await deleteOrganizations(Array.from(selectedIds))

            if (result.success) {
                toast.success(`${selectedIds.size} organizaciones eliminadas`)
                setSelectedIds(new Set())
                handleRefresh()
            } else {
                toast.error(result.error || "Error al eliminar")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al eliminar")
        } finally {
            setIsDeleting(false)
        }
    }

    const filterOptions: FilterOption[] = [
        { id: 'all', label: 'Todas', color: 'gray' },
        { id: 'reseller', label: 'Resellers', color: 'blue' },
        { id: 'client', label: 'Clientes', color: 'emerald' },
        { id: 'platform', label: 'Plataforma', color: 'purple' },
    ]

    const totalPages = Math.ceil(count / limit)

    return (
        <div className="space-y-6 bg-gray-50/50 dark:bg-transparent min-h-screen">
            <SectionHeader
                title="Organizaciones"
                subtitle="GestiÃ³n global de organizaciones."
                icon={Building2}
                action={
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button
                            variant={showAnalytics ? "default" : "outline"}
                            onClick={() => setShowAnalytics(!showAnalytics)}
                            className={showAnalytics ? "bg-purple-600 hover:bg-purple-700" : ""}
                        >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            {showAnalytics ? "Ocultar Analytics" : "Ver Analytics"}
                        </Button>
                        <Button onClick={() => setIsCreateOpen(true)} className="bg-brand-pink hover:bg-brand-pink/90 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Nueva OrganizaciÃ³n
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-col md:flex-row gap-3 sticky top-4 z-30">
                <SearchFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={onSearchChange}
                    searchPlaceholder="Buscar organizaciÃ³n..."
                    filters={filterOptions}
                    activeFilter={activeFilter}
                    onFilterChange={onFilterChange}
                />
            </div>

            {showAnalytics && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    <HierarchyAnalytics />
                </div>
            )}

            <BulkActionsFloatingBar
                selectedCount={selectedIds.size}
                onDelete={handleBulkDelete}
                onClearSelection={() => setSelectedIds(new Set())}
                isDeleting={isDeleting}
            />

            <Card className="border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-white/5 backdrop-blur-md">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={data.length > 0 && selectedIds.size === data.length}
                                        onCheckedChange={toggleAll}
                                    />
                                </TableHead>
                                <TableHead className="pl-6 w-[400px]">Identidad / JerarquÃ­a</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Creada</TableHead>
                                <TableHead className="text-right pr-6">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                        No se encontraron organizaciones.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((org) => (
                                    <TableRow key={org.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 border-gray-100 dark:border-white/5">
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.has(org.id)}
                                                onCheckedChange={() => toggleSelection(org.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="pl-6">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 rounded-lg border shadow-sm">
                                                    <AvatarImage src={org.logo_url || undefined} className="object-cover" />
                                                    <AvatarFallback><Building2 className="h-4 w-4 text-gray-400" /></AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{org.name}</span>
                                                    <span className="text-xs text-gray-400">{org.slug}</span>
                                                    {org.parent_organization && (
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                            â†³ {org.parent_organization.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "w-fit capitalize border-transparent",
                                                org.organization_type === 'platform' ? 'bg-purple-100 text-purple-700' :
                                                    org.organization_type === 'reseller' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'
                                            )}>
                                                {org.organization_type || 'Client'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={org.status === 'active' ? 'default' : 'destructive'} className="w-fit capitalize shadow-none">
                                                {org.status || 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {format(new Date(org.created_at), "d MMM, yyyy", { locale: es })}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenConfig(org)}
                                                    title="ConfiguraciÃ³n Avanzada"
                                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                    <Shield className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenLimits(org)}
                                                    title="Gestionar LÃ­mites"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Settings2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={async () => {
                                                        if (confirm('Â¿Eliminar esta organizaciÃ³n?')) {
                                                            setIsDeleting(true)
                                                            try {
                                                                const { deleteOrganizations } = await import("@/modules/core/organizations/organization-actions")
                                                                await deleteOrganizations([org.id])
                                                                toast.success("OrganizaciÃ³n eliminada")
                                                                handleRefresh()
                                                            } finally {
                                                                setIsDeleting(false)
                                                            }
                                                        }
                                                    }}
                                                    title="Eliminar"
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, count)} de {count}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(Math.max(1, page - 1))}
                            disabled={page === 1 || isPending}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages || isPending}
                        >
                            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            <CreateOrganizationSheet
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={handleRefresh}
            />

            {selectedOrgForLimits && (
                <EditLimitsModal
                    open={isLimitsOpen}
                    onOpenChange={setIsLimitsOpen}
                    organizationId={selectedOrgForLimits.id}
                    organizationName={selectedOrgForLimits.name}
                />
            )}

            {selectedOrgForConfig && (
                <TenantConfigurationSheet
                    open={isConfigOpen}
                    onOpenChange={setIsConfigOpen}
                    organizationId={selectedOrgForConfig.id}
                    organizationName={selectedOrgForConfig.name}
                />
            )}
        </div>
    )
}


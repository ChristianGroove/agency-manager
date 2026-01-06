"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Organization } from "@/types/organization"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreateOrganizationSheet } from "@/components/organizations/create-organization-sheet"
import { EditLimitsModal } from "@/components/organizations/edit-limits-modal"
import { Plus, Building2, Settings2, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { SetPasswordModal } from "@/components/auth/set-password-modal"
import { SearchFilterBar, FilterOption } from "@/components/shared/search-filter-bar"
import { ViewToggle, ViewMode } from "@/components/shared/view-toggle"
import { SplitText } from "@/components/ui/split-text"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function PlatformOrganizationsPage() {
    const [orgs, setOrgs] = useState<Organization[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [search, setSearch] = useState("")

    // Limits Modal State
    const [isLimitsOpen, setIsLimitsOpen] = useState(false)
    const [selectedOrgForLimits, setSelectedOrgForLimits] = useState<{ id: string, name: string } | null>(null)

    // View & Filter State
    // Default to 'list' as requested
    const [viewMode, setViewMode] = useState<ViewMode>('list')
    const [activeFilter, setActiveFilter] = useState('all')

    // Tree State
    const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetchOrgs()
    }, [])

    const fetchOrgs = async () => {
        setIsLoading(true)

        // 1. Get Context
        const { getCurrentOrgDetails } = await import('@/modules/core/organizations/actions')
        const currentOrg = await getCurrentOrgDetails()

        let query = supabase
            .from('organizations')
            .select(`
                *,
                parent_organization:organizations!parent_organization_id(name)
            `)
            .order('created_at', { ascending: false })

        // 2. Apply Reseller Filter (Fail-safe for RLS)
        if (currentOrg?.organization_type === 'reseller') {
            query = query.eq('parent_organization_id', currentOrg.id)
        }

        const { data, error } = await query

        if (data) setOrgs(data as any)
        setIsLoading(false)
    }

    const handleOpenLimits = (org: Organization) => {
        setSelectedOrgForLimits({ id: org.id, name: org.name })
        setIsLimitsOpen(true)
    }

    const toggleExpand = (orgId: string) => {
        const newExpanded = new Set(expandedOrgs)
        if (newExpanded.has(orgId)) {
            newExpanded.delete(orgId)
        } else {
            newExpanded.add(orgId)
        }
        setExpandedOrgs(newExpanded)
    }

    const counts = {
        all: orgs.length,
        reseller: orgs.filter(o => o.organization_type === 'reseller').length,
        client: orgs.filter(o => o.organization_type === 'client' || !o.organization_type).length,
        platform: orgs.filter(o => o.organization_type === 'platform').length,
        active: orgs.filter(o => o.status === 'active').length,
        suspended: orgs.filter(o => o.status === 'suspended').length,
    }

    const filterOptions: FilterOption[] = [
        { id: 'all', label: 'Todas', count: counts.all, color: 'gray' },
        { id: 'reseller', label: 'Resellers', count: counts.reseller, color: 'blue' },
        { id: 'client', label: 'Clientes', count: counts.client, color: 'emerald' },
        { id: 'platform', label: 'Plataforma', count: counts.platform, color: 'purple' },
    ]

    // 1. Filter First
    const filteredOrgs = orgs.filter(o => {
        const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
            o.slug.toLowerCase().includes(search.toLowerCase())

        if (!matchesSearch) return false

        if (activeFilter === 'all') return true
        if (['reseller', 'client', 'platform'].includes(activeFilter)) {
            return (o.organization_type || 'client') === activeFilter
        }
        return true
    })

    // 2. Build Tree (Only for List View usually, but let's prep logic)
    // Map ID -> Children
    const orgMap = new Map<string, Organization[]>()
    const rootOrgs: Organization[] = []

    filteredOrgs.forEach(org => {
        if (org.parent_organization_id && orgs.find(p => p.id === org.parent_organization_id)) {
            // It's a child of a known org in the full list (not just filtered)
            // Ideally we only nest if parent is also in filtered list? 
            // Or if parent is strictly in the dataset.
            // Let's assume if parent is filtered out, we show child as root? 
            // Better to show child as root if parent not visible.
            if (filteredOrgs.find(p => p.id === org.parent_organization_id)) {
                const existing = orgMap.get(org.parent_organization_id) || []
                orgMap.set(org.parent_organization_id, [...existing, org])
            } else {
                rootOrgs.push(org)
            }
        } else {
            rootOrgs.push(org)
        }
    })

    // Helper to flatten
    const flattenTree = (nodes: Organization[], depth = 0): { org: Organization, depth: number, hasChildren: boolean }[] => {
        let result: { org: Organization, depth: number, hasChildren: boolean }[] = []
        nodes.forEach(node => {
            const children = orgMap.get(node.id) || []
            const hasChildren = children.length > 0
            result.push({ org: node, depth, hasChildren })
            if (hasChildren && expandedOrgs.has(node.id)) {
                result = [...result, ...flattenTree(children, depth + 1)]
            }
        })
        return result
    }

    const treeData = flattenTree(rootOrgs)

    return (
        <div className="space-y-8 bg-gray-50/50 min-h-screen">
            <SetPasswordModal />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        <SplitText>Organizaciones</SplitText>
                    </h2>
                    <p className="text-muted-foreground mt-1">Gestión global de organizaciones.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="mr-2 h-4 w-4" /> Nueva Organización
                    </Button>
                </div>
            </div>

            {/* Unified Control Block */}
            <div className="flex flex-col md:flex-row gap-3 sticky top-4 z-30">
                <SearchFilterBar
                    searchTerm={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Buscar organización..."
                    filters={filterOptions}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
                <ViewToggle
                    view={viewMode}
                    onViewChange={setViewMode}
                    showCompact={false} // Disable compact
                />
            </div>

            {viewMode === 'list' ? (
                <Card className="border-gray-200 shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6 w-[400px]">Identidad / Jerarquía</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Creada</TableHead>
                                    <TableHead className="text-right pr-6">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Cargando...
                                        </TableCell>
                                    </TableRow>
                                ) : treeData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                            No se encontraron organizaciones.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    treeData.map(({ org, depth, hasChildren }) => (
                                        <TableRow key={org.id} className="group hover:bg-gray-50/50">
                                            <TableCell className="pl-6">
                                                <div
                                                    className="flex items-center gap-3"
                                                    style={{ paddingLeft: `${depth * 32}px` }}
                                                >
                                                    {/* Hierarchy Connector (Visual) */}
                                                    {depth > 0 && (
                                                        <div className="absolute left-6 w-px h-full bg-indigo-100/0" style={{ marginLeft: `${(depth - 1) * 32 + 19}px` }}> {/* Placeholder for future connector lines if needed */} </div>
                                                    )}

                                                    {/* Expand Toggle or Spacer */}
                                                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                                        {hasChildren ? (
                                                            <button
                                                                onClick={() => toggleExpand(org.id)}
                                                                className="hover:bg-gray-200 rounded p-0.5 transition-colors"
                                                            >
                                                                {expandedOrgs.has(org.id) ? (
                                                                    <div className="h-0 w-0 border-l-[5px] border-l-transparent border-t-[6px] border-t-gray-500 border-r-[5px] border-r-transparent" />
                                                                ) : (
                                                                    <div className="h-0 w-0 border-t-[5px] border-t-transparent border-l-[6px] border-l-gray-500 border-b-[5px] border-b-transparent" />
                                                                )}
                                                            </button>
                                                        ) : (
                                                            depth > 0 && <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                                        )}
                                                    </div>

                                                    <Avatar className="h-9 w-9 rounded-lg border shadow-sm">
                                                        <AvatarImage src={org.logo_url} className="object-cover" />
                                                        <AvatarFallback><Building2 className="h-4 w-4 text-gray-400" /></AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className={cn(
                                                            "font-medium",
                                                            depth === 0 ? "text-gray-900" : "text-gray-700"
                                                        )}>{org.name}</span>
                                                        <span className="text-xs text-gray-400">{org.slug}</span>
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
                                                        onClick={() => handleOpenLimits(org)}
                                                        title="Gestionar Límites"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Settings2 className="h-4 w-4" />
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
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                    {/* Grid view usually doesn't show hierarchy as well, we just flatten or stick to filteredOrgs */}
                    {/* Note: User specifically asked for Tree Management, which usually implies List. But kept Cards for visual overview. */}
                    {/* We'll use filteredOrgs (flattened) for Grid to avoid complex nested cards UI for now unless requested. */}
                    {isLoading ? (
                        [1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-gray-100 border-0" />)
                    ) : filteredOrgs.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No se encontraron organizaciones.
                        </div>
                    ) : (
                        filteredOrgs.map((org: any) => (
                            <div key={org.id} className="group relative">
                                <Card className="hover:shadow-lg transition-all duration-300 border-gray-200">
                                    <CardHeader className="pb-3 pt-5 px-5">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-4">
                                                <Avatar className="h-12 w-12 rounded-xl border border-gray-100 shadow-sm bg-white">
                                                    <AvatarImage src={org.logo_url} className="object-cover" />
                                                    <AvatarFallback className="bg-gray-50"><Building2 className="h-5 w-5 text-gray-400" /></AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-semibold text-lg leading-tight">{org.name}</h3>
                                                    <p className="text-xs text-muted-foreground mt-1">{org.slug}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={cn(
                                                "capitalize border-transparent ml-2",
                                                org.organization_type === 'platform' ? 'bg-purple-100 text-purple-700' :
                                                    org.organization_type === 'reseller' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'
                                            )}>
                                                {org.organization_type || 'Client'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-5 py-3 border-t border-dashed border-gray-100">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Estado</span>
                                            <Badge variant={org.status === 'active' ? 'secondary' : 'destructive'} className={cn(
                                                "capitalize shadow-none h-5 px-2",
                                                org.status === 'active' ? "bg-green-100 text-green-700 hover:bg-green-200" : ""
                                            )}>
                                                {org.status || 'Active'}
                                            </Badge>
                                        </div>
                                        {org.parent_organization && (
                                            <div className="flex justify-between items-center text-sm mt-2">
                                                <span className="text-gray-500">Dependencia</span>
                                                <span className="font-medium text-gray-700">{org.parent_organization.name}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-sm mt-2">
                                            <span className="text-gray-500">Creada</span>
                                            <span className="text-gray-700">{format(new Date(org.created_at), "d MMM, yyyy", { locale: es })}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="px-5 py-3 bg-gray-50/50 flex justify-between items-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenLimits(org)}
                                            className="text-gray-500 hover:text-indigo-600"
                                        >
                                            <Settings2 className="h-4 w-4 mr-2" /> Límites
                                        </Button>
                                        <Button size="sm" variant="default" className="bg-gray-900 text-white hover:bg-black h-8 px-4 rounded-full text-xs">
                                            Gestionar <ArrowRight className="ml-1.5 h-3 w-3" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                        ))
                    )}
                </div>
            )}

            <CreateOrganizationSheet
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={fetchOrgs}
            />

            {selectedOrgForLimits && (
                <EditLimitsModal
                    open={isLimitsOpen}
                    onOpenChange={setIsLimitsOpen}
                    organizationId={selectedOrgForLimits.id}
                    organizationName={selectedOrgForLimits.name}
                />
            )}
        </div>
    )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Search, Building, Plus, Settings, Pencil, Ban, CheckCircle, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CreateOrganizationSheet } from "@/components/organizations/create-organization-sheet"
import { OrgDetailsSheet } from "@/components/admin/org-details-sheet"
import { EditOrganizationDialog } from "@/components/admin/edit-organization-dialog"
import { updateOrganizationStatus, deleteOrganization, type AdminOrganization } from '@/modules/core/admin/actions'
import { toast } from 'sonner'

const PROTECTED_ORG_SLUGS = ['pixy', 'pixy-agency', 'pixy-pds']

interface TenantsManagerProps {
    organizations: any[]
    allModules: any[]
}

export function TenantsManager({ organizations, allModules }: TenantsManagerProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all')
    const [creationOpen, setCreationOpen] = useState(false)

    // Premium Sheet and Edit States
    const [activeSheetOrgId, setActiveSheetOrgId] = useState<string | null>(null)
    const [editOrg, setEditOrg] = useState<AdminOrganization | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const router = useRouter()

    const filteredOrgs = organizations.filter(org => {
        const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.slug.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filter === 'all' || org.status === filter
        return matchesSearch && matchesFilter
    })

    const handleDelete = async (orgId: string) => {
        if (!confirm("CRITICAL WARNING: This will permanently DELETE the organization and ALL its data (clients, invoices, etc).\n\nAre you absolutely sure?")) return;

        try {
            await deleteOrganization(orgId)
            toast.success("Organization deleted permanently")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete")
        }
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            {/* INJECT PREMIUM SHEET & EDIT MODAL */}
            <OrgDetailsSheet
                orgId={activeSheetOrgId}
                isOpen={!!activeSheetOrgId}
                onClose={() => setActiveSheetOrgId(null)}
            />
            <EditOrganizationDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                organization={editOrg}
                onSuccess={() => { router.refresh() }}
            />

            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">Red de Organizaciones</h2>
                        <p className="text-sm text-muted-foreground">Gestión centralizada de todos los tenants del sistema.</p>
                    </div>
                    <Button onClick={() => setCreationOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Organización
                    </Button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900/50 p-2 rounded-lg border">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o slug..."
                            className="pl-9 bg-transparent border-none shadow-none focus-visible:ring-0"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="h-6 w-px bg-border mx-2" />
                    <div className="flex gap-2">
                        <Badge
                            variant={filter === 'all' ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => setFilter('all')}
                        >
                            Todos
                        </Badge>
                        <Badge
                            variant={filter === 'active' ? 'secondary' : 'outline'}
                            className="cursor-pointer hover:bg-green-100 hover:text-green-800"
                            onClick={() => setFilter('active')}
                        >
                            Activos
                        </Badge>
                        <Badge
                            variant={filter === 'suspended' ? 'destructive' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => setFilter('suspended')}
                        >
                            Suspendidos
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50 border-b dark:bg-zinc-800/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-semibold h-11">Organización</TableHead>
                            <TableHead className="font-semibold h-11">Tipo</TableHead>
                            <TableHead className="font-semibold h-11">Estado</TableHead>
                            <TableHead className="font-semibold h-11">Membresía</TableHead>
                            <TableHead className="font-semibold h-11">Creada</TableHead>
                            <TableHead className="text-right font-semibold h-11 pr-6">Acciones Rápidas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrgs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground bg-slate-50/50 dark:bg-transparent">
                                    <div className="flex justify-center items-center flex-col gap-2">
                                        <span className="text-4xl opacity-20">∅</span>
                                        <span>No hay tenants (organizaciones) encontrados.</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrgs.map((org) => (
                                <TableRow key={org.id} className="group hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors duration-200">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold shrink-0">
                                                {org.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium flex items-center gap-2">
                                                    {org.name}
                                                    {PROTECTED_ORG_SLUGS.includes(org.slug) && (
                                                        <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0 bg-amber-100 text-amber-800 border-amber-200 ml-1">
                                                            SISTEMA
                                                        </Badge>
                                                    )}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded w-fit mt-1">
                                                    {org.slug}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize bg-white dark:bg-zinc-900 shadow-none border-dashed">
                                            {org.organization_type || 'Client'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={org.status === 'active' ? 'default' : org.status === 'suspended' ? 'destructive' : 'secondary'}
                                            className="capitalize tracking-wider text-[10px] font-bold px-2 py-0.5 rounded-sm"
                                        >
                                            {org.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-muted-foreground">{org.base_app_slug || 'Free Tier'}</span>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(org.created_at), 'dd MMM yyyy', { locale: es })}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">

                                            {/* 1. Settings Action - Opens Sheet */}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 shrink-0 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400"
                                                title="Panel Integral del Tenant"
                                                onClick={() => setActiveSheetOrgId(org.id)}
                                            >
                                                <Settings className="h-4 w-4" />
                                            </Button>

                                            {/* 2. Edit Basic Properties Action */}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 shrink-0 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
                                                title="Editar Parámetros"
                                                onClick={() => { setEditOrg(org); setIsEditOpen(true); }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>

                                            {/* 3. Suspend / Reactivate (if not protected) */}
                                            {!PROTECTED_ORG_SLUGS.includes(org.slug) && (
                                                org.status === 'active' ? (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 shrink-0 dark:bg-orange-900/30 dark:text-orange-400"
                                                        title="Suspender Tenant (Ban)"
                                                        onClick={async () => {
                                                            const result = confirm('¿Confirmas que deseas SUSPENDER esta organización? Los usuarios perderán acceso instantáneamente.')
                                                            if (!result) return
                                                            try {
                                                                await updateOrganizationStatus(org.id, 'suspended', 'Admin Action')
                                                                toast.success('Organización suspendida')
                                                                router.refresh()
                                                            } catch (error: any) {
                                                                toast.error(error.message || 'Error al suspender org')
                                                            }
                                                        }}
                                                    >
                                                        <Ban className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 shrink-0 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                        title="Reactivar Tenant"
                                                        onClick={async () => {
                                                            try {
                                                                await updateOrganizationStatus(org.id, 'active')
                                                                toast.success('Organización reactivada con éxito')
                                                                router.refresh()
                                                            } catch (error: any) {
                                                                toast.error(error.message || 'Error al reactivar')
                                                            }
                                                        }}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                )
                                            )}

                                            {/* 4. Delete Action (if not protected) */}
                                            {!PROTECTED_ORG_SLUGS.includes(org.slug) && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 shrink-0 dark:bg-rose-900/30 dark:text-rose-400"
                                                    title="Eliminar Estructuralmente"
                                                    onClick={() => handleDelete(org.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="mt-4 text-xs text-muted-foreground text-center">
                Mostrando {filteredOrgs.length} de {organizations.length} organizaciones
            </div>

            <CreateOrganizationSheet
                open={creationOpen}
                onOpenChange={setCreationOpen}
                onSuccess={() => {
                    router.refresh()
                }}
            />
        </Card>
    )
}

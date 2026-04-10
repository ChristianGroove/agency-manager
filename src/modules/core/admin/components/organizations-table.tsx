"use client"

import { type AdminOrganization, updateOrganizationStatus, deleteOrganization } from '@/modules/core/admin/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { EditOrganizationDialog } from './edit-organization-dialog'
import { OrgDetailsSheet } from "@/modules/core/admin/components/org-details-sheet"
import { useState } from 'react'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Settings, Ban, CheckCircle, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

const PROTECTED_ORG_SLUGS = ['pixy', 'pixy-agency', 'pixy-pds']

interface OrganizationsTableProps {
    organizations: AdminOrganization[]
    onSelect?: (orgId: string) => void
}

export function OrganizationsTable({ organizations, onSelect }: OrganizationsTableProps) {
    const [editOrg, setEditOrg] = useState<AdminOrganization | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [activeSheetOrgId, setActiveSheetOrgId] = useState<string | null>(null)

    const handleDelete = async (orgId: string) => {
        if (!confirm("CRITICAL WARNING: This will permanently DELETE the organization and ALL its data (clients, invoices, etc).\n\nAre you absolutely sure?")) return;

        try {
            await deleteOrganization(orgId)
            toast.success("Organization deleted permanently")
        } catch (error: any) {
            toast.error(error.message || "Failed to delete")
        }
    }

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-500 hover:bg-green-600 border-green-600 text-[10px] uppercase font-bold tracking-wider rounded-sm p-1 px-2">Active</Badge>
            case 'suspended':
                return <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider rounded-sm p-1 px-2">Suspended</Badge>
            case 'past_due':
                return <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider rounded-sm p-1 px-2 border-orange-200 bg-orange-100 text-orange-800">Past Due</Badge>
            case 'archived':
                return <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded-sm p-1 px-2">Archived</Badge>
            default:
                return <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider rounded-sm p-1 px-2">{status || 'Unknown'}</Badge>
        }
    }

    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <EditOrganizationDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                organization={editOrg}
                onSuccess={() => { }}
            />
            {/* INJECT PREMIUM SHEET */}
            <OrgDetailsSheet
                orgId={activeSheetOrgId}
                isOpen={!!activeSheetOrgId}
                onClose={() => setActiveSheetOrgId(null)}
            />

            <Table>
                <TableHeader className="bg-slate-50 border-b">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-slate-700 h-11 w-[250px]">Organización</TableHead>
                        <TableHead className="font-semibold text-slate-700 h-11">Identificador</TableHead>
                        <TableHead className="font-semibold text-slate-700 h-11">Estado</TableHead>
                        <TableHead className="font-semibold text-slate-700 h-11">App Base (Template)</TableHead>
                        <TableHead className="font-semibold text-slate-700 h-11">Fecha Registro</TableHead>
                        <TableHead className="text-right font-semibold text-slate-700 h-11 pr-6">Acciones Rápidas</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {organizations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground bg-slate-50/50">
                                <div className="flex justify-center items-center flex-col gap-2">
                                    <span className="text-4xl text-slate-200">∅</span>
                                    <span>No hay tenants (organizaciones) configurados.</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        organizations.map((org) => (
                            <TableRow key={org.id} className="group hover:bg-slate-50/80 transition-colors duration-200">
                                <TableCell className="font-medium p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                                            {org.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 font-semibold">{org.name}</span>
                                            {PROTECTED_ORG_SLUGS.includes(org.slug) && (
                                                <Badge variant="secondary" className="text-[10px] w-fit h-4 px-1 py-0 mt-0.5 bg-amber-100 text-amber-800 border-amber-200">
                                                    Sistema (Protegido)
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded select-all border border-slate-200">
                                        {org.slug}
                                    </span>
                                </TableCell>
                                <TableCell className="p-4">{getStatusBadge(org.status)}</TableCell>
                                <TableCell className="p-4">
                                    {org.base_app_slug ? (
                                        <Badge variant="outline" className="bg-white border-dashed text-slate-600 font-mono text-xs shadow-none">
                                            {org.base_app_slug}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground/50 text-sm italic">Sin asginar</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-slate-500 p-4">
                                    {format(new Date(org.created_at), 'dd MMM yyyy')}
                                </TableCell>
                                <TableCell className="text-right p-4 pr-6">
                                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">

                                        {/* 1. Settings Action - Opens Sheet */}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 shrink-0"
                                            title="Panel Integral del Tenant"
                                            onClick={() => setActiveSheetOrgId(org.id)}
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Button>

                                        {/* 2. Edit Basic Properties Action */}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 shrink-0"
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
                                                    className="h-8 w-8 text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 shrink-0"
                                                    title="Suspender Tenant (Ban)"
                                                    onClick={async () => {
                                                        const result = confirm('¿Confirmas que deseas SUSPENDER esta organización? Los usuarios perderán acceso instantáneamente.')
                                                        if (!result) return
                                                        try {
                                                            await updateOrganizationStatus(org.id, 'suspended', 'Admin Action')
                                                            toast.success('Organización suspendida')
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
                                                    className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 shrink-0"
                                                    title="Reactivar Tenant"
                                                    onClick={async () => {
                                                        try {
                                                            await updateOrganizationStatus(org.id, 'active')
                                                            toast.success('Organización reactivada con éxito')
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
                                                className="h-8 w-8 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 shrink-0"
                                                title="Eliminar Estructuralmente"
                                                onClick={() => handleDelete(org.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}

                                    </div>
                                    {/* Action mobile fallback when hover implies nothing */}
                                    <div className="md:hidden flex justify-end">
                                        {/* Keeping empty for now, relying on explicit buttons being shown always on touch devices normally */}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}


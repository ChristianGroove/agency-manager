"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, ArrowLeft, Loader2, MoreHorizontal, Pencil, Ban, CheckCircle, Trash2 } from "lucide-react"
// import { OrganizationsTable } from "@/components/admin/organizations-table" // Removed as we use custom inline list
import { getOrgManagerData, updateOrganizationStatus, deleteOrganization } from "@/modules/core/admin/actions"
import { OrgControlTabs } from "../organizations/_components/org-control-tabs"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditOrganizationDialog } from "@/components/admin/edit-organization-dialog"

interface OrgManagerSheetProps {
    organizations: any[]
    allModules: any[]
}

export function OrgManagerSheet({ organizations, allModules }: OrgManagerSheetProps) {
    const [open, setOpen] = useState(false)
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
    const [orgData, setOrgData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const handleSuspend = async (orgId: string) => {
        const result = confirm('¿Estás seguro de que deseas SUSPENDER esta organización? Los usuarios serán bloqueados inmediatamente.')
        if (!result) return

        try {
            await updateOrganizationStatus(orgId, 'suspended', 'Admin Action via Dashboard')
            toast.success('Organización suspendida')
            handleOrgSelect(orgId) // Reload data
        } catch (error: any) {
            toast.error(error.message || 'Error al suspender')
        }
    }

    const handleReactivate = async (orgId: string) => {
        try {
            await updateOrganizationStatus(orgId, 'active')
            toast.success('Organización reactivada')
            handleOrgSelect(orgId) // Reload data
        } catch (error: any) {
            toast.error(error.message || 'Error al reactivar')
        }
    }

    const handleDelete = async (orgId: string) => {
        if (!confirm("ADVERTENCIA CRÍTICA: Esto eliminará PERMANENTEMENTE la organización y TODOS sus datos.\n\n¿Estás absolutamente seguro?")) return;

        try {
            await deleteOrganization(orgId)
            toast.success("Organización eliminada permanentemente")
            setSelectedOrgId(null) // Go back to list
            setOrgData(null)
        } catch (error: any) {
            toast.error(error.message || "Error al eliminar")
        }
    }

    const handleOrgSelect = async (orgId: string) => {
        setLoading(true)
        setSelectedOrgId(orgId)
        try {
            const data = await getOrgManagerData(orgId)
            setOrgData(data)
        } catch (error: any) {
            toast.error("Error al cargar organización: " + error.message)
            setSelectedOrgId(null) // Reset on error
        } finally {
            setLoading(false)
        }
    }

    const handleBack = () => {
        setSelectedOrgId(null)
        setOrgData(null)
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline">
                    <Building2 className="mr-2 h-4 w-4" />
                    Ver Organizaciones
                </Button>
            </SheetTrigger>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[1000px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    <SheetTitle className="sr-only">
                        {selectedOrgId && orgData?.organization ? `Gestionar ${orgData.organization.name}` : "Gestor de Organizaciones"}
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                        Panel de administración para gestión de organizaciones y módulos.
                    </SheetDescription>
                    {/* Dynamic Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-3">
                            {selectedOrgId ? (
                                <>
                                    <Button variant="ghost" size="icon" onClick={handleBack} className="-ml-2 hover:bg-black/5 rounded-full h-8 w-8 transition-all">
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                                {orgData?.organization?.name || 'Cargando...'}
                                            </h2>
                                            {orgData?.organization?.slug && (
                                                <Badge variant="outline" className="text-[10px] h-5 bg-transparent border-black/10 text-gray-500">
                                                    {orgData.organization.slug}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Administra módulos, usuarios y seguridad.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col">
                                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                        Organizaciones
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Gestiona todos los inquilinos del sistema.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Admin Actions Menu - Only visible when an org is selected */}
                        {selectedOrgId && orgData?.organization && (
                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="ml-auto bg-white hover:bg-gray-50 text-gray-700 border-gray-200">
                                            <MoreHorizontal className="h-4 w-4 mr-2" />
                                            Acciones
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuLabel>Administrar Organización</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="cursor-pointer">
                                            <Pencil className="mr-2 h-4 w-4 text-gray-500" />
                                            Editar Detalles
                                        </DropdownMenuItem>
                                        {/* Status Actions */}
                                        {orgData.organization.slug !== 'pixy' && (
                                            <>
                                                {orgData.organization.status === 'active' ? (
                                                    <DropdownMenuItem
                                                        className="text-amber-600 focus:text-amber-700 cursor-pointer"
                                                        onClick={() => handleSuspend(orgData.organization.id)}
                                                    >
                                                        <Ban className="mr-2 h-4 w-4" />
                                                        Suspender Servicio
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        className="text-green-600 focus:text-green-700 cursor-pointer"
                                                        onClick={() => handleReactivate(orgData.organization.id)}
                                                    >
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        Reactivar Servicio
                                                    </DropdownMenuItem>
                                                )}

                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(orgData.organization.id)}
                                                    className="cursor-pointer text-red-600 focus:text-red-600 bg-red-50/50 focus:bg-red-50"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar Definitivamente
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-gray-50/50 scrollbar-thin scrollbar-thumb-gray-200 h-full">
                        {!selectedOrgId ? (
                            <div className="p-8 max-w-4xl mx-auto space-y-4">
                                {organizations.map((org) => (
                                    <div
                                        key={org.id}
                                        onClick={() => handleOrgSelect(org.id)}
                                        className="
                                            group flex items-center gap-5 p-4 rounded-xl cursor-pointer transition-all duration-200
                                            bg-white border border-gray-100 shadow-sm
                                            hover:border-indigo-200 hover:shadow-md hover:ring-1 hover:ring-indigo-100 hover:-translate-y-0.5
                                        "
                                    >
                                        {/* Icon/Logo */}
                                        <div className="
                                            flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold text-lg shadow-sm transition-transform group-hover:scale-105
                                            bg-indigo-50 border border-indigo-100 text-indigo-600
                                        ">
                                            {org.logo_url ? (
                                                <img src={org.logo_url} alt="" className="h-full w-full object-cover rounded-xl" />
                                            ) : (
                                                <Building2 className="h-6 w-6" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-base text-gray-900 truncate group-hover:text-indigo-900 transition-colors">
                                                    {org.name}
                                                </h3>
                                                <Badge
                                                    variant={org.status === 'active' ? 'default' : 'secondary'}
                                                    className={`h-5 px-1.5 text-[10px] uppercase tracking-wider ${org.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}
                                                >
                                                    {org.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                                    {org.slug}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    App Base: <span className="font-medium text-gray-700">{org.base_app_slug || 'N/A'}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Indicator */}
                                        <div className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                                            <ArrowLeft className="h-4 w-4 rotate-180" />
                                        </div>
                                    </div>
                                ))}

                                {organizations.length === 0 && (
                                    <div className="text-center py-20 text-muted-foreground">
                                        No se encontraron organizaciones.
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Detail View
                            <div className="h-full bg-white">
                                {loading || !orgData ? (
                                    <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                                        <p className="text-sm text-gray-500 animate-pulse">Cargando detalles...</p>
                                    </div>
                                ) : (
                                    <div className="p-8">
                                        <OrgControlTabs data={orgData} allModules={allModules} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 z-20 flex justify-between items-center">
                        <Button variant="ghost" onClick={() => setOpen(false)} className="text-gray-500 hover:text-red-500 hover:bg-red-50">
                            Cerrar Panel
                        </Button>
                        {!selectedOrgId && (
                            <p className="text-xs text-muted-foreground hidden sm:block">
                                {organizations.length} Organizaciones registradas
                            </p>
                        )}
                    </div>
                </div>

                {/* Edit Dialog */}
                {orgData?.organization && (
                    <EditOrganizationDialog
                        open={isEditOpen}
                        onOpenChange={setIsEditOpen}
                        organization={orgData.organization}
                        onSuccess={() => handleOrgSelect(selectedOrgId!)} // Reload data on success
                    />
                )}
            </SheetContent>
        </Sheet>
    )
}

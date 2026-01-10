"use client"

import { Button } from "@/components/ui/button"
import {
    MoreVertical,
    Pencil,
    Trash2,
    StickyNote,
    Globe,
    Layout,
    Plus,
    FileText
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Client } from "@/types"

interface ClientHeaderProps {
    client: Client
    onEdit: () => void
    onDelete: () => void
    onNotes: () => void
    onPortal: () => void
    onConnectivity: () => void
    onNewService: () => void
    onNewInvoice: () => void
}

export function ClientHeader({
    client,
    onEdit,
    onDelete,
    onNotes,
    onPortal,
    onConnectivity,
    onNewService,
    onNewInvoice
}: ClientHeaderProps) {
    return (
        <div className="w-full">
            <div className="px-8 py-6">
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Breadcrumb & Title */}
                    <div className="flex flex-col gap-2">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/clients">Contactos</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{client.name}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>

                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                                {client.name}
                            </h1>
                            {client.status === 'active' && (
                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200 ring-2 ring-white" />
                            )}
                        </div>
                    </div>

                    {/* Right: Actions Toolbar */}
                    <div className="flex items-center gap-3">
                        {/* Primary Actions */}
                        <div className="hidden md:flex items-center gap-2 mr-2">
                            <Button
                                onClick={onNewService}
                                size="sm"
                                className="bg-gray-900 text-white hover:bg-black shadow-sm h-8 text-xs font-semibold"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Nuevo Servicio
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onNewInvoice}
                                className="h-8 text-xs font-medium border-gray-200 hover:bg-gray-50"
                            >
                                <FileText className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                                Documento
                            </Button>
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block" />

                        {/* Secondary Actions (Icon Buttons) */}
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                                onClick={onNotes}
                                title="Notas"
                            >
                                <StickyNote className="h-4 w-4" />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:bg-gray-100">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Gestión</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={onEdit}>
                                        <Pencil className="w-4 h-4 mr-2" /> Editar Cliente
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onPortal}>
                                        <Layout className="w-4 h-4 mr-2 text-indigo-500" /> Portal Cliente
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onConnectivity}>
                                        <Globe className="w-4 h-4 mr-2 text-pink-500" /> Conectividad
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

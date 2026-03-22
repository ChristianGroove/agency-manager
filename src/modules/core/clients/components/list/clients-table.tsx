"use client"

import React from "react"
import { useClients } from "../../context/clients-context"
import { useTranslation } from "@/lib/i18n/use-translation"
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreVertical, Phone, FileText, Trash2, Globe, Wifi, Shield, StickyNote } from "lucide-react"
import { cn } from "@/lib/utils"
import { VERTICAL_REGISTRY } from "@/modules/core/organizations/vertical-registry"
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

export function ClientsTable({ 
    clients, 
    loading, 
    onManage, 
    onDelete, 
    onCommunication,
    onInvoices,
    onConnectivity,
    onPortal,
    onGoToPortal,
    onNotes
}: { 
    clients: any[]
    loading: boolean
    onManage: (client: any) => void
    onDelete: (id: string) => void
    onCommunication: (client: any) => void
    onInvoices: (client: any) => void
    onConnectivity: (client: any) => void
    onPortal: (client: any) => void
    onGoToPortal: (client: any) => void
    onNotes?: (client: any) => void
}) {
    const { t } = useTranslation()
    const router = useRouter()
    const { selectedIds, toggleSelection, toggleAll, spaceType } = useClients()
    const config = VERTICAL_REGISTRY[spaceType]

    return (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md shadow-sm overflow-hidden flex flex-col flex-1 h-full relative">
            <div className="flex-none border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 backdrop-blur-md z-20">
                <Table className="w-full">
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={clients.length > 0 && selectedIds.size === clients.length}
                                    onCheckedChange={() => toggleAll(clients.map(c => c.id))}
                                />
                            </TableHead>
                            <TableHead>{t('clients.table.client')}</TableHead>
                            <TableHead className="text-right w-[100px]">{t('clients.table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                </Table>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-modern relative">
                <Table className="w-full">
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center">Cargando...</TableCell></TableRow>
                        ) : clients.length === 0 ? (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center">{t('clients.empty')}</TableCell></TableRow>
                        ) : (
                            clients.map((client, index) => (
                                <TableRow key={client.id || `client-${index}`} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 border-gray-100 dark:border-white/10">
                                    <TableCell className="w-[50px]">
                                        <Checkbox
                                            checked={selectedIds.has(client.id)}
                                            onCheckedChange={() => toggleSelection(client.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={client.logo_url} />
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                    {client.name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium dark:text-white">{client.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{client.company_name}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => onCommunication(client)} title="Comunicación" className="text-slate-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary hover:bg-primary/10 h-8 w-8 mb-0 transition-colors">
                                                <Phone className="h-4 w-4" />
                                            </Button>
                                            {config.management.actions.showBilling && (
                                                <Button variant="ghost" size="icon" onClick={() => onInvoices(client)} title="Facturación" className="text-slate-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 h-8 w-8 transition-colors">
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {(spaceType === 'agency' || spaceType === 'platform') && (
                                                <Button variant="ghost" size="icon" onClick={() => onGoToPortal(client)} title="Ir al Portal" className="text-slate-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 h-8 w-8 transition-colors">
                                                    <Globe className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => onNotes?.(client)} title="Notas Rápidas" className="text-slate-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 h-8 w-8 transition-colors">
                                                <StickyNote className="h-4 w-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                                        <MoreVertical className="h-4 w-4" />
                                                     </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 dark:bg-slate-900 dark:border-white/10">
                                                    <DropdownMenuLabel className="dark:text-gray-400">{t('clients.actions.administration')}</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="dark:bg-white/10" />
                                                    <DropdownMenuItem onClick={() => onManage(client)}>
                                                        <FileText className="mr-2 h-4 w-4" /> {t('clients.actions.manage')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onConnectivity(client)}>
                                                        <Wifi className="mr-2 h-4 w-4" /> {t('clients.actions.connectivity')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onPortal(client)}>
                                                        <Shield className="mr-2 h-4 w-4" /> {t('clients.actions.portal_governance')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="dark:bg-white/10" />
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-500/10" onClick={() => onDelete(client.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> {t('clients.actions.delete')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

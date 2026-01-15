"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Phone, ArrowRight, AlertTriangle, CheckCircle2, Clock, CreditCard, FileText, Globe, MoreVertical, Edit, Wifi, Shield, Trash2, Copy } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import { cn, getPortalUrl, getPortalShortUrl } from "@/lib/utils"
import { getWhatsAppLink } from "@/lib/communication-utils"
import { WhatsAppActionsModal } from "@/modules/core/clients/whatsapp-modal"
import { SplitText } from "@/components/ui/split-text"
import { Client } from "@/types"
import { CreateClientSheet } from "@/modules/core/clients/create-client-sheet"
import { CreateServiceSheet } from "@/modules/core/billing/components/create-service-sheet"
import { quickCreateProspect } from "@/modules/core/clients/actions"
import { getClients } from "@/modules/core/clients/actions"
import { SearchFilterBar, FilterOption } from "@/components/shared/search-filter-bar"
import { ViewToggle, ViewMode } from "@/components/shared/view-toggle"

import { Checkbox } from "@/components/ui/checkbox"
import { BulkActionsFloatingBar } from "@/components/shared/bulk-actions-floating-bar"
import { toast } from "sonner"

// New Management Sheets
import { ClientManagementSheet } from "@/modules/core/clients/components/management/client-management-sheet"
import { EditClientSheet } from "@/modules/core/clients/components/detail/edit-client-sheet"
import { ConnectivitySheet } from "@/components/sheets/connectivity-sheet"
import { PortalGovernanceSheet } from "@/components/sheets/portal-governance-sheet"

interface ClientsViewProps {
    initialClients: Client[]
    initialSettings: any
}

export function ClientsView({ initialClients, initialSettings }: ClientsViewProps) {
    const [clients, setClients] = useState<Client[]>(initialClients || [])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [settings, setSettings] = useState<any>(initialSettings)
    // Bulk Actions State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)


    // Invoices Modal State
    const [isInvoicesModalOpen, setIsInvoicesModalOpen] = useState(false)
    const [selectedClientForInvoices, setSelectedClientForInvoices] = useState<Client | null>(null)

    // WhatsApp Actions Modal
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
    const [selectedClientForWhatsApp, setSelectedClientForWhatsApp] = useState<Client | null>(null)

    // --- NEW SHEETS STATE ---
    const [managementOpen, setManagementOpen] = useState(false)
    const [selectedClientForManagement, setSelectedClientForManagement] = useState<Client | null>(null)

    const [editOpen, setEditOpen] = useState(false)
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null)

    const [connectivityOpen, setConnectivityOpen] = useState(false)
    const [clientForConnectivity, setClientForConnectivity] = useState<Client | null>(null)

    const [portalOpen, setPortalOpen] = useState(false)
    const [clientForPortal, setClientForPortal] = useState<Client | null>(null)
    // ------------------------

    // View State
    const [viewMode, setViewMode] = useState<ViewMode>('grid')

    // Initial load from storage
    useEffect(() => {
        const savedView = localStorage.getItem('clients-view-mode') as ViewMode
        if (savedView) {
            setViewMode(savedView)
        }
    }, [])

    const handleViewChange = (mode: ViewMode) => {
        setViewMode(mode)
        localStorage.setItem('clients-view-mode', mode)
    }


    const handleOpenInvoices = (client: Client) => {
        setSelectedClientForInvoices(client)
        setIsInvoicesModalOpen(true)
    }

    const handleMarkAsPaid = async (invoiceId: string) => {
        try {
            // Import dynamically to avoid server component issues in client
            const { registerManualPayment } = await import("@/modules/core/billing/payments-actions")
            const result = await registerManualPayment(invoiceId)

            if (!result.success) throw new Error(result.error)

            // Update local state
            if (selectedClientForInvoices && selectedClientForInvoices.invoices) {
                const updatedInvoices = selectedClientForInvoices.invoices.map(inv =>
                    inv.id === invoiceId ? { ...inv, status: 'paid' } : inv
                )
                // @ts-ignore
                setSelectedClientForInvoices({ ...selectedClientForInvoices, invoices: updatedInvoices })
            }

            // Refresh main list
            fetchClients()
        } catch (error) {
            console.error("Error marking invoice as paid:", error)
            alert("Error al actualizar la factura: " + (error as any).message)
        }
    }

    const fetchClients = async () => {
        // Only show loading if strictly necessary, or maybe a background refresh indicator
        // For now, keeping it simple but maybe without full page loader if we want smoothness
        // setLoading(true) 
        try {
            const data = await getClients()
            if (data) {
                setClients(data)
            }
        } catch (error) {
            console.error("Error fetching clients:", error)
        } finally {
            // setLoading(false)
        }
    }

    const getNextPayment = (client: Client) => {
        const dates: { date: Date, source: string }[] = []

        // Add hosting renewals
        client.hosting_accounts?.forEach(h => {
            if (h.status === 'active' && h.renewal_date) dates.push({ date: new Date(h.renewal_date), source: 'Hosting' })
        })

        // Add subscriptions
        client.subscriptions?.forEach(s => {
            if (s.status === 'active' && s.next_billing_date) dates.push({ date: new Date(s.next_billing_date), source: s.name })
        })

        if (dates.length === 0) return null

        // Sort by date asc
        dates.sort((a, b) => a.date.getTime() - b.date.getTime())
        return dates[0]
    }

    const getDaysDiff = (targetDate: Date) => {
        const now = new Date()
        const diffTime = targetDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'overdue' | 'urgent' | 'active' | 'inactive'

    // Process clients with status logic for filtering
    const clientsWithStatus = clients.map(client => {
        let futureDebt = 0
        const debt = client.invoices?.reduce((acc, inv: any) => {
            if (inv.deleted_at) return acc // Skip deleted
            if (inv.status !== 'pending' && inv.status !== 'overdue') return acc

            if (inv.due_date) {
                const dueDate = new Date(inv.due_date)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                dueDate.setHours(0, 0, 0, 0)

                if (today > dueDate) return acc + inv.total
                else {
                    futureDebt += inv.total
                    return acc
                }
            }

            // If no due date, treat as pending/future, not overdue
            futureDebt += inv.total
            return acc
        }, 0) || 0

        const activeServicesCount = (client.services ? client.services.filter((s: any) => s.status === 'active' && !s.deleted_at).length : 0) +
            (client.subscriptions ? client.subscriptions.filter((s: any) => s.status === 'active' && !s.deleted_at).length : 0)

        let status = 'active' // Default
        if (debt > 0) status = 'overdue'
        else if (futureDebt > 0) status = 'urgent'
        else if (activeServicesCount === 0) status = 'inactive'

        const nextPayment = getNextPayment(client)
        const daysToPay = nextPayment ? getDaysDiff(nextPayment.date) : null

        return { ...client, debt, futureDebt, status, activeServicesCount, nextPayment, daysToPay }
    })

    const filteredClients = clientsWithStatus.filter(client => {
        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.company_name && client.company_name.toLowerCase().includes(searchTerm.toLowerCase()))

        if (!matchesSearch) return false
        if (activeFilter === 'all') return true
        return client.status === activeFilter
    })

    // Bulk Actions Handlers
    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds)
        if (newSelection.has(id)) {
            newSelection.delete(id)
        } else {
            newSelection.add(id)
        }
        setSelectedIds(newSelection)
    }

    const toggleAll = () => {
        if (selectedIds.size === filteredClients.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredClients.map(client => client.id)))
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`¿Estás seguro de eliminar ${selectedIds.size} contactos seleccionados?`)) return

        setIsDeleting(true)
        try {
            const { deleteClients } = await import("@/modules/core/clients/actions")
            const result = await deleteClients(Array.from(selectedIds))
            if (result.success) {
                toast.success(`${selectedIds.size} contactos eliminados`)
                setSelectedIds(new Set())
                await fetchClients()
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            console.error("Error deleting clients:", error)
            toast.error("Error al eliminar contactos: " + error.message)
        } finally {
            setIsDeleting(false)
        }
    }

    const handleSingleDelete = async (id: string) => {
        if (!confirm("ADVERTENCIA: ¿Estás seguro de eliminar este contacto? Se borrarán todos los datos asociados.")) return

        try {
            const { deleteClients } = await import("@/modules/core/clients/actions")
            const result = await deleteClients([id])
            if (result.success) {
                toast.success("Contacto eliminado")
                await fetchClients()
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            console.error("Error deleting client:", error)
            toast.error("Error al eliminar contacto: " + error.message)
        }
    }



    // Counts for tabs
    const counts = {
        all: clients.length,
        overdue: clientsWithStatus.filter(c => c.status === 'overdue').length,
        urgent: clientsWithStatus.filter(c => c.status === 'urgent').length,
        active: clientsWithStatus.filter(c => c.status === 'active').length,
        inactive: clientsWithStatus.filter(c => c.status === 'inactive').length,
    }

    const filterOptions: FilterOption[] = [
        { id: 'all', label: 'Todos', count: counts.all, color: 'gray' },
        { id: 'overdue', label: 'Vencidos', count: counts.overdue, color: 'red' },
        { id: 'urgent', label: 'Por Vencer', count: counts.urgent, color: 'amber' },
        { id: 'active', label: 'Al día', count: counts.active, color: 'emerald' },
        { id: 'inactive', label: 'Sin Servicio', count: counts.inactive, color: 'slate' },
    ]

    const isCompactView = viewMode === 'compact'


    return (
        <div className="space-y-4 h-[calc(100vh-2rem)] flex flex-col bg-gray-50/50 dark:bg-transparent">
            {/* Header Section - Fixed */}
            <div className="flex-none space-y-4 pr-1">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                            <SplitText>Contactos</SplitText>
                        </h2>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Link href="/debug/tokens">
                            <Button variant="outline" className="h-9 px-4 border-gray-200 text-gray-600 hover:bg-gray-50">
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Tokens
                            </Button>
                        </Link>

                        <CreateClientSheet onSuccess={fetchClients} />
                    </div>
                </div>

                {/* Unified Control Block & View Toggle */}
                <div className="flex flex-col md:flex-row gap-3 z-30">
                    <SearchFilterBar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder="Buscar contacto rapidísimo..."
                        filters={filterOptions}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                    />

                    <ViewToggle
                        view={viewMode}
                        onViewChange={handleViewChange}
                    />
                </div>
            </div>

            {/* Clients Content - Scrollable Area */}
            <div className="flex-1 min-h-0 relative flex flex-col">
                {viewMode !== 'list' ? (
                    <div className="flex-1 overflow-y-auto p-6 pb-20"> {/* pb-20 for floating bar space */}
                        <BulkActionsFloatingBar
                            selectedCount={selectedIds.size}
                            onDelete={handleBulkDelete}
                            onClearSelection={() => setSelectedIds(new Set())}
                            isDeleting={isDeleting}
                        />
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
                            {loading ? (
                                [1, 2, 3, 4].map(i => (
                                    <Card key={i} className="h-[300px] animate-pulse bg-gray-100 border-0" />
                                ))
                            ) : filteredClients.length === 0 ? (
                                <div className="col-span-full text-center py-12 text-muted-foreground">
                                    No se encontraron contactos.
                                </div>
                            ) : (
                                filteredClients.map((client: any) => {
                                    const { debt, futureDebt, nextPayment, daysToPay, activeServicesCount } = client

                                    const isOverdue = daysToPay !== null && daysToPay < 0 && debt > 0
                                    const isUrgent = daysToPay !== null && (
                                        (daysToPay <= 5 && daysToPay >= 0) ||
                                        (daysToPay < 0 && debt === 0)
                                    )

                                    return (
                                        <div key={client.id} className="group relative">
                                            {/* Animated Border Effect */}
                                            <Card className={cn(
                                                "relative h-full flex flex-col hover:shadow-lg transition-all duration-300 bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 backdrop-blur-sm",
                                                debt > 0
                                                    ? "animate-shadow-pulse-slow-red"
                                                    : futureDebt > 0
                                                        ? "animate-shadow-pulse-slow-amber"
                                                        : ""
                                            )}>
                                                <CardHeader className="pb-3 pt-5 px-5 relative">

                                                    {/* Dropdown Menu - Absolute Top Right */}
                                                    <div className="absolute top-4 right-4 z-20">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
                                                                    <MoreVertical className="h-4 w-4 text-gray-400" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-56">
                                                                <DropdownMenuLabel>Administración</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => { setClientToEdit(client); setEditOpen(true); }}>
                                                                    <Edit className="mr-2 h-4 w-4" /> Editar Información
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => { setClientForConnectivity(client); setConnectivityOpen(true); }}>
                                                                    <Wifi className="mr-2 h-4 w-4" /> Conectividad
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => { setClientForPortal(client); setPortalOpen(true); }}>
                                                                    <Shield className="mr-2 h-4 w-4" /> Gobernanza del Portal
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                    onClick={() => handleSingleDelete(client.id)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Contacto
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <div className="flex items-start gap-4">
                                                        {/* Avatar with enhanced styling */}
                                                        <div className="relative">
                                                            <Avatar className="h-14 w-14 rounded-full border-2 border-white shadow-md ring-1 ring-gray-100 overflow-hidden bg-white">
                                                                <AvatarImage src={client.logo_url} className="object-cover w-full h-full" />
                                                                <AvatarFallback className="bg-gray-100 text-gray-600 font-bold text-lg rounded-full">
                                                                    {client.name.substring(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            {/* Active indicator */}
                                                            <div className={cn(
                                                                "absolute -bottom-1 -right-1 h-3.5 w-3.5 border-2 border-white rounded-full",
                                                                debt > 0 ? "bg-red-500" : futureDebt > 0 ? "bg-amber-500" : "bg-emerald-500"
                                                            )} />
                                                        </div>

                                                        <div className="flex-1 min-w-0 pr-10"> {/* Added padding-right to avoid overlap with menu */}
                                                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight line-clamp-2 break-words">
                                                                {client.name}
                                                            </h3>
                                                            {client.company_name && (
                                                                <p className="text-sm text-gray-500 mt-0.5 truncate">
                                                                    {client.company_name}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardHeader>

                                                <CardContent className={cn("px-5 space-y-3 flex-1", "pb-5")}>
                                                    {/* Status Block - Full Width & Single Line */}
                                                    {!isCompactView && (
                                                        <div className={cn(
                                                            "w-full px-4 py-3 rounded-lg border transition-colors flex items-center shadow-sm",
                                                            debt > 0
                                                                ? "bg-red-50 border-red-100 justify-between"
                                                                : futureDebt > 0
                                                                    ? "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 justify-between"
                                                                    : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 justify-center"
                                                        )}>
                                                            <div className="flex items-center gap-2">
                                                                {debt > 0 ? (
                                                                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                                                                ) : futureDebt > 0 ? (
                                                                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                                                                ) : (
                                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                                )}
                                                                <span className={cn(
                                                                    "font-medium uppercase tracking-wide text-sm",
                                                                    debt > 0 ? "text-red-700 dark:text-red-400" : futureDebt > 0 ? "text-amber-700 dark:text-amber-400" : "text-gray-700 dark:text-gray-300"
                                                                )}>
                                                                    {debt > 0 ? "Vencido" : futureDebt > 0 ? "Por Vencer" : "Al día"}
                                                                </span>
                                                            </div>

                                                            {(debt > 0 || futureDebt > 0) && (
                                                                <p className={cn(
                                                                    "text-lg font-bold leading-none",
                                                                    debt > 0 ? "text-red-900 dark:text-red-300" : "text-amber-900 dark:text-amber-300"
                                                                )}>
                                                                    {debt > 0
                                                                        ? `$${debt.toLocaleString()}`
                                                                        : `$${futureDebt.toLocaleString()}`
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Next Payment Section */}
                                                    {!isCompactView && (
                                                        nextPayment ? (
                                                            <div className={cn(
                                                                "p-3 rounded-lg border transition-all h-[74px] flex flex-col justify-center",
                                                                isOverdue
                                                                    ? "bg-red-50 border-red-100"
                                                                    : isUrgent
                                                                        ? "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20"
                                                                        : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10"
                                                            )}>
                                                                <div className="flex items-center justify-between mb-1.5 pt-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <Clock className={cn(
                                                                            "h-3.5 w-3.5",
                                                                            isOverdue ? "text-red-600" : isUrgent ? "text-amber-600" : "text-gray-500"
                                                                        )} />
                                                                        <span className={cn(
                                                                            "text-xs font-medium uppercase tracking-wide",
                                                                            isOverdue ? "text-red-700" : isUrgent ? "text-amber-700" : "text-gray-600"
                                                                        )}>
                                                                            {isOverdue
                                                                                ? "¡Vencido!"
                                                                                : (daysToPay !== null && daysToPay < 0)
                                                                                    ? "Pendiente"
                                                                                    : "Próximo Pago"
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <Badge variant="secondary" className={cn(
                                                                        "text-[10px] font-semibold h-5 px-2",
                                                                        isOverdue
                                                                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                                                                            : isUrgent
                                                                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                                    )}>
                                                                        {daysToPay !== null && daysToPay < 0
                                                                            ? `Hace ${Math.abs(daysToPay!)}d`
                                                                            : `${daysToPay}d`}
                                                                    </Badge>
                                                                </div>
                                                                <p className={cn(
                                                                    "text-sm font-medium truncate pb-1",
                                                                    isOverdue ? "text-red-900" : isUrgent ? "text-amber-900" : "text-gray-900"
                                                                )}>
                                                                    {nextPayment.source}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="p-3 rounded-lg border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-center h-[74px] flex flex-col justify-center items-center">
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Sin cobros programados</p>
                                                            </div>
                                                        )
                                                    )}
                                                </CardContent>

                                                {/* Action Buttons - Modernized */}
                                                <CardFooter className="px-5 pb-5 pt-0 flex gap-2 items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full bg-gray-50 text-gray-400 hover:bg-white hover:text-green-600 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-green-100 transition-all duration-300"
                                                            title="Contactar por WhatsApp"
                                                            onClick={() => {
                                                                setSelectedClientForWhatsApp(client)
                                                                setIsWhatsAppModalOpen(true)
                                                            }}
                                                        >
                                                            <Phone className="h-4 w-4" />
                                                        </Button>

                                                        {/* Quick Documents (Invoices) */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full bg-gray-50 text-gray-400 hover:bg-white hover:text-blue-600 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-blue-100 transition-all duration-300"
                                                            title="Documentos Rápidos"
                                                            onClick={() => handleOpenInvoices(client)}
                                                        >
                                                            <FileText className="h-4 w-4" />
                                                        </Button>

                                                        {/* Portal Actions */}
                                                        {(client.portal_short_token || client.portal_token) && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-full bg-gray-50 text-gray-400 hover:bg-white hover:text-purple-600 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-purple-100 transition-all duration-300"
                                                                    title="Abrir Portal"
                                                                    onClick={() => window.open(getPortalUrl(`/portal/${client.portal_short_token || client.portal_token}`), '_blank')}
                                                                >
                                                                    <Globe className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedClientForManagement(client)
                                                            setManagementOpen(true)
                                                        }}
                                                        className="ml-auto h-8 px-4 text-xs font-semibold rounded-full bg-gray-900 text-white hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
                                                    >
                                                        <span>Gestionar</span>
                                                        <ArrowRight className="h-3 w-3 ml-1.5 transition-transform group-hover:translate-x-1" />
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0 relative">
                        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md shadow-sm overflow-hidden flex flex-col flex-1 h-full relative">
                            <BulkActionsFloatingBar
                                selectedCount={selectedIds.size}
                                onDelete={handleBulkDelete}
                                onClearSelection={() => setSelectedIds(new Set())}
                                isDeleting={isDeleting}
                            />

                            {/* Fixed Header */}
                            <div className="flex-none border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 backdrop-blur-md z-20">
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="w-[50px]">
                                                <Checkbox
                                                    checked={filteredClients.length > 0 && selectedIds.size === filteredClients.length}
                                                    onCheckedChange={toggleAll}
                                                />
                                            </TableHead>
                                            <TableHead>Contacto</TableHead>
                                            <TableHead className="w-[150px]">Estado</TableHead>
                                            <TableHead className="w-[150px]">Servicios</TableHead>
                                            <TableHead className="w-[180px]">Próximo Cobro</TableHead>
                                            <TableHead className="text-right w-[100px]">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                </Table>
                            </div>

                            {/* Scrollable Body - with pipeline scrollbar style */}
                            <div className="flex-1 overflow-y-auto scrollbar-modern relative">
                                <Table className="w-full">
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                                    Cargando...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredClients.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                                                    No se encontraron contactos.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredClients.map((client: any) => {
                                                const { debt, futureDebt, nextPayment, daysToPay, activeServicesCount } = client
                                                const isOverdue = daysToPay !== null && daysToPay < 0 && debt > 0

                                                return (
                                                    <TableRow key={client.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 border-gray-100 dark:border-white/10">
                                                        <TableCell className="w-[50px]">
                                                            <Checkbox
                                                                checked={selectedIds.has(client.id)}
                                                                onCheckedChange={() => toggleSelection(client.id)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative">
                                                                    <Avatar className="h-10 w-10 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-100">
                                                                        <AvatarImage src={client.logo_url} />
                                                                        <AvatarFallback className="text-xs bg-gray-100 rounded-full">
                                                                            {client.name.substring(0, 2).toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className={cn(
                                                                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 border-2 border-white rounded-full",
                                                                        debt > 0 ? "bg-red-500" : futureDebt > 0 ? "bg-amber-500" : "bg-emerald-500"
                                                                    )} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                                                                    {client.company_name && (
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{client.company_name}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="w-[120px]">
                                                            <div className="flex">
                                                                <Badge variant="outline" className={cn(
                                                                    "border-0 px-2 py-0.5 h-6 whitespace-nowrap",
                                                                    debt > 0 ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                                                                        : futureDebt > 0 ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
                                                                            : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                                                )}>
                                                                    {debt > 0 ? "Vencido" : futureDebt > 0 ? "Por Vencer" : "Al día"}
                                                                </Badge>
                                                                {(debt > 0 || futureDebt > 0) && (
                                                                    <span className={cn(
                                                                        "ml-2 text-xs font-semibold self-center",
                                                                        debt > 0 ? "text-red-700" : "text-amber-700"
                                                                    )}>
                                                                        ${(debt || futureDebt).toLocaleString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="w-[120px]">
                                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                                <CreditCard className="h-4 w-4 text-gray-400" />
                                                                {activeServicesCount} Activos
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="w-[180px]">
                                                            {nextPayment ? (
                                                                <div className="flex flex-col text-sm">
                                                                    <span className="text-gray-900 dark:text-white font-medium">
                                                                        {new Date(nextPayment.date).toLocaleDateString()}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500 truncate max-w-[140px]">
                                                                        {nextPayment.source}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-400 italic">--</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right w-[100px]">
                                                            <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">

                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-400 hover:text-green-600"
                                                                    onClick={() => {
                                                                        setSelectedClientForWhatsApp(client)
                                                                        setIsWhatsAppModalOpen(true)
                                                                    }}
                                                                >
                                                                    <Phone className="h-4 w-4" />
                                                                </Button>

                                                                {/* Dropdown for List View */}
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900">
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuLabel>Administración</DropdownMenuLabel>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem onClick={() => { setSelectedClientForManagement(client); setManagementOpen(true); }}>
                                                                            <FileText className="mr-2 h-4 w-4" /> Gestionar
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => { setClientToEdit(client); setEditOpen(true); }}>
                                                                            <Edit className="mr-2 h-4 w-4" /> Editar
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem
                                                                            className="text-red-600"
                                                                            onClick={() => handleSingleDelete(client.id)}
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Invoices Modal */}
            < Dialog open={isInvoicesModalOpen} onOpenChange={setIsInvoicesModalOpen} >
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Documentos Rápidos</DialogTitle>
                        <DialogDescription>
                            Gestiona los documentos de {selectedClientForInvoices?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {selectedClientForInvoices?.invoices && selectedClientForInvoices.invoices.length > 0 ? (
                            selectedClientForInvoices.invoices
                                .filter(inv => !inv.deleted_at && (inv.status === 'pending' || inv.status === 'overdue'))
                                .sort((a, b) => new Date(b.due_date || '').getTime() - new Date(a.due_date || '').getTime())
                                .map(invoice => (
                                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">${invoice.total.toLocaleString()}</span>
                                                <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                                                    {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Vence: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Sin fecha'}
                                                {invoice.billing_cycles && (
                                                    <span className="block text-[10px] text-indigo-500 mt-0.5 font-medium">
                                                        Periodo: {new Date(invoice.billing_cycles.start_date).toLocaleDateString()} - {new Date(invoice.billing_cycles.end_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </p>
                                        </div>

                                        {invoice.status !== 'paid' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                                onClick={() => handleMarkAsPaid(invoice.id)}
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                                Marcar Pagada
                                            </Button>
                                        )}
                                    </div>
                                ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p>No hay facturas registradas</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog >

            {/* WhatsApp Actions Modal */}
            < WhatsAppActionsModal
                isOpen={isWhatsAppModalOpen}
                onOpenChange={setIsWhatsAppModalOpen}
                client={selectedClientForWhatsApp}
                settings={settings}
            />

            {/* --- NEW MANAGEMENT SHEETS --- */}

            <ClientManagementSheet
                clientId={selectedClientForManagement?.id || null}
                open={managementOpen}
                onOpenChange={setManagementOpen}
                initialData={selectedClientForManagement || undefined}
            />

            {clientToEdit && (
                <EditClientSheet
                    client={clientToEdit}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    onSuccess={fetchClients}
                />
            )}

            {clientForConnectivity && (
                <ConnectivitySheet
                    client={clientForConnectivity}
                    services={clientForConnectivity.services || []}
                    open={connectivityOpen}
                    onOpenChange={setConnectivityOpen}
                    trigger={<span className="hidden" />}
                />
            )}

            {clientForPortal && (
                <PortalGovernanceSheet
                    client={clientForPortal}
                    globalSettings={settings}
                    open={portalOpen}
                    onOpenChange={setPortalOpen}
                    trigger={<span className="hidden" />}
                />
            )}

        </div >
    )
}

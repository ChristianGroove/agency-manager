"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Phone, ArrowRight, AlertTriangle, CheckCircle2, Clock, CreditCard, FileText, Globe, MoreVertical, Wifi, Shield, Trash2, Copy, Users } from "lucide-react"
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
import { UnifiedCommunicationModal } from "@/modules/core/communication/components/unified-communication-modal"
import { SplitText } from "@/components/ui/split-text"
import { Client } from "@/types"
import { CreateClientSheet } from "@/modules/core/clients/create-client-sheet"
import { CreateServiceSheet } from "@/modules/core/billing/components/create-service-sheet"
import { getClients, quickCreateProspect } from "@/modules/core/clients/actions"
import { getTemplates } from "@/modules/core/messaging/template-actions"
import { SearchFilterBar, FilterOption } from "@/components/shared/search-filter-bar"
import { ViewToggle, ViewMode } from "@/components/shared/view-toggle"

import { Checkbox } from "@/components/ui/checkbox"
import { BulkActionsFloatingBar } from "@/components/shared/bulk-actions-floating-bar"
import { toast } from "sonner"

// New Management Sheets
import { ClientManagementSheet } from "@/modules/core/clients/components/management/client-management-sheet"
import { ConnectivitySheet } from "@/components/sheets/connectivity-sheet"
import { PortalGovernanceSheet } from "@/components/sheets/portal-governance-sheet"

// (imports)
import { useRegisterView } from "@/modules/core/caa/context/view-context"
import { useTranslation } from "@/lib/i18n/use-translation"
import { SectionHeader } from "@/components/layout/section-header"
import { useRouter, useSearchParams } from "next/navigation"

interface ClientsViewProps {
    initialData: {
        clients: any[]
        totalCount: number
        counts: {
            all: number
            overdue: number
            urgent: number
            active: number
            inactive: number
        }
    }
    initialSettings: any
    currentPage: number
    currentSearch: string
    currentFilter: string
    spaceType?: string
}

export function ClientsView({ initialData, initialSettings, currentPage, currentSearch, currentFilter, spaceType = 'agency' }: ClientsViewProps) {
    const { t } = useTranslation()
    const router = useRouter()
    const searchParamsOrigin = useSearchParams()

    // Register View Context for Help Assistant
    useRegisterView({
        viewId: "clients",
        label: t('clients.title'),
        actions: [
            { id: "new-client", label: t('clients.new_client'), type: "modal", target: "create-client", keywords: ["crear", "nuevo", "cliente"] }
        ],
        topics: ["clients-overview", "contact-card-guide"]
    })

    const [clients, setClients] = useState<any[]>(initialData.clients || [])
    const [counts, setCounts] = useState(initialData.counts || { all: 0, overdue: 0, urgent: 0, active: 0, inactive: 0 })
    const [totalCount, setTotalCount] = useState(initialData.totalCount || 0)

    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState(currentSearch)
    const [activeFilter, setActiveFilter] = useState(currentFilter)

    const [settings, setSettings] = useState<any>(initialSettings)
    // Bulk Actions State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)


    // Invoices Modal State
    const [isInvoicesModalOpen, setIsInvoicesModalOpen] = useState(false)
    const [selectedClientForInvoices, setSelectedClientForInvoices] = useState<Client | null>(null)

    // Unified Communication Modal
    const [isComModalOpen, setIsComModalOpen] = useState(false)
    const [selectedClientForCom, setSelectedClientForCom] = useState<Client | null>(null)

    // --- NEW SHEETS STATE ---
    const [managementOpen, setManagementOpen] = useState(false)
    const [selectedClientForManagement, setSelectedClientForManagement] = useState<Client | null>(null)
    const [managementInitialTab, setManagementInitialTab] = useState("overview")

    const [connectivityOpen, setConnectivityOpen] = useState(false)
    const [clientForConnectivity, setClientForConnectivity] = useState<Client | null>(null)

    const [portalOpen, setPortalOpen] = useState(false)
    const [clientForPortal, setClientForPortal] = useState<Client | null>(null)

    // Templates for WhatsApp
    const [templates, setTemplates] = useState<any[]>([])

    useEffect(() => {
        getTemplates().then(setTemplates).catch(console.error)
    }, [])
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

    const fetchClients = () => {
        router.refresh()
    }

    // SSR Trigger for Search and Filter (Debounced manually in UI or triggered on Enter)
    const applyFiltersAndSearch = (newSearch: string, newFilter: string) => {
        const params = new URLSearchParams(searchParamsOrigin.toString())
        params.set('page', '1') // Reset to page 1 on new filter
        params.set('search', newSearch)
        params.set('filter', newFilter)
        router.push(`?${params.toString()}`)
    }

    // SSR Trigger for Pagination
    const goToPage = (pageNumber: number) => {
        const params = new URLSearchParams(searchParamsOrigin.toString())
        params.set('page', pageNumber.toString())
        router.push(`?${params.toString()}`)
    }

    const { getNextPayment, getDaysDiff } = useMemo(() => {
        // Keeping these helpers for UI rendering (e.g., Next Payment Badge formatting)
        // despite the DB already calculating `daysToPay` and `status`. 
        // Note: The RPC returns `active_services_count`, `debt`, `future_debt`, `computed_status` 
        // directly at the root of the client object!
        const getNextPaymentHelper = (client: any) => {
            const dates: { date: Date, source: string }[] = []
            client.hosting_accounts?.forEach((h: any) => {
                if (h.status === 'active' && h.renewal_date) dates.push({ date: new Date(h.renewal_date), source: 'Hosting' })
            })
            client.subscriptions?.forEach((s: any) => {
                if (s.status === 'active' && s.next_billing_date) dates.push({ date: new Date(s.next_billing_date), source: s.name })
            })
            if (dates.length === 0) return null
            dates.sort((a, b) => a.date.getTime() - b.date.getTime())
            return dates[0]
        }

        const getDaysDiffHelper = (targetDate: Date) => {
            const now = new Date()
            const diffTime = targetDate.getTime() - now.getTime()
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }

        return { getNextPayment: getNextPaymentHelper, getDaysDiff: getDaysDiffHelper }
    }, [])

    // Since filtering is done in DB, filteredClients = clients
    // We just map the complex Date objects for the UI
    const filteredClients = useMemo(() => {
        if (!initialData || !initialData.clients) return []

        return initialData.clients.map((client: any) => {
            const nextPayment = getNextPayment(client)
            const daysToPay = nextPayment ? getDaysDiff(nextPayment.date) : null
            return {
                ...client,
                id: client.client_id || client.id,
                companyName: client.company_name || client.companyName,
                logoUrl: client.logo_url || client.logoUrl,
                createdAt: client.created_at || client.createdAt,
                activeServicesCount: client.active_services_count ?? client.activeServicesCount ?? 0,
                futureDebt: client.future_debt ?? client.futureDebt ?? 0,
                debt: client.debt ?? 0,
                nextPayment,
                daysToPay
            }
        })
    }, [initialData, getNextPayment, getDaysDiff])

    // Pagination Math
    const PAGE_SIZE = 50;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE)
    const hasNextPage = currentPage < totalPages
    const hasPrevPage = currentPage > 1

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
            setSelectedIds(new Set(filteredClients.map((client: any) => client.id)))
        }
    }

    const handleBulkDelete = async () => {
        const confirmMsg = t('clients.toasts.bulk_delete_confirm').replace('{count}', selectedIds.size.toString())
        if (!confirm(confirmMsg)) return

        setIsDeleting(true)
        try {
            const { deleteClients } = await import("@/modules/core/clients/actions")
            const result = await deleteClients(Array.from(selectedIds))
            if (result.success) {
                const successMsg = t('clients.toasts.bulk_delete_success').replace('{count}', selectedIds.size.toString())
                toast.success(successMsg)
                setSelectedIds(new Set())
                await fetchClients()
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            console.error("Error deleting clients:", error)
            toast.error(t('clients.toasts.error_delete') + ": " + error.message)
        } finally {
            setIsDeleting(false)
        }
    }

    const handleSingleDelete = async (id: string) => {
        if (!confirm(t('clients.toasts.delete_confirm'))) return

        try {
            const { deleteClients } = await import("@/modules/core/clients/actions")
            const result = await deleteClients([id])
            if (result.success) {
                toast.success(t('clients.toasts.delete_success'))
                await fetchClients()
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            console.error("Error deleting client:", error)
            toast.error(t('clients.toasts.error_delete') + ": " + error.message)
        }
    }





    const filterOptions: FilterOption[] = [
        { id: 'all', label: t('clients.tabs.all'), count: counts.all, color: 'gray' },
        { id: 'overdue', label: t('clients.tabs.overdue'), count: counts.overdue, color: 'red' },
        { id: 'urgent', label: t('clients.tabs.urgent'), count: counts.urgent, color: 'amber' },
        { id: 'active', label: t('clients.tabs.active'), count: counts.active, color: 'emerald' },
        { id: 'inactive', label: t('clients.tabs.inactive'), count: counts.inactive, color: 'slate' },
    ]

    const isCompactView = viewMode === 'compact'


    return (
        <div className="space-y-4 h-[calc(100vh-2rem)] flex flex-col bg-gray-50/50 dark:bg-transparent">
            {/* Header Section - Fixed */}
            <div className="flex-none space-y-4 pr-1">
                <SectionHeader
                    title={t('clients.title')}
                    icon={Users}
                    action={
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Link href="/debug/tokens">
                                <Button variant="outline" className="h-9 px-4 border-gray-200 text-gray-600 hover:bg-gray-50">
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    {t('clients.actions.tokens')}
                                </Button>
                            </Link>
                            <CreateClientSheet onSuccess={fetchClients} />
                        </div>
                    }
                />

                {/* Unified Control Block & View Toggle */}
                <div className="flex flex-col md:flex-row gap-3 z-30">
                    <SearchFilterBar
                        searchTerm={searchTerm}
                        onSearchChange={(val) => {
                            setSearchTerm(val)
                            applyFiltersAndSearch(val, activeFilter)
                        }}
                        searchPlaceholder={t('clients.search_placeholder')}
                        filters={filterOptions}
                        activeFilter={activeFilter}
                        onFilterChange={(val) => {
                            setActiveFilter(val)
                            applyFiltersAndSearch(searchTerm, val)
                        }}
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
                                    {t('clients.empty')}
                                </div>
                            ) : (
                                filteredClients.map((client: any) => {
                                    const { debt, futureDebt, nextPayment, daysToPay, activeServicesCount } = client

                                    const isAgency = spaceType !== 'resto'
                                    const isResto = spaceType === 'resto'

                                    const isOverdue = isAgency && daysToPay !== null && daysToPay < 0 && debt > 0
                                    const isUrgent = isAgency && daysToPay !== null && (
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
                                                                <DropdownMenuLabel>{t('clients.actions.administration')}</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                {isAgency && (
                                                                    <>
                                                                        <DropdownMenuItem onClick={() => { setClientForConnectivity(client); setConnectivityOpen(true); }}>
                                                                            <Wifi className="mr-2 h-4 w-4" /> {t('clients.actions.connectivity')}
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => { setClientForPortal(client); setPortalOpen(true); }}>
                                                                            <Shield className="mr-2 h-4 w-4" /> {t('clients.actions.portal_governance')}
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                    </>
                                                                )}
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                    onClick={() => handleSingleDelete(client.id)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> {t('clients.actions.delete')}
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
                                                    {!isCompactView && isAgency && (
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
                                                                    {debt > 0 ? t('clients.status.overdue') : futureDebt > 0 ? t('clients.status.urgent') : t('clients.status.active')}
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
                                                    {!isCompactView && isAgency && (
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
                                                                                ? t('clients.next_payment.overdue_badge')
                                                                                : (daysToPay !== null && daysToPay < 0)
                                                                                    ? t('clients.next_payment.pending_badge')
                                                                                    : t('clients.next_payment.next_badge')
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
                                                                            ? t('clients.next_payment.days_ago').replace('{days}', Math.abs(daysToPay!).toString())
                                                                            : t('clients.next_payment.days_left').replace('{days}', daysToPay?.toString() || '')}
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
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{t('clients.next_payment.no_payment')}</p>
                                                            </div>
                                                        )
                                                    )}

                                                    {/* Resto/Commerce Section */}
                                                    {!isCompactView && !isAgency && (
                                                        <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50 flex flex-col justify-center gap-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-semibold text-gray-500 uppercase">Visitas</span>
                                                                <span className="text-sm font-bold text-gray-900">{client.activeServicesCount || 0}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-semibold text-gray-500 uppercase">LTV (Gasto)</span>
                                                                <span className="text-sm font-bold text-gray-900">${(client.debt || 0).toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>

                                                {/* Action Buttons - Modernized */}
                                                <CardFooter className="px-5 pb-5 pt-0 flex gap-2 items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full bg-gray-50 text-gray-400 hover:bg-white hover:text-green-600 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-green-100 transition-all duration-300"
                                                            title={isAgency ? "Comunicación" : "Chat WhatsApp"}
                                                            onClick={() => {
                                                                if (isAgency) {
                                                                    setSelectedClientForCom(client)
                                                                    setIsComModalOpen(true)
                                                                } else {
                                                                    // Resto: navigate to inbox with phone to start/open conversation
                                                                    const phone = client.phone?.replace(/\D/g, '')
                                                                    if (phone) {
                                                                        router.push(`/inbox?phone=${phone}`)
                                                                    } else {
                                                                        setSelectedClientForCom(client)
                                                                        setIsComModalOpen(true)
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <Phone className="h-4 w-4" />
                                                        </Button>

                                                        {/* Quick Documents (Invoices) - Agency Only */}
                                                        {isAgency && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full bg-gray-50 text-gray-400 hover:bg-white hover:text-blue-600 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-blue-100 transition-all duration-300"
                                                                title={t('clients.actions.quick_docs')}
                                                                onClick={() => handleOpenInvoices(client)}
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                            </Button>
                                                        )}

                                                        {/* Portal Actions - Agency Only */}
                                                        {isAgency && (client.portal_short_token || client.portal_token) && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-full bg-gray-50 text-gray-400 hover:bg-white hover:text-purple-600 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-purple-100 transition-all duration-300"
                                                                    title={t('clients.actions.open_portal')}
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
                                                            setManagementInitialTab("activity")
                                                            setManagementOpen(true)
                                                        }}
                                                        className="ml-auto h-8 px-4 text-xs font-semibold rounded-full bg-gray-900 text-white hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
                                                    >
                                                        <span>{t('clients.actions.manage')}</span>
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
                                            <TableHead>{t('clients.table.contact')}</TableHead>
                                            {spaceType !== 'resto' ? (
                                                <>
                                                    <TableHead className="w-[150px]">{t('clients.table.status')}</TableHead>
                                                    <TableHead className="w-[150px]">{t('clients.table.services')}</TableHead>
                                                    <TableHead className="w-[180px]">{t('clients.table.next_payment')}</TableHead>
                                                </>
                                            ) : (
                                                <>
                                                    <TableHead className="w-[150px]">Visitas</TableHead>
                                                    <TableHead className="w-[150px]">Gasto Total</TableHead>
                                                </>
                                            )}
                                            <TableHead className="text-right w-[100px]">{t('clients.table.actions')}</TableHead>
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
                                                    {t('clients.empty')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredClients.map((client: any) => {
                                                const { debt, futureDebt, nextPayment, daysToPay, activeServicesCount } = client
                                                const isAgency = spaceType !== 'resto'
                                                const isOverdue = isAgency && daysToPay !== null && daysToPay < 0 && debt > 0

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
                                                        {isAgency ? (
                                                            <>
                                                                <TableCell className="w-[120px]">
                                                                    <div className="flex">
                                                                        <Badge variant="outline" className={cn(
                                                                            "border-0 px-2 py-0.5 h-6 whitespace-nowrap",
                                                                            debt > 0 ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                                                                                : futureDebt > 0 ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
                                                                                    : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                                                                        )}>
                                                                            {debt > 0 ? t('clients.status.overdue') : futureDebt > 0 ? t('clients.status.urgent') : t('clients.status.active')}
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
                                                                        {t('clients.table.active_services').replace('{count}', activeServicesCount.toString())}
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
                                                            </>
                                                        ) : (
                                                            <>
                                                                <TableCell className="w-[150px]">
                                                                    <span className="text-sm font-medium">{activeServicesCount || 0}</span>
                                                                </TableCell>
                                                                <TableCell className="w-[150px]">
                                                                    <span className="text-sm font-medium text-emerald-600">${(debt || 0).toLocaleString()}</span>
                                                                </TableCell>
                                                            </>
                                                        )}
                                                        <TableCell className="text-right w-[100px]">
                                                            <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">

                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-400 hover:text-green-600"
                                                                    title={isAgency ? "Comunicación" : "Chat WhatsApp"}
                                                                    onClick={() => {
                                                                        if (isAgency) {
                                                                            setSelectedClientForCom(client)
                                                                            setIsComModalOpen(true)
                                                                        } else {
                                                                            const phone = client.phone?.replace(/\D/g, '')
                                                                            if (phone) {
                                                                                router.push(`/inbox?phone=${phone}`)
                                                                            } else {
                                                                                setSelectedClientForCom(client)
                                                                                setIsComModalOpen(true)
                                                                            }
                                                                        }
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
                                                                        <DropdownMenuLabel>{t('clients.actions.administration')}</DropdownMenuLabel>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem onClick={() => { setSelectedClientForManagement(client); setManagementOpen(true); }}>
                                                                            <FileText className="mr-2 h-4 w-4" /> {t('clients.actions.manage')}
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem
                                                                            className="text-red-600"
                                                                            onClick={() => handleSingleDelete(client.id)}
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" /> {t('clients.actions.delete')}
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

                            {/* SSR Table Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white/50 backdrop-blur-md sticky bottom-0 z-20">
                                    <span className="text-sm font-medium text-gray-500">
                                        Página {currentPage} de {totalPages} ({totalCount} contactos est.)
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!hasPrevPage}
                                            onClick={() => goToPage(currentPage - 1)}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!hasNextPage}
                                            onClick={() => goToPage(currentPage + 1)}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            )}

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

            {/* Unified Communication Modal */}
            {selectedClientForCom && (
                <UnifiedCommunicationModal
                    isOpen={isComModalOpen}
                    onOpenChange={setIsComModalOpen}
                    client={{
                        id: selectedClientForCom.id,
                        name: selectedClientForCom.name,
                        email: selectedClientForCom.email || undefined,
                        phone: selectedClientForCom.phone || undefined,
                        company_name: selectedClientForCom.company_name || undefined,
                        invoices: selectedClientForCom.invoices,
                        quotes: selectedClientForCom.quotes,
                        portal_token: selectedClientForCom.portal_token,
                        portal_short_token: selectedClientForCom.portal_short_token
                    }}
                    context={{ type: 'general' }}
                    settings={settings}
                />
            )}

            {/* --- NEW MANAGEMENT SHEETS --- */}

            <ClientManagementSheet
                clientId={selectedClientForManagement?.id || null}
                open={managementOpen}
                onOpenChange={setManagementOpen}
                initialData={selectedClientForManagement || undefined}
                initialTab={managementInitialTab}
                spaceType={spaceType}
            />

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

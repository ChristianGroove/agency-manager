"use client"

import React, { useState, useMemo, useCallback } from "react"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Users, AlertTriangle, Tag } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/layout/section-header"
import { BulkActionsFloatingBar } from "@/components/shared/bulk-actions-floating-bar"
import { CreateClientSheet } from "../create-client-sheet"
import { CategoryManagementModal } from "./category-management-modal"
import { VERTICAL_REGISTRY, VerticalType } from "@/modules/core/organizations/vertical-registry"
import { ClientsProvider, useClients } from "../context/clients-context"
import { ClientsToolbar } from "./layout/clients-toolbar"
import { ClientsTable } from "./list/clients-table"
import { ClientsGrid } from "./grid/clients-grid"
import { ClientDialogsManager } from "./management/client-dialogs-manager"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function ClientsView({ 
    initialData, 
    currentPage, 
    searchQuery, 
    filter, 
    spaceType,
    initialSettings,
    allCategories = []
}: { 
    initialData: any, 
    currentPage: number, 
    searchQuery: string, 
    filter: string,
    spaceType: VerticalType,
    initialSettings?: any,
    allCategories?: any[]
}) {
    return (
        <ClientsProvider 
            initialSearch={searchQuery} 
            initialFilter={filter} 
            initialSpaceType={spaceType}
        >
            <ClientsContent 
                initialData={initialData} 
                totalCount={initialData?.totalCount || 0} 
                currentPage={currentPage} 
                spaceType={spaceType}
                initialSettings={initialSettings}
                allCategories={allCategories}
            />
        </ClientsProvider>
    )
}

function ClientsContent({ initialData, totalCount, currentPage, spaceType, initialSettings, allCategories = [] }: { initialData: any, totalCount: number, currentPage: number, spaceType: VerticalType, initialSettings: any, allCategories?: any[] }) {
    const { t } = useTranslation()
    const router = useRouter()
    const { 
        viewMode, 
        selectedIds, 
        setSelectedIds, 
        isDeleting, 
        setIsDeleting 
    } = useClients()
    const config = VERTICAL_REGISTRY[spaceType]

    // Category Tabs State
    const [activeCategoryTab, setActiveCategoryTab] = useState("all")

    // Dialog States
    const [managementOpen, setManagementOpen] = useState(false)
    const [selectedClientForManagement, setSelectedClientForManagement] = useState<any>(null)
    const [managementInitialTab, setManagementInitialTab] = useState("info")
    
    const [connectivityOpen, setConnectivityOpen] = useState(false)
    const [clientForConnectivity, setClientForConnectivity] = useState<any>(null)
    
    const [portalOpen, setPortalOpen] = useState(false)
    const [clientForPortal, setClientForPortal] = useState<any>(null)
    
    const [invoicesOpen, setInvoicesOpen] = useState(false)
    const [clientForInvoices, setClientForInvoices] = useState<any>(null)
    
    const [isComModalOpen, setIsComModalOpen] = useState(false)
    const [selectedClientForCom, setSelectedClientForCom] = useState<any>(null)
    
    const [notesOpen, setNotesOpen] = useState(false)
    const [clientForNotes, setClientForNotes] = useState<any>(null)

    const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)

    // Data Transformation Helpers
    const { getNextPayment, getDaysDiff } = useMemo(() => {
        const getNextPaymentHelper = (client: any) => {
            const dates: { date: Date, source: string }[] = []
            client.hosting_accounts?.forEach((h: any) => {
                if (h.status === 'active' && h.renewal_date && !h.deleted_at) {
                    dates.push({ date: new Date(h.renewal_date), source: 'Hosting' })
                }
            })
            client.subscriptions?.forEach((s: any) => {
                if (s.status === 'active' && s.next_billing_date && !s.deleted_at) {
                    dates.push({ date: new Date(s.next_billing_date), source: s.name })
                }
            })
            if (dates.length === 0) return null

            const now = new Date()
            now.setHours(0, 0, 0, 0)
            
            const futureDates = dates.filter(d => {
                const dDate = new Date(d.date)
                dDate.setHours(0, 0, 0, 0)
                return dDate.getTime() >= now.getTime()
            })
            const pastDates = dates.filter(d => {
                const dDate = new Date(d.date)
                dDate.setHours(0, 0, 0, 0)
                return dDate.getTime() < now.getTime()
            })

            // Sort dates
            futureDates.sort((a, b) => a.date.getTime() - b.date.getTime())
            pastDates.sort((a, b) => a.date.getTime() - b.date.getTime())

            // If there's debt, we want to see the OLDEST past date that's likely causing the debt
            if (client.debt > 0 && pastDates.length > 0) {
                return pastDates[0] // Already sorted earliest to latest
            }

            // If no debt, show the EARLIEST future date if exists
            if (futureDates.length > 0) {
                return futureDates[0]
            }

            // Fallback to the LATEST past date (most recent cycle) if everyone is paid and no future scheduled
            return [...pastDates].sort((a, b) => b.date.getTime() - a.date.getTime())[0]
        }

        const getDaysDiffHelper = (targetDate: Date) => {
            const now = new Date()
            const diffTime = targetDate.getTime() - now.getTime()
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }

        return { getNextPayment: getNextPaymentHelper, getDaysDiff: getDaysDiffHelper }
    }, [])

    const clients = useMemo(() => {
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

    const filteredClients = useMemo(() => {
        if (activeCategoryTab === 'all') return clients
        return clients.filter((c: any) => c.category_id === activeCategoryTab)
    }, [clients, activeCategoryTab])

    const counts = useMemo(() => initialData?.counts || { all: 0, overdue: 0, urgent: 0, active: 0, inactive: 0 }, [initialData])

    const handleBulkDelete = async () => {
        const confirmMsg = t('clients.toasts.bulk_delete_confirm').replace('{count}', selectedIds.size.toString())
        if (!confirm(confirmMsg)) return

        setIsDeleting(true)
        try {
            const { deleteClients } = await import("@/modules/core/clients/actions")
            const result = await deleteClients(Array.from(selectedIds))
            if (result.success) {
                toast.success(t('clients.toasts.bulk_delete_success').replace('{count}', selectedIds.size.toString()))
                setSelectedIds(new Set())
                router.refresh()
            }
        } catch (error: any) {
            toast.error(t('clients.toasts.error_delete'))
        } finally {
            setIsDeleting(false)
        }
    }

    const handleSingleDelete = async (id: string) => {
        if (!confirm(t('clients.toasts.delete_confirm'))) return
        setIsDeleting(true)
        try {
            const { deleteClients } = await import("@/modules/core/clients/actions")
            const result = await deleteClients([id])
            if (result.success) {
                toast.success(t('clients.toasts.delete_success'))
                router.refresh()
            }
        } catch (error: any) {
            toast.error(t('clients.toasts.error_delete'))
        } finally {
            setIsDeleting(false)
        }
    }

    const handleInvoicesAction = (client: any) => {
        setClientForInvoices(client)
        setInvoicesOpen(true)
    }

    const handlePortalQuickAction = (client: any) => {
        const url = getPortalUrl(client)
        window.open(url, '_blank')
    }

    const getPortalUrl = (client: any) => {
        const baseUrl = window.location.origin
        const token = client.portal_short_token || client.portal_token
        return `${baseUrl}/portal/${token}`
    }

    return (
        <div className="space-y-4 h-[calc(100vh-2rem)] flex flex-col bg-gray-50/50 dark:bg-transparent p-4 overflow-hidden">
            <div className="flex-none space-y-4">
                <SectionHeader
                    title="Contactos"
                    icon={Users}
                    action={
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {config.management.actions.showHosting && (
                                <Link href="/debug/tokens">
                                    <Button variant="outline" size="sm">
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                        {t('clients.actions.tokens')}
                                    </Button>
                                </Link>
                            )}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-white hover:bg-slate-50 border-slate-200 text-slate-600 rounded-xl"
                                onClick={() => setCategoryManagerOpen(true)}
                            >
                                <Tag className="mr-2 h-4 w-4" />
                                Categorías
                            </Button>
                            <CreateClientSheet onSuccess={() => router.refresh()} />
                        </div>
                    }
                />
                <ClientsToolbar 
                    counts={counts} 
                    categories={allCategories}
                    activeCategory={activeCategoryTab}
                    onCategoryChange={setActiveCategoryTab}
                />
            </div>

            <div className="flex-1 min-h-0 relative flex flex-col pt-2">
                <BulkActionsFloatingBar
                    selectedCount={selectedIds.size}
                    onDelete={handleBulkDelete}
                    onClearSelection={() => setSelectedIds(new Set())}
                    isDeleting={isDeleting}
                />
                
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-modern px-6 pb-12">
                    {viewMode === 'list' ? (
                        <ClientsTable 
                            clients={filteredClients} 
                            loading={false}
                            onManage={(c: any) => { setSelectedClientForManagement(c); setManagementOpen(true); }}
                            onDelete={handleSingleDelete}
                            onCommunication={(c: any) => { setSelectedClientForCom(c); setIsComModalOpen(true); }}
                            onInvoices={handleInvoicesAction}
                            onConnectivity={(c: any) => { setClientForConnectivity(c); setConnectivityOpen(true); }}
                            onPortal={(c: any) => { setClientForPortal(c); setPortalOpen(true); }}
                            onGoToPortal={handlePortalQuickAction}
                            onNotes={(c: any) => { setClientForNotes(c); setNotesOpen(true); }}
                        />
                    ) : (
                        <ClientsGrid 
                            clients={filteredClients} 
                            loading={false}
                            onManage={(c: any) => { setSelectedClientForManagement(c); setManagementOpen(true); }}
                            onDelete={handleSingleDelete}
                            onCommunication={(c: any) => { setSelectedClientForCom(c); setIsComModalOpen(true); }}
                            onConnectivity={(c: any) => { setClientForConnectivity(c); setConnectivityOpen(true); }}
                            onPortal={(c: any) => { setClientForPortal(c); setPortalOpen(true); }}
                            onInvoices={handleInvoicesAction}
                            onGoToPortal={handlePortalQuickAction}
                            onNotes={(c: any) => { setClientForNotes(c); setNotesOpen(true); }}
                            isCompactView={viewMode === 'compact'}
                        />
                    )}
                </div>
            </div>

            <ClientDialogsManager 
                managementOpen={managementOpen}
                setManagementOpen={setManagementOpen}
                selectedClientForManagement={selectedClientForManagement}
                managementInitialTab={managementInitialTab}
                connectivityOpen={connectivityOpen}
                setConnectivityOpen={setConnectivityOpen}
                clientForConnectivity={clientForConnectivity}
                portalOpen={portalOpen}
                setPortalOpen={setPortalOpen}
                clientForPortal={clientForPortal}
                invoicesOpen={invoicesOpen}
                setInvoicesOpen={setInvoicesOpen}
                clientForInvoices={clientForInvoices}
                isComModalOpen={isComModalOpen}
                setIsComModalOpen={setIsComModalOpen}
                selectedClientForCom={selectedClientForCom}
                notesOpen={notesOpen}
                setNotesOpen={setNotesOpen}
                clientForNotes={clientForNotes}
                onSuccess={() => router.refresh()}
                globalSettings={initialSettings || {}}
                spaceType={spaceType}
            />

            <CategoryManagementModal 
                isOpen={categoryManagerOpen} 
                onClose={() => setCategoryManagerOpen(false)}
                onUpdate={() => router.refresh()}
            />
        </div>
    )
}

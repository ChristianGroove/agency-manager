"use client"

import { useState, useEffect } from "react"
import { Client, Invoice, Quote, Briefing, ClientEvent, Service } from "@/types"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Layers, CreditCard, Search, Bell, LogOut, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { PortalSummaryTab } from "./portal-summary-tab"
import { PortalServicesTab } from "./portal-services-tab"
import { PortalBillingTab } from "./portal-billing-tab"
import { PortalCatalogTab } from "./portal-catalog-tab"
import { QuoteDetailModal } from "./quote-detail-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface PortalLayoutProps {
    client: Client
    invoices: Invoice[]
    quotes: Quote[]
    briefings: Briefing[]
    events: ClientEvent[]
    services: Service[]
    settings: any
    onPay: (invoiceIds: string[]) => void
    onViewInvoice: (invoice: Invoice) => void
    onViewQuote: (quote: Quote) => void
    logout?: () => void
}

type TabKey = 'summary' | 'services' | 'billing' | 'explore'

export function PortalLayout({ client, invoices, quotes, briefings, events, services, settings, onPay, onViewInvoice, onViewQuote }: PortalLayoutProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('summary')
    const [viewQuote, setViewQuote] = useState<Quote | null>(null)
    const [targetBriefingId, setTargetBriefingId] = useState<string | null>(null)

    // Derived State
    const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
    const totalPending = pendingInvoices.reduce((acc, curr) => acc + Number(curr.total), 0)
    const pendingBriefings = briefings.filter(b => b.status === 'sent' || b.status === 'in_progress')
    const openQuotes = quotes.filter(q => q.status === 'sent')

    // Notifications Count
    const notificationCount = pendingInvoices.length + pendingBriefings.length + openQuotes.length

    const handleViewBriefing = (id: string) => {
        setTargetBriefingId(id)
        setActiveTab('services')
    }

    // Inject Branding Logic via CSS Variables if needed (already done in page.tsx wrapper, but good to keep in mind)

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">

            {/* ----------------- Mobile Top Bar (Project Logo + Notifs) ----------------- */}
            <div className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-30">
                <img src={settings.portal_logo_url || "/branding/logo dark.svg"} alt="Logo" className="h-8 object-contain" />
                <NotificationBell
                    count={notificationCount}
                    pendingInvoices={pendingInvoices}
                    openQuotes={openQuotes}
                    pendingBriefings={pendingBriefings}
                    onViewQuote={onViewQuote}
                    onTabChange={setActiveTab}
                />
            </div>

            {/* ----------------- Desktop Sidebar (Navigation) ----------------- */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r h-screen sticky top-0">
                <div className="p-8">
                    <img src={settings.portal_logo_url || "/branding/logo dark.svg"} alt="Logo" className="h-10 object-contain mb-8" />
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <NavButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={LayoutDashboard} label="Resumen" />
                    <NavButton active={activeTab === 'services'} onClick={() => setActiveTab('services')} icon={Layers} label="Mis Servicios" />
                    <NavButton active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} icon={CreditCard} label="Pagos" />
                    <NavButton active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} icon={Search} label="Explorar" />
                </nav>

                <div className="p-4 border-t">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                        <Avatar className="h-10 w-10 border">
                            <AvatarFallback>{client.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{client.name}</p>
                            <p className="text-xs text-gray-500 truncate">{client.company_name}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ----------------- Main Content Area ----------------- */}
            <main className="flex-1 flex flex-col min-h-0 relative">

                {/* Desktop Header (User + Notifs) */}
                <header className="hidden md:flex items-center justify-end p-6 gap-4">
                    <NotificationBell
                        count={notificationCount}
                        pendingInvoices={pendingInvoices}
                        openQuotes={openQuotes}
                        pendingBriefings={pendingBriefings}
                        onViewQuote={onViewQuote}
                        onTabChange={setActiveTab}
                    />
                </header>

                {/* Content Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-8">
                    {activeTab === 'summary' && (
                        <PortalSummaryTab
                            client={client} invoices={invoices} quotes={quotes} briefings={briefings} events={events}
                            onViewQuote={onViewQuote} onViewBriefing={handleViewBriefing}
                        />
                    )}
                    {activeTab === 'services' && (
                        <PortalServicesTab
                            services={services} invoices={invoices} briefings={briefings}
                            onPay={onPay} onViewInvoice={onViewInvoice}
                            initialBriefingId={targetBriefingId}
                            onBriefingClosed={() => setTargetBriefingId(null)}
                        />
                    )}
                    {activeTab === 'billing' && (
                        <PortalBillingTab
                            invoices={invoices} settings={settings} onPay={onPay} onViewInvoice={onViewInvoice}
                        />
                    )}
                    {activeTab === 'explore' && <PortalCatalogTab settings={settings} client={client} />}
                </div>

                {/* Billing Summary Block (Persistent Desktop) */}
                {/* Visible on all tabs except 'explore' */}
                {activeTab !== 'explore' && pendingInvoices.length > 0 && (
                    <div className="hidden lg:block fixed bottom-8 right-8 z-20">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-80 border border-gray-100 ring-1 ring-black/5 animate-in slide-in-from-right">
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-bold text-gray-900">Pagos Pendientes</h4>
                                <Badge className={cn(
                                    "border-0 text-white",
                                    pendingInvoices.some(i => i.status === 'overdue')
                                        ? "bg-red-600 hover:bg-red-700"
                                        : "bg-orange-500 hover:bg-orange-600"
                                )}>{pendingInvoices.length}</Badge>
                            </div>
                            <p className="text-3xl font-bold text-gray-900 mb-2">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalPending)}
                            </p>
                            <p className="text-sm text-gray-500 mb-4">Tienes {pendingInvoices.length} facturas por pagar.</p>
                            <Button className="w-full text-white bg-black hover:bg-gray-800" onClick={() => setActiveTab('billing')}>
                                Ir a Facturación
                            </Button>
                        </div>
                    </div>
                )}
            </main>

            {/* ----------------- Mobile Bottom Navigation ----------------- */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-2 pb-4 z-50">
                <MobileNavBtn active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={LayoutDashboard} label="Inicio" />
                <MobileNavBtn active={activeTab === 'services'} onClick={() => setActiveTab('services')} icon={Layers} label="Servicios" />
                <MobileNavBtn active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} icon={CreditCard} label="Pagos" />
                <MobileNavBtn active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} icon={Search} label="Explorar" />
            </nav>

        </div>
    )
}

function NavButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center w-full gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"
            )}
        >
            <Icon className="h-5 w-5" />
            {label}
        </button>
    )
}

function MobileNavBtn({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg min-w-[64px]",
                active ? "text-primary" : "text-gray-400"
            )}
        >
            <Icon className={cn("h-6 w-6", active && "stroke-[2.5px]")} />
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    )
}

function NotificationBell({ count, pendingInvoices, openQuotes, pendingBriefings, onViewQuote, onTabChange, onViewBriefing }: any) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-gray-600" />
                    {count > 0 && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white ring-1 ring-red-500"></span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b">
                    <h4 className="font-bold">Notificaciones</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {count === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No tienes notificaciones nuevas</div>
                    ) : (
                        <div className="divide-y">
                            {pendingInvoices.length > 0 && (
                                <div className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => onTabChange('billing')}>
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                            <CreditCard className="h-4 w-4 text-red-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Facturas Vencidas</p>
                                            <p className="text-xs text-gray-500">Tienes {pendingInvoices.length} facturas pendientes.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {openQuotes.map((q: Quote) => (
                                <div key={q.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => onViewQuote(q)}>
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                            <LayoutDashboard className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Nueva Cotización</p>
                                            <p className="text-xs text-gray-500">Revisar cotización #{q.number}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {pendingBriefings.map((b: Briefing) => (
                                <div key={b.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => onViewBriefing ? onViewBriefing(b.id) : onTabChange('services')}>
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                                            <Layers className="h-4 w-4 text-pink-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Briefing Pendiente</p>
                                            <p className="text-xs text-gray-500">Requiere información para {b.template?.name}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

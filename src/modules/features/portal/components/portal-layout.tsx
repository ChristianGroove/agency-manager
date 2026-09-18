"use client"

import { useState, useEffect } from "react"
import { Client, Invoice, Quote, Briefing, ClientEvent, Service } from "@/types"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Layers, CreditCard, Search, Bell, LogOut, Menu, BarChart3, Server, X, Sun, Moon } from "lucide-react"
import { isFeatureEnabled } from "@/modules/core/saas/features"
import { cn } from "@/modules/infrastructure/utils/utils"
import { PortalSummaryTab } from "./portal-summary-tab"
import { PortalServicesTab } from "./portal-services-tab"
import { PortalBillingTab } from "./portal-billing-tab"
import { PortalCatalogTab } from "./portal-catalog-tab"
import { InsightsTab } from "../insights/insights-tab"
import { QuoteDetailModal } from "./modals/quote-detail-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { PortalHostingTab } from "./portal-hosting-tab"
import { GlobalParticles } from "@/components/layout/global-particles"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface PortalLayoutProps {
    token: string
    client?: Client | null
    invoices: Invoice[]
    quotes: Quote[]
    briefings: Briefing[]
    events: ClientEvent[]
    services: Service[]
    hostingAccounts?: any[] // Optional to avoid breaking existing calls immediately
    settings: any
    activeModules: Array<{
        slug: string
        portal_tab_label: string
        portal_icon_key: string
    }>
    onPay: (invoiceIds: string[]) => void
    onViewInvoice: (invoice: Invoice) => void
    onViewQuote: (quote: Quote) => void
    logout?: () => void
    insightsAccess?: { show: boolean, mode: { organic: boolean, ads: boolean } } // NEW
}

// Icon mapping for dynamic tabs
const ICON_MAP: Record<string, any> = {
    LayoutDashboard,
    Layers,
    CreditCard,
    Search,
    Server,
    BarChart3
}

// Map module slug to component key
function mapModuleToComponent(moduleSlug: string): string {
    const mapping: Record<string, string> = {
        'module_invoicing': 'billing',
        'module_briefings': 'services',
        'core_services': 'services',
        'module_catalog': 'explore',
        'meta_insights': 'insights'
    }
    return mapping[moduleSlug] || 'summary'
}

type TabKey = 'summary' | 'services' | 'billing' | 'explore' | 'insights' | 'hosting'

import { useTranslation } from "@/modules/core/i18n/use-translation"

export function PortalLayout({ token, client, invoices = [], quotes = [], briefings = [], events = [], services = [], hostingAccounts = [], settings = {}, activeModules = [], onPay, onViewInvoice, onViewQuote, insightsAccess }: PortalLayoutProps) {
    const { t } = useTranslation()
    const isGuest = !client

    // Determine which tabs to show based on active modules (Deduplicated Logic)
    const showServices = isGuest || activeModules.some(m => ['core_services', 'module_briefings', 'module_projects'].includes(m.slug))
    const showBilling = !isGuest && activeModules.some(m => ['module_invoicing', 'core_billing', 'payments', 'module_payments'].includes(m.slug))
    const showExplore = isGuest || activeModules.some(m => ['module_catalog', 'core_catalog'].includes(m.slug)) || true
    const showInsights = !isGuest && activeModules.some(m => ['meta_insights', 'module_insights'].includes(m.slug)) && insightsAccess?.show === true

    const dynamicTabs = isGuest
        ? [
            // GUEST VIEW: Explore / Catalog first
            ...(showExplore ? [{
                key: 'explore',
                component: 'explore',
                label: 'Catálogo & Tienda',
                icon: Search
            }] : []),
            ...(showServices ? [{
                key: 'services',
                component: 'services',
                label: t('portal.nav.services'),
                icon: Layers
            }] : [])
        ]
        : [
            // CLIENT VIEW: Summary first, then Services, Billing, Catalog/Explore, Insights, Hosting
            {
                key: 'summary',
                component: 'summary',
                label: t('portal.nav.summary'),
                icon: LayoutDashboard
            },
            ...(showServices ? [{
                key: 'services',
                component: 'services',
                label: t('portal.nav.services'),
                icon: Layers
            }] : []),
            ...(showBilling ? [{
                key: 'billing',
                component: 'billing',
                label: t('portal.nav.billing'),
                icon: CreditCard
            }] : []),
            ...(showExplore ? [{
                key: 'explore',
                component: 'explore',
                label: t('portal.nav.explore'),
                icon: Search
            }] : []),
            ...(showInsights ? [{
                key: 'insights',
                component: 'insights',
                label: t('portal.nav.insights'),
                icon: BarChart3
            }] : []),
            ...(hostingAccounts && hostingAccounts.length > 0 ? [{
                key: 'hosting',
                component: 'hosting',
                label: t('portal.nav.hosting'),
                icon: Server
            }] : [])
        ]

    const [activeTab, setActiveTab] = useState<string>(() => {
        if (isGuest) return 'explore'
        return 'summary'
    })

    // Portal Isolated Theme: 'light' | 'dark'
    const [portalTheme, setPortalTheme] = useState<"light" | "dark">("light")

    useEffect(() => {
        const saved = localStorage.getItem("portal_client_theme") as "light" | "dark" | null
        if (saved) {
            setPortalTheme(saved)
            if (saved === "dark") {
                document.documentElement.classList.add("dark")
            } else {
                document.documentElement.classList.remove("dark")
            }
        } else {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
            const initial = prefersDark ? "dark" : "light"
            setPortalTheme(initial)
            if (initial === "dark") {
                document.documentElement.classList.add("dark")
            } else {
                document.documentElement.classList.remove("dark")
            }
        }
    }, [])

    const togglePortalTheme = () => {
        const next = portalTheme === "dark" ? "light" : "dark"
        setPortalTheme(next)
        localStorage.setItem("portal_client_theme", next)
        if (next === "dark") {
            document.documentElement.classList.add("dark")
        } else {
            document.documentElement.classList.remove("dark")
        }
    }

    const [viewQuote, setViewQuote] = useState<Quote | null>(null)
    const [targetBriefingId, setTargetBriefingId] = useState<string | null>(null)
    const [showBillingAlert, setShowBillingAlert] = useState(true)

    // Derived State
    const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
    const totalPending = pendingInvoices.reduce((acc, curr) => acc + Number(curr.total), 0)
    const pendingBriefings = briefings.filter(b => b.status === 'sent' || b.status === 'in_progress')
    const openQuotes = quotes.filter(q => q.status === 'sent')

    // Notifications Count (Module-Aware)
    // Only count items if the corresponding module is active
    const hasInvoicingModule = activeModules.some(m => m.slug === 'module_invoicing')
    const hasBriefingsModule = activeModules.some(m => m.slug === 'module_briefings' || m.slug === 'core_services')

    const notificationCount =
        (hasInvoicingModule ? pendingInvoices.length + openQuotes.length : 0) +
        (hasBriefingsModule ? pendingBriefings.length : 0)

    const handleViewBriefing = (id: string) => {
        // Find first tab that maps to 'services' component
        const servicesTab = dynamicTabs.find(t => t.component === 'services')
        setTargetBriefingId(id)
        setActiveTab(servicesTab?.key || 'summary')
    }

    // Resolved Logos from ADN de Marca
    // Dark mode uses logo for dark backgrounds (main_logo_url / tenant_logos.main_dark)
    // Light mode uses logo for light backgrounds (main_logo_light_url / tenant_logos.main_light / portal_logo_url)
    const darkLogo =
        settings.main_logo_url ||
        settings.portal_theme_config?.tenant_logos?.main_dark ||
        "/branding/logo dark.svg"

    const lightLogo =
        settings.main_logo_light_url ||
        settings.portal_theme_config?.tenant_logos?.main_light ||
        settings.portal_logo_url ||
        "/branding/logo light.svg"

    const currentLogo = portalTheme === "dark" ? darkLogo : lightLogo

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-[#0a0a0a] flex flex-col md:flex-row transition-colors duration-200 relative overflow-x-hidden">

            {/* ----------------- Global Animated Particles (Platform Background) ----------------- */}
            <div className="fixed inset-0 z-0 opacity-100 pointer-events-none overflow-hidden">
                <GlobalParticles orgId={client?.organization_id} primaryColor={settings?.portal_primary_color} />
            </div>

            {/* ----------------- Mobile Top Bar (Project Logo + Theme + Notifs) ----------------- */}
            <div className="md:hidden flex items-center justify-between p-3.5 px-4 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200/50 dark:border-white/10 sticky top-0 z-30">
                <img
                    src={currentLogo}
                    alt="Logo"
                    className="h-8 object-contain"
                />
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={togglePortalTheme}
                        className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/80 transition-all focus:outline-none"
                        aria-label={portalTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                    >
                        {portalTheme === "dark" ? (
                            <Sun className="w-4 h-4 text-amber-400" />
                        ) : (
                            <Moon className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                        )}
                    </button>
                    <NotificationBell
                        count={notificationCount}
                        pendingInvoices={pendingInvoices}
                        openQuotes={openQuotes}
                        pendingBriefings={pendingBriefings}
                        onViewQuote={onViewQuote}
                        onTabChange={setActiveTab}
                    />
                </div>
            </div>

            {/* ----------------- Desktop Sidebar (Floating Glass Effect identical to platform) ----------------- */}
            <aside className="glass-panel hidden md:flex flex-col w-64 fixed left-4 top-4 bottom-4 h-[calc(100vh-2rem)] bg-white/70 dark:bg-zinc-950/65 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/40 z-30 select-none overflow-hidden">
                <div className="p-6 pb-4">
                    <img
                        src={currentLogo}
                        alt="Logo"
                        className="h-10 object-contain mb-6"
                    />
                </div>

                <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
                    {dynamicTabs.map(tab => (
                        <NavButton
                            key={tab.key}
                            active={activeTab === tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            icon={tab.icon}
                            label={tab.label}
                            primaryColor={settings?.portal_primary_color}
                        />
                    ))}
                </nav>

                <div className="p-3 border-t border-gray-200/50 dark:border-white/5 mt-auto">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-white/50 dark:border-white/5">
                        <Avatar className="h-9 w-9 rounded-xl border border-white/60 dark:border-white/10 shrink-0 overflow-hidden">
                            <AvatarImage src={client?.logo_url || (client as any)?.avatar_url || (client as any)?.photo_url} className="object-cover" />
                            <AvatarFallback className="bg-brand-pink/10 text-brand-pink font-bold text-xs">
                                {client?.name ? client.name.substring(0, 2).toUpperCase() : (settings?.agency_name ? settings.agency_name.substring(0, 2).toUpperCase() : 'P')}
                            </AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden min-w-0">
                            <p className="text-xs font-bold truncate text-gray-900 dark:text-white">{client?.name || settings?.agency_name || 'Tienda Oficial'}</p>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">{client?.company_name || 'Portal Público'}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ----------------- Main Content Area ----------------- */}
            <main className="flex-1 flex flex-col min-h-0 relative md:pl-72 z-10">

                {/* Desktop Header (Theme Toggle + Notifs) */}
                <header className="hidden md:flex items-center justify-end p-4 px-8 sticky top-0 z-20">
                    <div className="flex items-center gap-2 bg-white/70 dark:bg-zinc-950/65 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-1.5 px-2.5 shadow-sm">
                        <TooltipProvider delayDuration={150}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={togglePortalTheme}
                                        className="p-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all focus:outline-none cursor-pointer"
                                        aria-label={portalTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                                    >
                                        {portalTheme === "dark" ? (
                                            <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
                                        ) : (
                                            <Moon className="w-4 h-4 text-zinc-600 dark:text-zinc-300 hover:-rotate-12 transition-transform" />
                                        )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <span>{portalTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}</span>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <NotificationBell
                            count={notificationCount}
                            pendingInvoices={pendingInvoices}
                            openQuotes={openQuotes}
                            pendingBriefings={pendingBriefings}
                            onViewQuote={onViewQuote}
                            onTabChange={setActiveTab}
                        />
                    </div>
                </header>

                {/* Content Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 md:pt-2 pb-28 md:pb-8">
                    {/* Find the current tab's component */}
                    {dynamicTabs.find(t => t.key === activeTab)?.component === 'summary' && (
                        <PortalSummaryTab
                            client={client} invoices={invoices} quotes={quotes} briefings={briefings} events={events}
                            onViewQuote={onViewQuote} onViewBriefing={handleViewBriefing}
                        />
                    )}
                    {dynamicTabs.find(t => t.key === activeTab)?.component === 'services' && (
                        <PortalServicesTab
                            token={token}
                            services={services} invoices={invoices} briefings={briefings}
                            onPay={onPay} onViewInvoice={onViewInvoice}
                            initialBriefingId={targetBriefingId}
                            onBriefingClosed={() => {
                                setTargetBriefingId(null)
                                setActiveTab('summary')
                            }}
                        />
                    )}
                    {dynamicTabs.find(t => t.key === activeTab)?.component === 'billing' && (
                        <PortalBillingTab
                            invoices={invoices} settings={settings} onPay={onPay} onViewInvoice={onViewInvoice} token={token}
                        />
                    )}
                    {dynamicTabs.find(t => t.key === activeTab)?.component === 'insights' && <InsightsTab client={client} services={services} token={token} insightsAccess={insightsAccess} />}
                    {dynamicTabs.find(t => t.key === activeTab)?.component === 'explore' && <PortalCatalogTab settings={settings} client={client} token={token} />}
                    {dynamicTabs.find(t => t.key === activeTab)?.component === 'hosting' && <PortalHostingTab hostingAccounts={hostingAccounts || []} />}
                </div>

                {/* Billing Summary Block (Persistent Desktop) */}
                {/* Visible on all tabs except 'explore' */}
                {showBillingAlert && activeTab !== 'explore' && pendingInvoices.length > 0 && (
                    <div className="hidden lg:block fixed bottom-8 right-8 z-20">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-80 border border-gray-100 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/10 animate-in slide-in-from-right">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-bold text-gray-900 dark:text-white">{t('portal.alerts.pending_payments')}</h4>
                                    <Badge className={cn(
                                        "border-0 text-white",
                                        pendingInvoices.some(i => i.status === 'overdue')
                                            ? "bg-red-600 hover:bg-red-700"
                                            : "bg-orange-500 hover:bg-orange-600"
                                    )}>{pendingInvoices.length}</Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                                    onClick={() => setShowBillingAlert(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalPending)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">{t('portal.alerts.pending_docs_msg').replace('{count}', pendingInvoices.length.toString())}</p>
                            <Button
                                className="w-full text-white bg-black hover:bg-gray-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold"
                                onClick={() => {
                                    // Find first tab that maps to 'billing' component
                                    const billingTab = dynamicTabs.find(t => t.component === 'billing')
                                    setActiveTab(billingTab?.key || 'summary')
                                    setShowBillingAlert(false)
                                }}
                            >
                                {t('portal.alerts.go_to_payments')}
                            </Button>
                        </div>
                    </div>
                )}
            </main>

            {/* ----------------- Mobile Floating Glass Dock ----------------- */}
            <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto pointer-events-auto">
                <nav className="glass-panel bg-white/75 dark:bg-zinc-950/75 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] rounded-2xl p-1.5 flex items-center justify-around">
                    {dynamicTabs.slice(0, 5).map(tab => (
                        <MobileNavBtn
                            key={tab.key}
                            active={activeTab === tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            icon={tab.icon}
                            label={tab.label}
                            primaryColor={settings?.portal_primary_color}
                        />
                    ))}
                </nav>
            </div>

        </div>
    )
}

function NavButton({ active, onClick, icon: Icon, label, primaryColor }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center w-full gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group border",
                active
                    ? "bg-white border-gray-200/60 text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-white/10 dark:border-white/10 dark:text-white font-semibold"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5"
            )}
        >
            <Icon
                className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                    active ? "text-brand-pink" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200"
                )}
                style={{ color: active && primaryColor ? primaryColor : undefined }}
            />
            <span className="truncate text-[13px]">{label}</span>
            {active && (
                <div
                    className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse bg-brand-pink shrink-0"
                    style={{ backgroundColor: primaryColor || undefined }}
                />
            )}
        </button>
    )
}

function MobileNavBtn({ active, onClick, icon: Icon, label, primaryColor }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center py-1.5 px-2 rounded-xl min-w-[54px] transition-all duration-200 active:scale-95 flex-1 relative border",
                active
                    ? "bg-white border-gray-200/60 text-gray-900 shadow-sm dark:bg-white/15 dark:border-white/10 dark:text-white font-bold"
                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
            )}
        >
            <Icon
                className={cn("h-5 w-5 mb-0.5", active && "stroke-[2.5px]")}
                style={{ color: active && primaryColor ? primaryColor : undefined }}
            />
            <span className="text-[10px] tracking-tight truncate max-w-[62px]">{label}</span>
            {active && (
                <div
                    className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full animate-pulse bg-brand-pink"
                    style={{ backgroundColor: primaryColor || undefined }}
                />
            )}
        </button>
    )
}

function NotificationBell({ count, pendingInvoices, openQuotes, pendingBriefings, onViewQuote, onTabChange, onViewBriefing }: any) {
    const { t } = useTranslation()
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl">
                    <Bell className="h-5 w-5" />
                    {count > 0 && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 ring-1 ring-red-500"></span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-white/10 shadow-xl" align="end">
                <div className="p-4 border-b border-zinc-200/80 dark:border-white/10">
                    <h4 className="font-bold text-gray-900 dark:text-white">{t('portal.header.notifications')}</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {count === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-zinc-400 text-sm">{t('portal.header.empty_notifs')}</div>
                    ) : (
                        <div className="divide-y divide-zinc-100 dark:divide-white/5">
                            {pendingInvoices.length > 0 && (
                                <div className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors" onClick={() => onTabChange('billing')}>
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
                                            <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('portal.header.docs_overdue')}</p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400">{t('portal.header.pending_docs_count').replace('{count}', pendingInvoices.length.toString())}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {openQuotes.map((q: Quote) => (
                                <div key={q.id} className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors" onClick={() => onViewQuote(q)}>
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center shrink-0">
                                            <LayoutDashboard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('portal.header.new_quote')}</p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400">{t('portal.header.check_quote').replace('{number}', q.number)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {pendingBriefings.map((b: Briefing) => (
                                <div key={b.id} className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors" onClick={() => onViewBriefing ? onViewBriefing(b.id) : onTabChange('services')}>
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-brand-pink/10 dark:bg-brand-pink/20 flex items-center justify-center shrink-0">
                                            <Layers className="h-4 w-4 text-brand-pink" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('portal.header.pending_briefing')}</p>
                                            <p className="text-xs text-gray-500 dark:text-zinc-400">{t('portal.header.briefing_info').replace('{name}', b.template?.name || 'Service')}</p>
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

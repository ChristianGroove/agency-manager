"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Users, DollarSign, FileText, CreditCard, TrendingUp, AlertCircle, Server, UserPlus, FilePlus, ClipboardCheck, Receipt, ArrowRight } from "lucide-react"
import Link from "next/link"
import GlassCard3D from "@/components/ui/glass-card-3d"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import AnimatedAvatarGroup from "@/components/ui/animated-avatar-group"
import { ClientFormModal } from "@/components/modules/clients/client-form-modal"
import { QuoteFormModal } from "@/components/modules/quotes/quote-form-modal"
import { InvoiceFormModal } from "@/components/modules/invoices/invoice-form-modal"
import { BriefingFormModal } from "@/components/modules/briefings/briefing-form-modal"
import CountUp from "react-countup"
import { SplitText } from "@/components/ui/split-text"
import { MagicCard } from "@/components/ui/magic-card"

const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

type DashboardStats = {
    totalClients: number
    totalRevenue: number
    pendingPayments: number
    paidInvoices: number
    activeSubscriptions: number
    monthlyRecurring: number
    clientsWithDebt: number
}

const AGENCY_TIPS = [
    "Fideliza a tus clientes: Un servicio post-venta excepcional puede incrementar el LTV hasta en un 40%.",
    "Optimiza tu flujo de caja: Automatiza los recordatorios de pago para reducir drásticamente la morosidad.",
    "Escala inteligentemente: Documenta tus procesos operativos para delegar sin perder calidad en la entrega.",
    "Valor sobre precio: Enfócate en comunicar el ROI que generas, no en las horas operativas que trabajas.",
    "La especialización es clave: Definir un nicho de mercado claro te permite cobrar tarifas premium."
]

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalClients: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        paidInvoices: 0,
        activeSubscriptions: 0,
        monthlyRecurring: 0,
        clientsWithDebt: 0
    })
    const [settings, setSettings] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [animationData, setAnimationData] = useState<any>(null)
    const [currentTip, setCurrentTip] = useState(0)
    const [debtors, setDebtors] = useState<any[]>([])

    // Modal States
    const [isClientModalOpen, setIsClientModalOpen] = useState(false)
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false)

    useEffect(() => {
        fetchDashboardData()
        // Load animation
        fetch('/animations/cartoon-man-working-at-desk-illustration-2025-10-20-04-30-47-utc.json')
            .then(res => res.json())
            .then(data => setAnimationData(data))

        // Rotate tips
        const interval = setInterval(() => {
            setCurrentTip((prev) => (prev + 1) % AGENCY_TIPS.length)
        }, 8000)
        return () => clearInterval(interval)
    }, [])

    const fetchDashboardData = async () => {
        try {
            // Fetch all data in parallel
            const [clientsRes, invoicesRes, servicesRes, settingsRes] = await Promise.all([
                supabase.from('clients').select('*').is('deleted_at', null),
                supabase.from('invoices').select('*').is('deleted_at', null),
                supabase.from('services').select('*').is('deleted_at', null),
                supabase.from('settings').select('*').single()
            ])

            const clients = clientsRes.data || []
            const invoices = invoicesRes.data || []
            const services = servicesRes.data || []
            const settingsData = settingsRes.data || null

            setSettings(settingsData)

            // Calculate stats
            const totalRevenue = invoices
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + (inv.total || 0), 0)

            const pendingPayments = invoices
                .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
                .reduce((sum, inv) => sum + (inv.total || 0), 0)

            const paidInvoices = invoices.filter(inv => inv.status === 'paid').length

            // "Active Subscriptions" now refers to Recurring Services that are active
            const activeSubscriptions = services.filter(svc => svc.status === 'active' && svc.type === 'recurring').length

            const monthlyRecurring = services
                .filter(svc => svc.status === 'active' && svc.type === 'recurring' && svc.frequency === 'monthly')
                .reduce((sum, svc) => sum + (svc.amount || 0), 0)

            // Calculate clients with debt
            const clientDebts = new Map()
            invoices.forEach(inv => {
                if (inv.status === 'pending' || inv.status === 'overdue') {
                    const currentDebt = clientDebts.get(inv.client_id) || 0
                    clientDebts.set(inv.client_id, currentDebt + inv.total)
                }
            })

            // Process debtors list
            const debtorsList = Array.from(clientDebts.entries()).map(([clientId, amount]) => {
                const client = clients.find(c => c.id === clientId)
                // Skip if client is deleted (client won't be found because we filtered clients fetch)
                if (!client) return null

                return {
                    id: clientId,
                    name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.company_name || 'Cliente',
                    image: client.logo_url || client.avatar_url,
                    debt: amount
                }
            })
                .filter((item): item is NonNullable<typeof item> => !!item) // Remove nulls and help TS inference
                .sort((a, b) => (b?.debt || 0) - (a?.debt || 0)) // Sort by highest debt with null safety

            setDebtors(debtorsList)

            setStats({
                totalClients: clients.length,
                totalRevenue,
                pendingPayments,
                paidInvoices,
                activeSubscriptions,
                monthlyRecurring,
                clientsWithDebt: debtorsList.length
            })
        } catch (error) {
            console.error("Error fetching dashboard data:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">
                    <SplitText>Dashboard</SplitText>
                </h1>
                <p className="text-muted-foreground mt-1">Resumen en tiempo real de tu agencia</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Clients */}
                <MagicCard gradientColor="#00E0FF">
                    <Card className="bg-transparent border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-[30px]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                                Total Clientes
                            </CardTitle>
                            <div className="p-2 bg-gray-50 rounded-lg">
                                <Users className="h-4 w-4 text-gray-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{stats.totalClients}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats.clientsWithDebt > 0 ? (
                                    <span className="text-brand-pink font-medium flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {stats.clientsWithDebt} con saldo pendiente
                                    </span>
                                ) : (
                                    <span className="text-green-600 flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" />
                                        Todos al día
                                    </span>
                                )}
                            </p>
                        </CardContent>
                    </Card>
                </MagicCard>

                {/* Total Revenue */}
                <MagicCard gradientColor="#00E0FF">
                    <Card className="bg-transparent border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-[30px]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                                Ingresos Totales
                            </CardTitle>
                            <div className="p-2 bg-gray-50 rounded-lg">
                                <DollarSign className="h-4 w-4 text-gray-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-5">
                            <div className="text-2xl font-bold text-gray-900">
                                $<CountUp
                                    end={stats.totalRevenue}
                                    duration={1.8}
                                    separator=","
                                    preserveValue={true}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats.paidInvoices} documentos pagados
                            </p>
                        </CardContent>
                    </Card>
                </MagicCard>

                {/* Pending Payments */}
                <MagicCard gradientColor="#00E0FF">
                    <Card className="bg-transparent border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-[30px]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                                Por Cobrar
                            </CardTitle>
                            <div className="p-2 bg-gray-50 rounded-lg">
                                <AlertCircle className="h-4 w-4 text-gray-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-5">
                            <div className="text-2xl font-bold text-gray-900">
                                $<CountUp
                                    end={stats.pendingPayments}
                                    duration={2}
                                    separator=","
                                    preserveValue={true}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Pendientes de pago
                            </p>
                        </CardContent>
                    </Card>
                </MagicCard>

                {/* Active Subscriptions */}
                <MagicCard gradientColor="#00E0FF">
                    <Card className="bg-transparent border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-[30px]">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                                Suscripciones Activas
                            </CardTitle>
                            <div className="p-2 bg-gray-50 rounded-lg">
                                <CreditCard className="h-4 w-4 text-gray-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-5">
                            <div className="text-2xl font-bold text-gray-900">
                                <CountUp
                                    end={stats.activeSubscriptions}
                                    duration={1.5}
                                    preserveValue={true}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Servicios recurrentes
                            </p>
                        </CardContent>
                    </Card>
                </MagicCard>
            </div>

            {/* Monthly Recurring Revenue & 3D Card Section */}
            <div className="flex gap-8 flex-col lg:flex-row">
                {/* Monthly Recurring Revenue */}
                <Card className="flex-1 h-[250px] bg-brand-dark border-0 shadow-lg text-white overflow-hidden relative rounded-[30px] flex flex-col">
                    {/* Animated particles background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                        {[...Array(15)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-1 h-1 bg-brand-cyan/30 rounded-full"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    bottom: '-10px',
                                    animation: `floatUp ${5 + Math.random() * 5}s linear infinite`,
                                    animationDelay: `${Math.random() * 5}s`,
                                }}
                            />
                        ))}
                    </div>

                    {/* Lottie Animation */}
                    {animationData && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[260px] opacity-40 z-10 pointer-events-none">
                            <Lottie animationData={animationData} loop={true} />
                        </div>
                    )}

                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-200">
                            <TrendingUp className="h-5 w-5 text-brand-cyan" />
                            Ingresos Recurrentes Mensuales (MRR)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <div className="flex-1 flex items-center">
                            <div className="text-4xl font-bold text-white flex items-baseline gap-2">
                                $<CountUp
                                    end={stats.monthlyRecurring}
                                    duration={3}
                                    delay={0.5}
                                    separator=","
                                    decimals={0}
                                    preserveValue={true}
                                />
                                <span className="text-lg font-normal text-gray-400">COP/mes</span>
                            </div>
                        </div>
                        <div className="h-[60px] relative mt-2 max-w-md overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={currentTip}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -20, opacity: 0 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="text-sm text-gray-400 absolute w-full"
                                >
                                    <SplitText delay={0.3} duration={0.03}>
                                        {AGENCY_TIPS[currentTip]}
                                    </SplitText>
                                </motion.p>
                            </AnimatePresence>
                        </div>
                    </CardContent>

                    <style jsx>{`
                        @keyframes floatUp {
                            0% {
                                transform: translateY(0) scale(1);
                                opacity: 0;
                            }
                            10% {
                                opacity: 0.5;
                            }
                            50% {
                                opacity: 0.3;
                            }
                            100% {
                                transform: translateY(-400px) scale(0.5);
                                opacity: 0;
                            }
                        }
                    `}</style>
                </Card>

                {/* 3D Glass Card */}
                <div className="flex items-center justify-center lg:justify-start">
                    <GlassCard3D
                        socialFacebook={settings?.social_facebook}
                        socialInstagram={settings?.social_instagram}
                        socialTwitter={settings?.social_twitter}
                        facebookFollowers={settings?.social_facebook_followers || 0}
                        instagramFollowers={settings?.social_instagram_followers || 0}
                    />
                </div>
            </div>

            {/* Quick Actions */}
            {/* Quick Actions */}
            {/* Quick Actions */}
            {/* Quick Actions */}
            {/* Quick Actions */}
            {/* Quick Actions */}
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <div onClick={() => setIsClientModalOpen(true)}>
                    <motion.div whileHover="hover" initial="rest" className="h-full">
                        <Card className="h-full group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-100 hover:border-brand-cyan/50 hover:-translate-y-1 rounded-[30px]">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-3">
                                    <div className="p-2.5 bg-brand-cyan/10 rounded-lg group-hover:bg-brand-cyan group-hover:text-white transition-colors">
                                        <motion.div variants={{ hover: { scale: 1.2, rotate: 10 }, rest: { scale: 1, rotate: 0 } }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                                            <UserPlus className="h-5 w-5 text-brand-cyan group-hover:text-white" />
                                        </motion.div>
                                    </div>
                                    <span className="group-hover:text-brand-cyan transition-colors">Nuevo Cliente</span>
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </motion.div>
                </div>

                <div onClick={() => setIsQuoteModalOpen(true)}>
                    <motion.div whileHover="hover" initial="rest" className="h-full">
                        <Card className="h-full group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-100 hover:border-yellow-500/50 hover:-translate-y-1 rounded-[30px]">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-3">
                                    <div className="p-2.5 bg-yellow-50 rounded-lg group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                                        <motion.div variants={{ hover: { scale: 1.2, rotate: -10 }, rest: { scale: 1, rotate: 0 } }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                                            <FilePlus className="h-5 w-5 text-yellow-600 group-hover:text-white" />
                                        </motion.div>
                                    </div>
                                    <span className="group-hover:text-yellow-600 transition-colors">Nueva Cotización</span>
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </motion.div>
                </div>

                <div onClick={() => setIsBriefingModalOpen(true)}>
                    <motion.div whileHover="hover" initial="rest" className="h-full">
                        <Card className="h-full group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-100 hover:border-indigo-500/50 hover:-translate-y-1 rounded-[30px]">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-50 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <motion.div variants={{ hover: { scale: 1.2, y: -2 }, rest: { scale: 1, y: 0 } }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                                            <ClipboardCheck className="h-5 w-5 text-indigo-600 group-hover:text-white" />
                                        </motion.div>
                                    </div>
                                    <span className="group-hover:text-indigo-600 transition-colors">Nuevo Brief</span>
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </motion.div>
                </div>

                <div onClick={() => setIsInvoiceModalOpen(true)}>
                    <motion.div whileHover="hover" initial="rest" className="h-full">
                        <Card className="h-full group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-100 hover:border-brand-pink/50 hover:-translate-y-1 rounded-[30px]">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-3">
                                    <div className="p-2.5 bg-brand-pink/10 rounded-lg group-hover:bg-brand-pink group-hover:text-white transition-colors">
                                        <motion.div variants={{ hover: { scale: 1.2, rotate: 15 }, rest: { scale: 1, rotate: 0 } }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                                            <Receipt className="h-5 w-5 text-brand-pink group-hover:text-white" />
                                        </motion.div>
                                    </div>
                                    <span className="group-hover:text-brand-pink transition-colors">Nueva Factura</span>
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </motion.div>
                </div>
            </div>

            {/* Smart Block: Debtors */}
            <div className="mt-8">
                <Card className="bg-white border-gray-100 shadow-sm rounded-[30px] overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                Atención Requerida
                            </h3>
                            <p className="text-gray-500 max-w-xl">
                                Hay <span className="font-bold text-red-500">{stats.clientsWithDebt} clientes</span> con cuentas de cobro vencidas este mes.
                                Gestionar estos cobros podría recuperar <span className="font-bold text-gray-900">${(stats.clientsWithDebt * 1500000).toLocaleString()}</span> para tu flujo de caja.
                            </p>
                        </div>

                        {/* Animated Avatars */}
                        <div className="flex flex-col items-center md:items-end gap-3">
                            <div className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider text-xs">Clientes en Mora</div>
                            <AnimatedAvatarGroup
                                users={debtors}
                                limit={5}
                            />
                        </div>
                    </div>
                </Card>
            </div>
            {/* Modals */}
            <ClientFormModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onSuccess={() => {
                    setIsClientModalOpen(false)
                    fetchDashboardData() // Refresh stats
                }}
            />

            <QuoteFormModal
                isOpen={isQuoteModalOpen}
                onClose={() => setIsQuoteModalOpen(false)}
                onSuccess={() => {
                    setIsQuoteModalOpen(false)
                    fetchDashboardData()
                }}
            />

            <BriefingFormModal
                isOpen={isBriefingModalOpen}
                onClose={() => setIsBriefingModalOpen(false)}
                onSuccess={() => {
                    setIsBriefingModalOpen(false)
                    fetchDashboardData()
                }}
            />

            <InvoiceFormModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                onSuccess={() => {
                    setIsInvoiceModalOpen(false)
                    fetchDashboardData()
                }}
            />
        </div>
    )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Users, DollarSign, FileText, CreditCard, TrendingUp, AlertCircle } from "lucide-react"
import Link from "next/link"

type DashboardStats = {
    totalClients: number
    totalRevenue: number
    pendingPayments: number
    paidInvoices: number
    activeSubscriptions: number
    monthlyRecurring: number
    clientsWithDebt: number
}

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
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            // Fetch all data in parallel
            const [clientsRes, invoicesRes, subscriptionsRes] = await Promise.all([
                supabase.from('clients').select('*'),
                supabase.from('invoices').select('*'),
                supabase.from('subscriptions').select('*')
            ])

            const clients = clientsRes.data || []
            const invoices = invoicesRes.data || []
            const subscriptions = subscriptionsRes.data || []

            // Calculate stats
            const totalRevenue = invoices
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + (inv.total || 0), 0)

            const pendingPayments = invoices
                .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
                .reduce((sum, inv) => sum + (inv.total || 0), 0)

            const paidInvoices = invoices.filter(inv => inv.status === 'paid').length

            const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length

            const monthlyRecurring = subscriptions
                .filter(sub => sub.status === 'active' && sub.frequency === 'monthly')
                .reduce((sum, sub) => sum + (sub.amount || 0), 0)

            // Calculate clients with debt
            const clientDebts = new Map()
            invoices.forEach(inv => {
                if (inv.status === 'pending' || inv.status === 'overdue') {
                    const currentDebt = clientDebts.get(inv.client_id) || 0
                    clientDebts.set(inv.client_id, currentDebt + inv.total)
                }
            })

            setStats({
                totalClients: clients.length,
                totalRevenue,
                pendingPayments,
                paidInvoices,
                activeSubscriptions,
                monthlyRecurring,
                clientsWithDebt: clientDebts.size
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
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-muted-foreground mt-1">Resumen en tiempo real de tu agencia</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Clients */}
                <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
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

                {/* Total Revenue */}
                <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            Ingresos Totales
                        </CardTitle>
                        <div className="p-2 bg-gray-50 rounded-lg">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            ${stats.totalRevenue.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.paidInvoices} facturas pagadas
                        </p>
                    </CardContent>
                </Card>

                {/* Pending Payments */}
                <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            Por Cobrar
                        </CardTitle>
                        <div className="p-2 bg-gray-50 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-gray-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            ${stats.pendingPayments.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Pendientes de pago
                        </p>
                    </CardContent>
                </Card>

                {/* Active Subscriptions */}
                <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            Suscripciones Activas
                        </CardTitle>
                        <div className="p-2 bg-gray-50 rounded-lg">
                            <CreditCard className="h-4 w-4 text-gray-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {stats.activeSubscriptions}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Servicios recurrentes
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Recurring Revenue */}
            {/* Monthly Recurring Revenue */}
            <Card className="bg-gradient-to-br from-brand-dark to-gray-900 border-0 shadow-lg text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="h-32 w-32 text-white" />
                </div>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-200">
                        <TrendingUp className="h-5 w-5 text-brand-cyan" />
                        Ingresos Recurrentes Mensuales (MRR)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold text-white flex items-baseline gap-2">
                        ${stats.monthlyRecurring.toLocaleString()}
                        <span className="text-lg font-normal text-gray-400">COP/mes</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 max-w-md">
                        Estimado de ingresos mensuales por suscripciones activas. Mantén este número creciendo para asegurar la estabilidad de tu agencia.
                    </p>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            {/* Quick Actions */}
            {/* Quick Actions */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Link href="/clients">
                    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-100 hover:border-brand-cyan/50 hover:-translate-y-1">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-3">
                                <div className="p-2.5 bg-brand-cyan/10 rounded-lg group-hover:bg-brand-cyan group-hover:text-white transition-colors">
                                    <Users className="h-5 w-5 text-brand-cyan group-hover:text-white" />
                                </div>
                                <span className="group-hover:text-brand-cyan transition-colors">Ver Clientes</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground group-hover:text-gray-600">
                                Gestiona tu base de clientes
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/quotes">
                    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-100 hover:border-yellow-500/50 hover:-translate-y-1">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-3">
                                <div className="p-2.5 bg-yellow-50 rounded-lg group-hover:bg-yellow-500 group-hover:text-white transition-colors">
                                    <FileText className="h-5 w-5 text-yellow-600 group-hover:text-white" />
                                </div>
                                <span className="group-hover:text-yellow-600 transition-colors">Cotizaciones</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground group-hover:text-gray-600">
                                Crea y envía propuestas
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/invoices">
                    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-100 hover:border-brand-pink/50 hover:-translate-y-1">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-3">
                                <div className="p-2.5 bg-brand-pink/10 rounded-lg group-hover:bg-brand-pink group-hover:text-white transition-colors">
                                    <FileText className="h-5 w-5 text-brand-pink group-hover:text-white" />
                                </div>
                                <span className="group-hover:text-brand-pink transition-colors">Facturas</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground group-hover:text-gray-600">
                                Gestiona cuentas de cobro
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/hosting">
                    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-100 hover:border-indigo-500/50 hover:-translate-y-1">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <CreditCard className="h-5 w-5 text-indigo-600 group-hover:text-white" />
                                </div>
                                <span className="group-hover:text-indigo-600 transition-colors">Hosting</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground group-hover:text-gray-600">
                                Administra dominios y hosting
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}

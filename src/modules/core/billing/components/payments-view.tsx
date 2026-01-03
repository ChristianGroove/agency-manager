"use client"

import { useState } from "react"
import { Invoice } from "@/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, DollarSign, CalendarClock, Wallet, CreditCard } from "lucide-react"
import { RegisterPaymentSheet } from "@/modules/core/billing/register-payment-sheet"
import { cn } from "@/lib/utils"

interface PaymentsViewProps {
    invoices: Invoice[]
}

export function PaymentsView({ invoices }: PaymentsViewProps) {
    const [searchTerm, setSearchTerm] = useState("")

    // Filter Logic
    const filteredInvoices = invoices.filter(invoice =>
        invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Financial calculations
    const totalReceivable = invoices
        .filter(i => i.payment_status === 'UNPAID' || i.payment_status === 'PARTIALLY_PAID')
        .reduce((sum, i) => sum + i.total, 0)

    const totalOverdue = invoices
        .filter(i => i.payment_status === 'OVERDUE')
        .reduce((sum, i) => sum + i.total, 0)

    const getPaymentBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Pagada</Badge>
            case 'PARTIALLY_PAID':
                return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Parcial</Badge>
            case 'OVERDUE':
                return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 font-bold">Vencida</Badge>
            default: // UNPAID
                return <Badge variant="outline" className="text-gray-500 border-gray-300">Pendiente</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* Financial Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Por Cobrar</p>
                        <p className="text-2xl font-bold text-gray-900">${totalReceivable.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                        <CalendarClock className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Vencido</p>
                        <p className="text-2xl font-bold text-gray-900">${totalOverdue.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por cliente o factura..."
                        className="pl-8 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button className="shrink-0 bg-brand-pink text-white hover:bg-brand-pink/90">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Registrar Pago
                </Button>
            </div>

            {/* Payments Table */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead>Factura</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Vencimiento</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Estado de Pago</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                                    No hay registros de cartera.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((invoice) => (
                                <TableRow key={invoice.id} className="hover:bg-slate-50">
                                    <TableCell className="font-medium text-gray-900">{invoice.number}</TableCell>
                                    <TableCell className="text-gray-600">{invoice.client?.name}</TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        ${invoice.total.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {getPaymentBadge(invoice.payment_status || 'UNPAID')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {invoice.payment_status !== 'PAID' && (
                                            <RegisterPaymentSheet
                                                invoice={invoice}
                                                trigger={
                                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <CreditCard className="h-4 w-4 mr-1" />
                                                        Pagar
                                                    </Button>
                                                }
                                                onSuccess={() => {/* Refresh logic needed? InvoicesView refreshes automatically via server action revalidatePath */ }}
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <p className="text-xs text-center text-gray-400 max-w-2xl mx-auto">
                Gestión de Tesorería: Los pagos registrados aquí <strong>no afectan</strong> el estado fiscal ante la DIAN, solo el saldo de cartera.
            </p>
        </div>
    )
}

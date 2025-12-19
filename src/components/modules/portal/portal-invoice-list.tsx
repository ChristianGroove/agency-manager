"use client"

import { Invoice } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"

interface PortalInvoiceListProps {
    invoices: Invoice[]
    settings: any
    selectedInvoices: string[]
    onToggle: (id: string) => void
    onToggleAll: () => void
    onView: (invoice: Invoice) => void
}

export function PortalInvoiceList({ invoices, settings, selectedInvoices, onToggle, onToggleAll, onView }: PortalInvoiceListProps) {
    const paymentsEnabled = settings.enable_portal_payments !== false && settings.portal_modules?.payments !== false
    const pendingInvoices = invoices.filter(i => i.status !== 'paid')

    const getInvoiceStatus = (invoice: Invoice) => {
        if (invoice.status === 'paid') return 'paid'
        if (invoice.due_date && new Date(invoice.due_date) < new Date()) return 'overdue'
        return invoice.status
    }

    if (invoices.length === 0) return null

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="p-0 block">
                {/* Title Centered */}
                <div className="w-full text-center mb-6">
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Estado de Facturación
                    </CardTitle>
                </div>

                {/* Instruction - Left Aligned, Plain Text, Pulsing Dot */}
                <div className="flex justify-start mb-4 pl-1 animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                        </span>
                        Selecciona las facturas que deseas pagar
                    </p>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4 w-12">
                                        {paymentsEnabled && settings.enable_multi_invoice_payment !== false && (
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
                                                checked={pendingInvoices.length > 0 && selectedInvoices.length === pendingInvoices.length}
                                                onChange={onToggleAll}
                                                disabled={pendingInvoices.length === 0}
                                                style={{ color: settings.portal_primary_color }}
                                            />
                                        )}
                                    </th>
                                    <th className="px-6 py-4">Factura</th>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 text-right">Monto</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoices.map((invoice, index) => {
                                    const status = getInvoiceStatus(invoice)
                                    return (
                                        <tr
                                            key={invoice.id}
                                            className="hover:bg-gray-50/50 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <td className="px-6 py-4">
                                                {status !== 'paid' && paymentsEnabled && (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
                                                        checked={selectedInvoices.includes(invoice.id)}
                                                        onChange={() => onToggle(invoice.id)}
                                                        style={{ color: settings.portal_primary_color }}
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">#{invoice.number}</td>
                                            <td className="px-6 py-4 text-gray-600">{new Date(invoice.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <Badge
                                                    variant={status === 'paid' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary'}
                                                    className={cn(
                                                        "w-24 justify-center",
                                                        status === 'overdue' && "bg-red-600 text-white hover:bg-red-700 border-transparent"
                                                    )}
                                                >
                                                    {status === 'paid' ? 'Pagada' : status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">${invoice.total.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => onView(invoice)}>
                                                    Ver Detalle
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile List */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {invoices.map((invoice, index) => {
                            const status = getInvoiceStatus(invoice)
                            return (
                                <div
                                    key={invoice.id}
                                    className="p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {status !== 'paid' && paymentsEnabled && (
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
                                            checked={selectedInvoices.includes(invoice.id)}
                                            onChange={() => onToggle(invoice.id)}
                                            style={{ color: settings.portal_primary_color }}
                                        />
                                    )}
                                    <div className="flex-1" onClick={() => onView(invoice)}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-gray-900">#{invoice.number}</span>
                                            <Badge
                                                variant={status === 'paid' ? 'default' : status === 'overdue' ? 'destructive' : 'secondary'}
                                                className={cn(
                                                    "w-24 justify-center",
                                                    status === 'overdue' && "bg-red-600 text-white hover:bg-red-700 border-transparent"
                                                )}
                                            >
                                                {status === 'paid' ? 'Pagada' : status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs text-gray-500">{new Date(invoice.date).toLocaleDateString()}</span>
                                            <span className="font-bold text-gray-900">${invoice.total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

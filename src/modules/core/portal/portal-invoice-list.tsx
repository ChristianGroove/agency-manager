"use client"

import { Invoice } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, ChevronRight, ChevronDown, FileText, Printer, Calendar, AlertTriangle } from "lucide-react"
import { useState, Fragment } from "react"

interface PortalInvoiceListProps {
    invoices: Invoice[]
    settings?: any
    selectedInvoices?: string[]
    onToggle?: (id: string) => void
    onToggleAll?: () => void
    onView: (invoice: Invoice) => void
    compact?: boolean
    onPay?: (invoiceIds: string[]) => void // Added for direct pay action in compact mode if needed
    token?: string
}

import { useTranslation } from "@/lib/i18n/use-translation"

export function PortalInvoiceList({ invoices, settings = {}, selectedInvoices = [], onToggle, onToggleAll, onView, compact = false, token }: PortalInvoiceListProps) {
    const { t } = useTranslation()
    const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null)

    const paymentsEnabled = settings?.enable_portal_payments !== false && settings?.portal_modules?.payments !== false
    const pendingInvoices = invoices.filter(i => i.status !== 'paid')

    // Filter out paid invoices for display as per requirement
    const displayInvoices = invoices.filter(i => i.status !== 'paid')

    const getInvoiceStatus = (invoice: Invoice) => {
        if (invoice.status === 'paid') return 'paid'
        if (invoice.due_date && new Date(invoice.due_date) < new Date()) return 'overdue'
        return invoice.status
    }

    if (invoices.length === 0) return null

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="p-0 pb-4">
                <p className="text-sm text-gray-600 text-center">{t('portal.components.invoice_list.select_docs')}</p>
            </CardHeader>
            <CardContent className="px-0">
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4 w-12">
                                        {!compact && paymentsEnabled && settings?.enable_multi_invoice_payment !== false && onToggleAll && (
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
                                                checked={pendingInvoices.length > 0 && selectedInvoices.length === pendingInvoices.length}
                                                onChange={onToggleAll}
                                                disabled={pendingInvoices.length === 0}
                                                style={{ color: settings?.portal_primary_color }}
                                            />
                                        )}
                                    </th>
                                    <th className="px-6 py-4">{t('portal.components.invoice_list.table.document')}</th>
                                    <th className="px-6 py-4">{t('portal.components.invoice_list.table.date')}</th>
                                    <th className="px-6 py-4">{t('portal.components.invoice_list.table.status')}</th>
                                    <th className="px-6 py-4 text-right">{t('portal.components.invoice_list.table.amount')}</th>
                                    <th className="px-6 py-4 text-right">{t('portal.components.invoice_list.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayInvoices.map((invoice, index) => {
                                    const status = getInvoiceStatus(invoice)
                                    const isExpanded = expandedInvoiceId === invoice.id

                                    return (
                                        <Fragment key={invoice.id}>
                                            <tr
                                                className={cn(
                                                    "hover:bg-gray-50/50 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards cursor-pointer",
                                                    isExpanded && "bg-gray-50/80"
                                                )}
                                                style={{ animationDelay: `${index * 50}ms` }}
                                                onClick={() => setExpandedInvoiceId(prev => prev === invoice.id ? null : invoice.id)}
                                            >
                                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                    {status !== 'paid' && !compact && paymentsEnabled && onToggle && (
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-[var(--portal-primary)] focus:ring-[var(--portal-primary)] cursor-pointer"
                                                            checked={selectedInvoices.includes(invoice.id)}
                                                            onChange={() => onToggle(invoice.id)}
                                                            style={{ color: settings?.portal_primary_color }}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900 group">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("transition-transform duration-200 text-gray-400", isExpanded && "rotate-90")}>
                                                            <ChevronRight className="h-4 w-4" />
                                                        </div>
                                                        <span>#{invoice.number}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{new Date(invoice.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "w-24 justify-center border-0",
                                                            status === 'paid' ? "text-green-600" :
                                                                status === 'overdue' ? "text-red-600" : "text-gray-600"
                                                        )}
                                                    >
                                                        {status === 'paid' ? t('portal.components.invoice_list.status.paid') : status === 'overdue' ? t('portal.components.invoice_list.status.overdue') : t('portal.components.invoice_list.status.pending')}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">${invoice.total.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    {token ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="hover:bg-brand-pink/10 hover:text-brand-pink"
                                                            onClick={() => window.open(`/portal/${token}/invoice/${invoice.id}`, '_blank')}
                                                        >
                                                            <Printer className="h-4 w-4 mr-2" />
                                                            {t('portal.components.invoice_list.buttons.pdf')}
                                                        </Button>
                                                    ) : (
                                                        <Button variant="ghost" size="sm" onClick={() => onView(invoice)}>
                                                            {t('portal.components.invoice_list.buttons.view_detail')}
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                            {/* Expanded Detail Row */}
                                            {isExpanded && (
                                                <tr className="bg-gray-50/50 animate-in fade-in zoom-in-95 duration-200">
                                                    <td colSpan={6} className="px-6 pb-6 pt-0">
                                                        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden mt-2 ml-12">
                                                            {/* Mini Header Details */}
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-gray-50 text-sm bg-gray-50/30">
                                                                <div>
                                                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('portal.components.invoice_list.details.emission')}</p>
                                                                    <p className="font-medium flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-gray-400" /> {new Date(invoice.date).toLocaleDateString()}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('portal.components.invoice_list.details.expiration')}</p>
                                                                    <p className={cn("font-medium flex items-center gap-1.5", status === 'overdue' ? "text-red-600" : "text-gray-900")}>
                                                                        {status === 'overdue' && <AlertTriangle className="h-3.5 w-3.5" />}
                                                                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                                                                    </p>
                                                                </div>
                                                                <div className="col-span-2 text-right">
                                                                    {(invoice as any).description && <p className="text-gray-500 italic text-xs">{(invoice as any).description}</p>}
                                                                </div>
                                                            </div>

                                                            {/* Items List */}
                                                            <div className="divide-y divide-gray-50">
                                                                {invoice.items?.map((item: any, idx: number) => (
                                                                    <div key={idx} className="flex justify-between items-center p-3 px-4 hover:bg-gray-50 transition-colors">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-medium text-gray-700">{item.description}</span>
                                                                            {item.quantity > 1 && <span className="text-xs text-gray-400">{t('portal.components.invoice_list.details.quantity')}: {item.quantity}</span>}
                                                                        </div>
                                                                        <span className="text-sm font-medium text-gray-900">${(item.price * item.quantity).toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {/* Total Footer */}
                                                            <div className="bg-gray-50 p-3 px-4 flex justify-between items-center border-t border-gray-100">
                                                                <span className="text-sm font-bold text-gray-600">{t('portal.components.invoice_list.details.total_invoice')}</span>
                                                                <span className="text-lg font-bold text-[var(--portal-primary)]" style={{ color: settings?.portal_primary_color }}>${invoice.total.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile List */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {displayInvoices.map((invoice, index) => {
                            const status = getInvoiceStatus(invoice)
                            const isExpanded = expandedInvoiceId === invoice.id

                            return (
                                <div key={invoice.id}>
                                    <div
                                        className={cn(
                                            "p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards cursor-pointer",
                                            isExpanded && "bg-gray-50"
                                        )}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                        onClick={() => setExpandedInvoiceId(prev => prev === invoice.id ? null : invoice.id)}
                                    >
                                        {status !== 'paid' && paymentsEnabled && onToggle && (
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 rounded border-gray-300 text-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
                                                checked={selectedInvoices.includes(invoice.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation()
                                                    onToggle(invoice.id)
                                                }}
                                                style={{ color: settings.portal_primary_color }}
                                            />
                                        )}
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-gray-900 flex items-center gap-1">
                                                    #{invoice.number}
                                                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "w-24 justify-center border-0",
                                                        status === 'paid' ? "text-green-600" :
                                                            status === 'overdue' ? "text-red-600" : "text-gray-600"
                                                    )}
                                                >
                                                    {status === 'paid' ? t('portal.components.invoice_list.status.paid') : status === 'overdue' ? t('portal.components.invoice_list.status.overdue') : t('portal.components.invoice_list.status.pending')}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-xs text-gray-500">{new Date(invoice.date).toLocaleDateString()}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-900">${invoice.total.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Expanded */}
                                    {isExpanded && (
                                        <div className="bg-gray-50 p-4 border-b border-gray-100 animate-in slide-in-from-top-2">
                                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                                {/* Actions Row Mobile */}
                                                <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-end">
                                                    {token && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="w-full"
                                                            onClick={() => window.open(`/portal/${token}/invoice/${invoice.id}`, '_blank')}
                                                        >
                                                            <Printer className="h-4 w-4 mr-2" />
                                                            {t('portal.components.invoice_list.buttons.download_pdf')}
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="divide-y divide-gray-50">
                                                    {invoice.items?.map((item: any, idx: number) => (
                                                        <div key={idx} className="p-3 flex justify-between text-sm">
                                                            <span>{item.description} {item.quantity > 1 && `(x${item.quantity})`}</span>
                                                            <span className="font-semibold">${(item.price * item.quantity).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

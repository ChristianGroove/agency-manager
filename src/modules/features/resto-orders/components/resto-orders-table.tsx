"use client"

import React, { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { 
    UtensilsCrossed, Truck, ShoppingBag, MapPin, Receipt, X, 
    Clock, Users, CreditCard, CheckCircle2, Banknote, Loader2,
    ChevronDown, ChevronUp, CircleDollarSign, FileText
} from "lucide-react"
import { GroupedOrder, markSessionPaid, forceRequestBill } from "../actions"
import { toast } from "sonner"

// ─── Mode Config ─────────────────────────────────────────────────────
const MODE_CONFIG: Record<string, { label: string; icon: React.ElementType; colors: string }> = {
    dine_in: {
        label: 'En Mesa',
        icon: UtensilsCrossed,
        colors: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
    },
    delivery: {
        label: 'Domicilio',
        icon: Truck,
        colors: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800'
    },
    pickup: {
        label: 'Recoger',
        icon: ShoppingBag,
        colors: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
    }
}

// ─── Kitchen Status Config ───────────────────────────────────────────
const KITCHEN_CONFIG: Record<string, { label: string; colors: string }> = {
    pending: { label: 'Pendiente', colors: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    preparing: { label: 'En Cocina', colors: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
    ready: { label: 'Listo', colors: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    completed: { label: 'Entregado', colors: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' },
    cancelled: { label: 'Cancelado', colors: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
}

// ─── Payment Badge Component ─────────────────────────────────────────
function PaymentBadge({ 
    row, 
    onCobrar 
}: { 
    row: GroupedOrder, 
    onCobrar: (row: GroupedOrder) => void 
}) {
    if (row.paymentStatus === 'paid') {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                Pagado
            </span>
        )
    }

    if (row.paymentStatus === 'payment_pending') {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); onCobrar(row) }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full 
                    bg-brand/10 text-brand border border-brand/20 
                    hover:bg-brand/20 hover:shadow-md hover:scale-105
                    transition-all duration-200 animate-pulse cursor-pointer"
            >
                <CircleDollarSign className="w-3.5 h-3.5" />
                Cobrar
            </button>
        )
    }

    // unpaid
    if (row.restoMode === 'dine_in' && row.type === 'session' && row.sessionStatus === 'active') {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                <Clock className="w-3 h-3" />
                Cuenta Abierta
            </span>
        )
    }

    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Por Pagar
        </span>
    )
}

// ─── Main Table Component ────────────────────────────────────────────
export function RestoOrdersTable({
    groupedOrders,
    // Legacy props for backward compatibility
    orders,
    selectedOrder,
    setSelectedOrder
}: {
    groupedOrders?: GroupedOrder[]
    orders?: any[]
    selectedOrder?: any
    setSelectedOrder?: (order: any | null) => void
}) {
    const [billingSheet, setBillingSheet] = useState<GroupedOrder | null>(null)
    const [detailSheet, setDetailSheet] = useState<GroupedOrder | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [forcingBill, setForcingBill] = useState<string | null>(null)

    // Use grouped orders if available, otherwise empty
    const rows = groupedOrders || []

    const handleCobrar = (row: GroupedOrder) => {
        setBillingSheet(row)
    }

    const handleConfirmPayment = async () => {
        if (!billingSheet?.sessionId) return
        setIsProcessing(true)
        try {
            const result = await markSessionPaid(billingSheet.sessionId)
            if (result.success) {
                toast.success(`Mesa ${billingSheet.tableIdentifier || ''} pagada y liberada`)
                setBillingSheet(null)
                // Page will revalidate
                window.location.reload()
            } else {
                toast.error("Error: " + result.error)
            }
        } catch (e: any) {
            toast.error("Error inesperado: " + e.message)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleForceRequestBill = async (row: GroupedOrder) => {
        if (!row.sessionId) return
        setForcingBill(row.sessionId)
        try {
            const result = await forceRequestBill(row.sessionId)
            if (result.success) {
                toast.success(`Cuenta solicitada para Mesa ${row.tableIdentifier || ''}`)
                window.location.reload()
            } else {
                toast.error("Error: " + result.error)
            }
        } catch (e: any) {
            toast.error("Error: " + e.message)
        } finally {
            setForcingBill(null)
        }
    }

    const handleViewDetail = (row: GroupedOrder) => {
        setDetailSheet(row)
    }

    return (
        <>
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-black/20 text-gray-500 dark:text-zinc-400 font-semibold border-b border-gray-200 dark:border-white/10">
                            <tr>
                                <th className="px-5 py-4">Fecha</th>
                                <th className="px-5 py-4">Cliente</th>
                                <th className="px-5 py-4">Modo</th>
                                <th className="px-5 py-4">Total</th>
                                <th className="px-5 py-4">Pago</th>
                                <th className="px-5 py-4">Estado Cocina</th>
                                <th className="px-5 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No hay pedidos registrados aún.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => {
                                    const mode = MODE_CONFIG[row.restoMode] || MODE_CONFIG.delivery
                                    const ModeIcon = mode.icon
                                    const kitchen = KITCHEN_CONFIG[row.kitchenStatus] || KITCHEN_CONFIG.pending

                                    return (
                                        <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            {/* Fecha */}
                                            <td className="px-5 py-4 text-gray-600 dark:text-zinc-400">
                                                <div className="text-sm">
                                                    {format(new Date(row.createdAt), "MMM d, h:mm a", { locale: es })}
                                                </div>
                                            </td>

                                            {/* Cliente */}
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    {row.restoMode === 'dine_in' && row.tableIdentifier ? (
                                                        <>
                                                            <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                                <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                                                Mesa {row.tableIdentifier}
                                                            </span>
                                                            {row.roundCount > 1 && (
                                                                <span className="text-xs text-gray-500 dark:text-zinc-500 pl-5">
                                                                    {row.roundCount} rondas
                                                                </span>
                                                            )}
                                                            {row.clientName !== 'Invitado' && (
                                                                <span className="text-xs text-gray-500 dark:text-zinc-500 pl-5">
                                                                    {row.clientName}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            {row.clientName}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Modo */}
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${mode.colors}`}>
                                                    <ModeIcon className="w-3.5 h-3.5" />
                                                    {mode.label}
                                                </span>
                                            </td>

                                            {/* Total */}
                                            <td className="px-5 py-4 font-bold text-gray-900 dark:text-white">
                                                ${row.total?.toLocaleString('es-CO')}
                                            </td>

                                            {/* Pago */}
                                            <td className="px-5 py-4">
                                                <PaymentBadge row={row} onCobrar={handleCobrar} />
                                            </td>

                                            {/* Estado Cocina */}
                                            <td className="px-5 py-4">
                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${kitchen.colors}`}>
                                                    {kitchen.label}
                                                </span>
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Admin force bill button for active dine-in sessions */}
                                                    {row.type === 'session' && row.sessionStatus === 'active' && row.paymentStatus === 'unpaid' && (
                                                        <button
                                                            onClick={() => handleForceRequestBill(row)}
                                                            disabled={forcingBill === row.sessionId}
                                                            className="text-xs text-zinc-500 hover:text-brand dark:hover:text-brand-light font-medium transition-colors disabled:opacity-50"
                                                            title="Solicitar cuenta (admin)"
                                                        >
                                                            {forcingBill === row.sessionId ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Banknote className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleViewDetail(row)}
                                                        className="text-brand hover:underline font-semibold text-sm"
                                                    >
                                                        Ver Detalle
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Billing Sheet (Premium Floating) ─────────────────────── */}
            {billingSheet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setBillingSheet(null)}>
                    <div
                        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="relative bg-gradient-to-br from-brand/10 via-brand/5 to-transparent dark:from-brand/20 dark:via-brand/10 p-6 border-b border-gray-100 dark:border-zinc-800">
                            <button
                                onClick={() => setBillingSheet(null)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 dark:bg-zinc-800/80 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors shadow-sm"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center">
                                    <CreditCard className="w-6 h-6 text-brand" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Cobrar Mesa {billingSheet.tableIdentifier}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                                        {billingSheet.roundCount} {billingSheet.roundCount === 1 ? 'ronda' : 'rondas'} · Sesión {billingSheet.sessionStatus === 'payment_pending' ? 'cuenta solicitada' : 'activa'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                            {/* Total Summary */}
                            <div className="bg-gradient-to-br from-brand/5 to-brand/10 dark:from-brand/10 dark:to-brand/20 rounded-2xl p-5 border border-brand/10 dark:border-brand/20">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase font-semibold tracking-wider">Total a cobrar</p>
                                        <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                                            ${billingSheet.total?.toLocaleString('es-CO')}
                                        </p>
                                    </div>
                                    {billingSheet.tipAmount > 0 && (
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase font-semibold">Propina</p>
                                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                                +${billingSheet.tipAmount.toLocaleString('es-CO')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Rounds Detail */}
                            <div>
                                <h3 className="font-bold text-sm mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    Detalle por Rondas
                                </h3>
                                <div className="space-y-3">
                                    {billingSheet.orders.map((order: any, idx: number) => (
                                        <RoundCard key={order.id} order={order} roundNumber={idx + 1} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 flex gap-3">
                            <button
                                onClick={() => setBillingSheet(null)}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-gray-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={isProcessing}
                                className="flex-[2] px-4 py-3 rounded-xl text-sm font-bold text-white bg-brand hover:bg-brand-dark disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20"
                            >
                                {isProcessing ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                                ) : (
                                    <><CheckCircle2 className="w-4 h-4" /> Confirmar Pago y Liberar Mesa</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Detail Sheet (Order/Session Detail View) ─────────────── */}
            {detailSheet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDetailSheet(null)}>
                    <div
                        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                            <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                                <ShoppingBag className="w-5 h-5 text-brand" />
                                {detailSheet.type === 'session'
                                    ? `Cuenta Mesa ${detailSheet.tableIdentifier || ''}`
                                    : 'Detalle del Pedido'
                                }
                            </h2>
                            <button
                                onClick={() => setDetailSheet(null)}
                                className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shadow-sm border border-gray-200 dark:border-zinc-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                            {/* Summary bar */}
                            <div className="flex justify-between items-center bg-brand/5 dark:bg-brand/10 p-4 rounded-xl border border-brand/10 dark:border-brand/20">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Total</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">${detailSheet.total?.toLocaleString('es-CO')}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    {detailSheet.tipAmount > 0 && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Propina</p>
                                            <p className="text-sm font-bold text-emerald-600">${detailSheet.tipAmount.toLocaleString('es-CO')}</p>
                                        </div>
                                    )}
                                    <div>
                                        <PaymentBadge row={detailSheet} onCobrar={handleCobrar} />
                                    </div>
                                </div>
                            </div>

                            {/* Mode badge */}
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const mode = MODE_CONFIG[detailSheet.restoMode] || MODE_CONFIG.delivery
                                    const ModeIcon = mode.icon
                                    return (
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border ${mode.colors}`}>
                                            <ModeIcon className="w-3.5 h-3.5" />
                                            {mode.label}
                                        </span>
                                    )
                                })()}
                                {detailSheet.type === 'session' && (
                                    <span className="text-xs text-gray-500 dark:text-zinc-400">
                                        {detailSheet.roundCount} {detailSheet.roundCount === 1 ? 'ronda' : 'rondas'}
                                    </span>
                                )}
                            </div>

                            {/* Orders / Rounds */}
                            {detailSheet.type === 'session' ? (
                                <div className="space-y-3">
                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                        Rondas
                                    </h3>
                                    {detailSheet.orders.map((order: any, idx: number) => (
                                        <RoundCard key={order.id} order={order} roundNumber={idx + 1} />
                                    ))}
                                </div>
                            ) : (
                                <div>
                                    <h3 className="font-bold text-sm mb-2 text-gray-900 dark:text-white border-b pb-1 dark:border-zinc-800">Productos</h3>
                                    <div className="space-y-2">
                                        {(detailSheet.orders[0]?.items_snapshot || []).map((item: any, idx: number) => (
                                            <ItemRow key={idx} item={item} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Delivery address */}
                            {detailSheet.deliveryAddress && (
                                <div className="pt-3 border-t border-gray-100 dark:border-zinc-800">
                                    <h3 className="font-bold text-sm mb-1 text-gray-900 dark:text-white flex items-center gap-1">
                                        <MapPin className="w-4 h-4 text-gray-400" /> Dirección de Entrega
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 pl-5">{detailSheet.deliveryAddress}</p>
                                </div>
                            )}

                            {/* Customer notes */}
                            {detailSheet.customerNotes && (
                                <div className="pt-3 border-t border-gray-100 dark:border-zinc-800">
                                    <h3 className="font-bold text-sm mb-1 text-gray-900 dark:text-white flex items-center gap-1">
                                        <Receipt className="w-4 h-4 text-gray-400" /> Notas del Cliente
                                    </h3>
                                    <p className="text-sm text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg italic">
                                        &quot;{detailSheet.customerNotes}&quot;
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 flex gap-3 justify-end">
                            {/* If session is active and unpaid, allow admin to force bill */}
                            {detailSheet.type === 'session' && detailSheet.sessionStatus === 'active' && detailSheet.paymentStatus === 'unpaid' && (
                                <button
                                    onClick={() => { setDetailSheet(null); handleForceRequestBill(detailSheet) }}
                                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-brand bg-brand/10 border border-brand/20 hover:bg-brand/20 transition-colors flex items-center gap-2"
                                >
                                    <Banknote className="w-4 h-4" />
                                    Solicitar Cuenta
                                </button>
                            )}
                            {/* If payment pending, allow direct cobrar */}
                            {detailSheet.paymentStatus === 'payment_pending' && detailSheet.sessionId && (
                                <button
                                    onClick={() => { setDetailSheet(null); handleCobrar(detailSheet) }}
                                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-brand hover:bg-brand-dark transition-colors flex items-center gap-2 shadow-lg shadow-brand/20"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Cobrar
                                </button>
                            )}
                            <button
                                onClick={() => setDetailSheet(null)}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// ─── Round Card Sub-component ────────────────────────────────────────
function RoundCard({ order, roundNumber }: { order: any; roundNumber: number }) {
    const [expanded, setExpanded] = useState(roundNumber === 1)
    const kitchen = KITCHEN_CONFIG[order.kitchen_status] || KITCHEN_CONFIG.pending

    return (
        <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden bg-white dark:bg-zinc-800/50">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center">
                        {roundNumber}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                        Ronda {roundNumber}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${kitchen.colors}`}>
                        {kitchen.label}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                        ${Number(order.total)?.toLocaleString('es-CO')}
                    </span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </button>
            {expanded && (
                <div className="px-4 pb-3 pt-0 space-y-1.5 border-t border-gray-100 dark:border-zinc-700">
                    {(order.items_snapshot || []).map((item: any, idx: number) => (
                        <ItemRow key={idx} item={item} />
                    ))}
                    {order.customer_notes && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 italic mt-2 pl-1">
                            &quot;{order.customer_notes}&quot;
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Item Row Sub-component ──────────────────────────────────────────
function ItemRow({ item }: { item: any }) {
    return (
        <div className="flex justify-between text-sm items-start py-1">
            <div className="flex-1">
                <span className="font-bold mr-2 text-gray-900 dark:text-white">{item.quantity}x</span>
                <span className="text-gray-700 dark:text-gray-300">{item.title}</span>
                {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5 ml-6">
                        + {item.modifiers.map((m: any) => m.optionName).join(', ')}
                    </p>
                )}
            </div>
            <span className="font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                ${(item.price * item.quantity).toLocaleString('es-CO')}
            </span>
        </div>
    )
}

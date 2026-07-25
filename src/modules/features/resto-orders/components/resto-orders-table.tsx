"use client"

import React, { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { 
    UtensilsCrossed, Truck, ShoppingBag, MapPin, Receipt, X, 
    Clock, CreditCard, CheckCircle2, Banknote, Loader2,
    ChevronDown, ChevronUp, CircleDollarSign, FileText,
    Wallet, Smartphone, Calculator, Phone, Hash, BellRing
} from "lucide-react"
import { GroupedOrder, processOrderPayment, forceRequestBill } from "../actions"
import { toast } from "sonner"

// ─── Mode Config (Unified Branding Colors) ───────────────────────────
const MODE_CONFIG: Record<string, { label: string; icon: React.ElementType; colors: string }> = {
    dine_in: {
        label: 'En Mesa',
        icon: UtensilsCrossed,
        colors: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
    },
    delivery: {
        label: 'Domicilio',
        icon: Truck,
        colors: 'bg-brand-pink/10 text-brand-pink border-brand-pink/20 dark:bg-brand-pink/20 dark:text-brand-pink dark:border-brand-pink/40'
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

// ─── Payment Badge Component (Unified Brand Accent Button) ───────────
function PaymentBadge({ 
    row, 
    onCobrar 
}: { 
    row: GroupedOrder, 
    onCobrar: (row: GroupedOrder) => void 
}) {
    if (row.paymentStatus === 'paid') {
        const methodLabel = row.paymentMethod ? ` (${row.paymentMethod})` : ''
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 capitalize">
                <CheckCircle2 className="w-3 h-3" />
                Pagado{methodLabel}
            </span>
        )
    }

    const isBillRequested = row.paymentStatus === 'payment_pending' || row.sessionStatus === 'payment_pending'

    if (isBillRequested) {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); onCobrar(row) }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-full 
                    bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/40
                    animate-pulse hover:scale-105 transition-all duration-200 cursor-pointer"
            >
                <BellRing className="w-3.5 h-3.5 animate-bounce" />
                Pidió Cuenta
            </button>
        )
    }

    // Unified Cobrar Button for ALL modes (dine_in, delivery, pickup)
    if (
        row.restoMode === 'delivery' || 
        row.restoMode === 'pickup' ||
        (row.restoMode === 'dine_in' && row.type === 'session')
    ) {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); onCobrar(row) }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full 
                    bg-brand-pink hover:opacity-90 text-white shadow-md shadow-brand-pink/20
                    hover:scale-105 transition-all duration-200 cursor-pointer"
            >
                <CircleDollarSign className="w-3.5 h-3.5" />
                Cobrar
            </button>
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
    const [forcingBill, setForcingBill] = useState<string | null>(null)

    // Construct flat list of row items
    const rows: GroupedOrder[] = (groupedOrders && groupedOrders.length > 0)
        ? groupedOrders
        : (orders || []).map((o: any) => ({
            id: o.id,
            type: 'individual' as const,
            clientName: o.leads?.name || 'Invitado',
            clientPhone: o.leads?.phone || null,
            tableIdentifier: o.resto_tables?.table_identifier || null,
            restoMode: o.resto_mode || 'delivery',
            roundCount: 1,
            total: Number(o.total) || 0,
            tipAmount: Number(o.tip_amount) || 0,
            paymentStatus: o.payment_status || 'unpaid',
            paymentMethod: o.payment_method || null,
            paymentReference: o.payment_reference || null,
            kitchenStatus: o.kitchen_status || 'pending',
            createdAt: o.created_at,
            lastOrderAt: o.created_at,
            sessionId: o.session_id || null,
            sessionStatus: null,
            deliveryAddress: o.delivery_address || null,
            customerNotes: o.customer_notes || null,
            orders: [o]
        }))

    const handleCobrar = (row: GroupedOrder) => {
        setBillingSheet(row)
    }

    const handleForceRequestBill = async (row: GroupedOrder) => {
        if (!row.sessionId) return
        setForcingBill(row.sessionId)
        const res = await forceRequestBill(row.sessionId)
        if (res.success) {
            toast.success(`Cuenta solicitada para Mesa ${row.tableIdentifier}`)
        } else {
            toast.error(res.error || "Error al solicitar cuenta")
        }
        setForcingBill(null)
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
                                <th className="px-5 py-4">Modo</th>
                                <th className="px-5 py-4">Cliente</th>
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
                                    const isBillRequested = row.paymentStatus === 'payment_pending' || row.sessionStatus === 'payment_pending'

                                    return (
                                        <tr key={row.id} className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group ${isBillRequested ? 'bg-amber-500/5' : ''}`}>
                                            {/* Fecha */}
                                            <td className="px-5 py-4 text-gray-600 dark:text-zinc-400">
                                                <div className="text-sm">
                                                    {format(new Date(row.createdAt), "MMM d, h:mm a", { locale: es })}
                                                </div>
                                            </td>

                                            {/* Modo */}
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${mode.colors}`}>
                                                    <ModeIcon className="w-3.5 h-3.5" />
                                                    {mode.label}
                                                </span>
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
                                                            {row.waiterName && (
                                                                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 pl-5">
                                                                    👤 Mesero: {row.waiterName}
                                                                </span>
                                                            )}
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
                                                        <>
                                                            <span className="font-medium text-gray-900 dark:text-white">
                                                                {row.clientName}
                                                            </span>
                                                            {row.clientPhone && (
                                                                <span className="text-xs text-gray-500 dark:text-zinc-500">
                                                                    {row.clientPhone}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
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
                                                    {row.type === 'session' && row.sessionStatus === 'active' && row.paymentStatus === 'unpaid' && (
                                                        <button
                                                            onClick={() => handleForceRequestBill(row)}
                                                            disabled={forcingBill === row.sessionId}
                                                            className="text-xs text-zinc-500 hover:text-brand-pink font-medium transition-colors disabled:opacity-50"
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
                                                        className="text-brand-pink hover:underline font-semibold text-sm"
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

            {/* ─── Universal Payment Sheet (Motor Unificado de Cobro) ─── */}
            {billingSheet && (
                <UniversalPaymentSheet
                    order={billingSheet}
                    onClose={() => setBillingSheet(null)}
                    onSuccess={() => {
                        setBillingSheet(null)
                        window.location.reload()
                    }}
                />
            )}

            {/* ─── Detail Sheet (Order/Session Detail View) ─────────────── */}
            {detailSheet && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDetailSheet(null)}>
                    <div
                        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                            <h2 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                                <ShoppingBag className="w-5 h-5 text-brand-pink" />
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
                            <div className="flex justify-between items-center bg-brand-pink/5 dark:bg-brand-pink/10 p-4 rounded-xl border border-brand-pink/20">
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
                            {detailSheet.paymentStatus !== 'paid' && (
                                <button
                                    onClick={() => { setDetailSheet(null); handleCobrar(detailSheet) }}
                                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-pink hover:opacity-90 shadow-lg shadow-brand-pink/20 transition-all flex items-center gap-2"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Registrar Pago
                                </button>
                            )}
                            <button
                                onClick={() => setDetailSheet(null)}
                                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
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

// ─── Universal Payment Sheet Component ───────────────────────────────
function UniversalPaymentSheet({
    order,
    onClose,
    onSuccess
}: {
    order: GroupedOrder
    onClose: () => void
    onSuccess: () => void
}) {
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'nequi' | 'daviplata' | 'card' | 'transfer'>('cash')
    const [cashAmount, setCashAmount] = useState<string>('')
    const [referenceNumber, setReferenceNumber] = useState<string>('')
    const [isProcessing, setIsProcessing] = useState(false)

    const totalToPay = order.total || 0
    const numericCashAmount = parseFloat(cashAmount) || 0
    const changeGiven = Math.max(0, numericCashAmount - totalToPay)

    const handleConfirm = async () => {
        setIsProcessing(true)
        try {
            const result = await processOrderPayment({
                targetId: order.id,
                targetType: order.type,
                paymentMethod,
                referenceNumber: referenceNumber.trim() || undefined,
                amountPaid: paymentMethod === 'cash' ? numericCashAmount : totalToPay,
                changeGiven: paymentMethod === 'cash' ? changeGiven : 0
            })

            if (result.success) {
                toast.success(`Pago de $${totalToPay.toLocaleString('es-CO')} registrado exitosamente`)
                onSuccess()
            } else {
                toast.error("Error al registrar pago: " + result.error)
            }
        } catch (e: any) {
            toast.error("Error inesperado: " + e.message)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Contextual */}
                <div className="relative bg-gradient-to-br from-brand-pink/10 via-brand-pink/5 to-transparent dark:from-brand-pink/20 dark:via-brand-pink/10 p-6 border-b border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 dark:bg-zinc-800/80 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors shadow-sm"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-brand-pink/10 dark:bg-brand-pink/20 flex items-center justify-center text-brand-pink">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {order.restoMode === 'dine_in' && `Cobrar Mesa ${order.tableIdentifier || ''}`}
                                {order.restoMode === 'delivery' && `Cobrar Domicilio · ${order.clientName}`}
                                {order.restoMode === 'pickup' && `Cobrar Recoger · ${order.clientName}`}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">
                                {order.restoMode === 'dine_in' ? `${order.roundCount} rondas` : order.deliveryAddress || 'Retiro en local'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Financial Summary Card */}
                    <div className="bg-brand-pink/5 dark:bg-brand-pink/10 rounded-2xl p-5 border border-brand-pink/20">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase font-semibold tracking-wider">Total a cobrar</p>
                                <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">
                                    ${totalToPay.toLocaleString('es-CO')}
                                </p>
                            </div>
                            {order.tipAmount > 0 && (
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase font-semibold">Propina</p>
                                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        +${order.tipAmount.toLocaleString('es-CO')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Method Selector Tabs */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Método de Recaudo</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                                    paymentMethod === 'cash' 
                                        ? 'bg-brand-pink text-white border-brand-pink shadow-md shadow-brand-pink/20' 
                                        : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                                }`}
                            >
                                <Wallet className="w-5 h-5" />
                                💵 Efectivo
                            </button>
                            <button
                                onClick={() => setPaymentMethod('nequi')}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                                    paymentMethod === 'nequi' 
                                        ? 'bg-brand-pink text-white border-brand-pink shadow-md shadow-brand-pink/20' 
                                        : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                                }`}
                            >
                                <Smartphone className="w-5 h-5" />
                                📱 Transferencia
                            </button>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                                    paymentMethod === 'card' 
                                        ? 'bg-brand-pink text-white border-brand-pink shadow-md shadow-brand-pink/20' 
                                        : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                                }`}
                            >
                                <CreditCard className="w-5 h-5" />
                                💳 Tarjeta
                            </button>
                        </div>
                    </div>

                    {/* Method Specific Controls */}
                    {paymentMethod === 'cash' && (
                        <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300">
                                Monto Recibido del Cliente ($)
                            </label>
                            <div className="flex gap-2">
                                {[totalToPay, 20000, 50000, 100000].filter(val => val >= totalToPay).map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setCashAmount(preset.toString())}
                                        className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-brand-pink transition-colors"
                                    >
                                        ${preset.toLocaleString('es-CO')}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                value={cashAmount}
                                onChange={(e) => setCashAmount(e.target.value)}
                                placeholder="Escribe el monto recibido..."
                                className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-pink"
                            />
                            {numericCashAmount > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                    <span className="text-xs font-bold text-gray-500">Cambio a Entregar:</span>
                                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                        ${changeGiven.toLocaleString('es-CO')}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {(paymentMethod === 'nequi' || paymentMethod === 'transfer' || paymentMethod === 'daviplata') && (
                        <div className="space-y-2 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <Hash className="w-4 h-4 text-brand-pink" />
                                N° de Comprobante / Referencia Bancaria
                            </label>
                            <input
                                type="text"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                placeholder="Ej: 948271038"
                                className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-pink"
                            />
                        </div>
                    )}

                    {paymentMethod === 'card' && (
                        <div className="space-y-2 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <CreditCard className="w-4 h-4 text-brand-pink" />
                                N° de Voucher / Comprobante de Datáfono (opcional)
                            </label>
                            <input
                                type="text"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                placeholder="Ej: 102938"
                                className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-pink"
                            />
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-5 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="flex-[2] px-4 py-3 rounded-xl text-sm font-bold text-white bg-brand-pink hover:opacity-90 active:scale-[0.98] disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-pink/30"
                    >
                        {isProcessing ? (
                            <><Loader2 className="w-4 h-4 animate-spin text-white" /> Procesando...</>
                        ) : (
                            <><CheckCircle2 className="w-4 h-4 text-white" /> Confirmar Pago (${totalToPay.toLocaleString('es-CO')})</>
                        )}
                    </button>
                </div>
            </div>
        </div>
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
                    <span className="w-6 h-6 rounded-full bg-brand-pink/10 text-brand-pink text-xs font-bold flex items-center justify-center">
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

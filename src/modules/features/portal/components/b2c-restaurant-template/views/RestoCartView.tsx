"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRestoCart } from "@/hooks/use-resto-cart"
import { Button } from "@/components/ui/button"
import { Trash2, Send, AlertTriangle } from "lucide-react"
import { QuantitySelector } from "../components/QuantitySelector"
import { dispatchRestoOrder, validateCartItems } from "../actions/checkout-actions"
import { sendDineInRound } from "../actions/resto-session-actions"
import { usePortalThemeContext } from "@/modules/features/portal/theme/portal-theme-provider"
import { evaluateStoreStatus } from "@/modules/features/portal/theme/utils/schedule-evaluator"

export function RestoCartView({ orgId, primaryColor }: { orgId: string, primaryColor?: string }) {
    const router = useRouter()
    const { items, updateQuantity, removeItem, getTotal, clearCart, customerProfile, setCustomerProfile, addRecentOrder, setItems, orderMode, setOrderMode, tableId, tableIdentifier, sessionId } = useRestoCart()

    const { config } = usePortalThemeContext()
    const storeStatus = evaluateStoreStatus(config)

    const [customerName, setCustomerName] = useState(customerProfile?.name || "")
    const [customerPhone, setCustomerPhone] = useState(customerProfile?.phone || "")
    const [address, setAddress] = useState(customerProfile?.address || "")
    const [notes, setNotes] = useState("")
    const [tipPercent, setTipPercent] = useState<number>(0)
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')
    
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")
    const [validationMessages, setValidationMessages] = useState<string[]>([])
    const [isValidating, setIsValidating] = useState(false)

    const isClosedOrPaused = !storeStatus.isOpen && orderMode !== 'dine-in'

    const subtotal = getTotal()
    const tipAmount = Math.round(subtotal * tipPercent)
    const finalTotal = subtotal + tipAmount

    // Sincronizar cambios locales al store principal
    useEffect(() => {
        setCustomerProfile({ name: customerName, phone: customerPhone, address })
    }, [customerName, customerPhone, address, setCustomerProfile])

    // Validar el carrito contra la base de datos al cargar la vista
    useEffect(() => {
        async function validate() {
            if (items.length === 0) return
            setIsValidating(true)
            try {
                const { valid, items: validatedItems, messages } = await validateCartItems(items, orgId)
                if (!valid) {
                    setValidationMessages(messages)
                    setItems(validatedItems)
                } else {
                    setValidationMessages([])
                }
            } catch (error) {
                console.error("Cart validation error:", error)
            } finally {
                setIsValidating(false)
            }
        }
        validate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault()
        if (items.length === 0 || isClosedOrPaused) return

        setIsSubmitting(true)

        if (orderMode === 'dine-in') {
            if (!sessionId) {
                alert("Error: No hay sesión de mesa activa.")
                setIsSubmitting(false)
                return
            }

            const res = await sendDineInRound({
                orgId,
                sessionId,
                items,
                customerName,
                notes
            })
            
            setIsSubmitting(false)

            if (res.success) {
                clearCart()
                window.dispatchEvent(new CustomEvent('resto-navigate', { detail: 'orders' }))
            } else {
                alert("Hubo un error enviando tu pedido a cocina: " + res.error)
            }

            return
        }

        // Delivery / Pickup flow
        const payload: any = {
            orgId,
            items,
            customerName,
            customerPhone,
            deliveryAddress: orderMode === 'delivery' ? address : undefined,
            notes,
            restoMode: orderMode,
            tipAmount,
            paymentMethod,
            tableId: null,
            sessionId: null
        }

        const res = await dispatchRestoOrder(payload)
        setIsSubmitting(false)

        if (res.success && res.messageId) {
            addRecentOrder(res.messageId)

            if (res.portalToken) {
                router.push(`/portal/${res.portalToken}?orderSuccess=true`)
            } else {
                clearCart()
                setSuccessMessage("¡Tu pedido ha sido enviado a la cocina! Te avisaremos vía WhatsApp.")
            }
        } else {
            alert("Hubo un error enviando tu pedido: " + res.error)
        }
    }

    if (successMessage) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full mt-20">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <Send className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">¡Pedido Confirmado!</h2>
                <p className="text-gray-600">{successMessage}</p>
                <Button
                    variant="outline"
                    className="mt-6 text-primary border-primary"
                    onClick={() => setSuccessMessage("")}
                >
                    Hacer otro pedido
                </Button>
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full mt-20">
                <div className="w-24 h-24 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <span className="text-4xl">🛒</span>
                </div>
                <h2 className="text-xl font-bold mb-2">Tu carrito está vacío</h2>
                <p className="text-gray-500 text-sm">Agrega algunos platillos deliciosos desde el menú.</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleCheckout} className="flex flex-col w-full h-full p-4 pb-24 space-y-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold">Tu Pedido</h1>

            {/* Closed / Emergency Paused Warning */}
            {isClosedOrPaused && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex gap-3.5 text-xs text-rose-700 dark:text-rose-300 shadow-md">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
                    <div className="flex flex-col space-y-1">
                        <span className="font-black uppercase tracking-wider text-[11px]">{storeStatus.statusBadgeText}</span>
                        <span className="font-medium leading-relaxed">{storeStatus.message}</span>
                    </div>
                </div>
            )}

            {validationMessages.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-4 flex gap-3 text-sm text-yellow-800 dark:text-yellow-200">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col space-y-1">
                        <span className="font-semibold">Actualizamos tu carrito</span>
                        <ul className="list-disc pl-4 opacity-90">
                            {validationMessages.map((msg, i) => <li key={i}>{msg}</li>)}
                        </ul>
                    </div>
                </div>
            )}

            <div className="flex flex-col space-y-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-zinc-800 last:border-0">
                        <div className="flex flex-col flex-1 pr-4">
                            <span className="font-semibold text-sm">{item.title}</span>
                            
                            {/* Render Modifiers */}
                            {item.modifiers && item.modifiers.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                    {item.modifiers.map((mod, idx) => (
                                        <div key={idx} className="text-[11px] text-gray-500 leading-tight">
                                            + {mod.optionName} {mod.price > 0 && `(+$${mod.price.toLocaleString('es-CO')})`}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Render Notes */}
                            {item.notes && (
                                <div className="text-[11px] text-orange-500/80 italic mt-1 leading-tight">
                                    Nota: {item.notes}
                                </div>
                            )}

                            <span className="text-primary font-bold text-sm text-[13px] mt-1">
                                ${(item.price * item.quantity).toLocaleString('es-CO')}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <QuantitySelector
                                quantity={item.quantity}
                                onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
                                onDecrement={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                size="sm"
                                primaryColor={primaryColor}
                            />
                            <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 p-1">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Ocultar Tipo de Pedido si la sesión de mesa está activa */}
            {!sessionId && (
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
                    <h3 className="font-bold border-b pb-2">Tipo de Pedido</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {['delivery', 'pickup'].map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setOrderMode(mode as any)}
                                className={`p-2 rounded-xl text-sm font-semibold border transition-all ${orderMode === mode ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-transparent text-gray-500'}`}
                            >
                                {mode === 'delivery' ? 'Domicilio' : 'Para Recoger'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Ocultar datos obligatorios si es Dine-in */}
            {orderMode !== 'dine-in' ? (
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
                    <h3 className="font-bold border-b pb-2 mt-4">Tus Datos</h3>

                    <input
                        required type="text" placeholder="Tu Nombre"
                        value={customerName} onChange={e => setCustomerName(e.target.value)}
                        className="w-full h-12 px-3 rounded-lg bg-gray-50 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-primary/20"
                    />

                    <input
                        required type="tel" placeholder="Tu WhatsApp (ej. 3001234567)"
                        value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/[^\d+\-\s]/g, ''))}
                        className="w-full h-12 px-3 rounded-lg bg-gray-50 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-primary/20"
                    />

                    {orderMode === 'delivery' && (
                        <input
                            required type="text" placeholder="Dirección de Entrega"
                            value={address} onChange={e => setAddress(e.target.value)}
                            className="w-full h-12 px-3 rounded-lg bg-gray-50 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    )}
                </div>
            ) : (
                 <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
                    <h3 className="font-bold border-b pb-2">Tu Nombre (Opcional)</h3>
                    <input
                        type="text" placeholder="Para llamarte por tu nombre..."
                        value={customerName} onChange={e => setCustomerName(e.target.value)}
                        className="w-full h-12 px-3 rounded-lg bg-gray-50 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-primary/20"
                    />
                 </div>
            )}

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
                <textarea
                    placeholder="Notas adicionales para el pedido (opcional)"
                    value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full rounded-lg bg-gray-50 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-primary/20 p-3"
                    rows={2}
                />
            </div>

            {orderMode !== 'dine-in' && (
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
                    <h3 className="font-bold border-b pb-2 flex justify-between">
                        <span>Propina 💝</span>
                        <span className="text-gray-400 font-normal">Subtotal: ${subtotal.toLocaleString('es-CO')}</span>
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                        {[0, 0.1, 0.15, 0.2].map((percent) => (
                            <button
                                key={percent}
                                type="button"
                                onClick={() => setTipPercent(percent)}
                                className={`p-2 rounded-xl text-sm font-semibold border transition-all ${tipPercent === percent ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-transparent text-gray-500'}`}
                            >
                                {percent === 0 ? 'Nada' : `${percent * 100}%`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {orderMode !== 'dine-in' && (
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
                    <h3 className="font-bold border-b pb-2">Método de Pago</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {['cash', 'transfer'].map((method) => (
                            <button
                                key={method}
                                type="button"
                                onClick={() => setPaymentMethod(method as any)}
                                className={`p-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${paymentMethod === method ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-transparent text-gray-500'}`}
                            >
                                {method === 'cash' ? '💵 Efectivo' : '🏦 Transferencia'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <Button
                type="submit"
                disabled={isSubmitting || isValidating || isClosedOrPaused}
                className="w-full h-14 rounded-2xl text-lg font-bold sticky bottom-20 shadow-xl shadow-primary/20 disabled:opacity-50"
                style={primaryColor && !isClosedOrPaused ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
            >
                {isClosedOrPaused ? `Establecimiento ${storeStatus.statusBadgeText}` : isValidating ? "Validando disponibilidad..." : isSubmitting ? "Enviando..." : orderMode === 'dine-in' ? `Pedir a la Cocina • $${finalTotal.toLocaleString('es-CO')}` : `Pedir por $${finalTotal.toLocaleString('es-CO')}`}
            </Button>
        </form>
    )
}

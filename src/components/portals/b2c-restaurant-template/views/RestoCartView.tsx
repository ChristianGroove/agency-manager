"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useRestoCart } from "@/hooks/use-resto-cart"
import { Button } from "@/components/ui/button"
import { Trash2, Send } from "lucide-react"
import { QuantitySelector } from "../components/QuantitySelector"
import { dispatchRestoOrder } from "../actions/checkout-actions"

export function RestoCartView({ orgId, primaryColor }: { orgId: string, primaryColor?: string }) {
    const router = useRouter()
    const { items, updateQuantity, removeItem, getTotal, clearCart, customerProfile, setCustomerProfile, addRecentOrder } = useRestoCart()

    const [customerName, setCustomerName] = useState(customerProfile?.name || "")
    const [customerPhone, setCustomerPhone] = useState(customerProfile?.phone || "")
    const [address, setAddress] = useState(customerProfile?.address || "")
    const [notes, setNotes] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")

    // Sincronizar cambios locales al store principal para que no se pierdan si se refresca la página 
    // antes de hacer el pago.
    React.useEffect(() => {
        setCustomerProfile({ name: customerName, phone: customerPhone, address })
    }, [customerName, customerPhone, address, setCustomerProfile])

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault()
        if (items.length === 0) return

        setIsSubmitting(true)

        const payload = {
            orgId,
            items,
            total: getTotal(),
            customerName,
            customerPhone,
            deliveryAddress: address,
            notes
        }

        const res = await dispatchRestoOrder(payload)
        setIsSubmitting(false)

        if (res.success && res.messageId) {
            addRecentOrder(res.messageId) // Guarda localmente el Tracker ID del Pedido

            // Si el backend nos devolvió un token de portal (elevación de Guest a Cliente)
            // Redirigimos para que el usuario ya vea su portal persistente con historial real.
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
        <form onSubmit={handleCheckout} className="flex flex-col w-full h-full p-4 pb-24 space-y-6">
            <h1 className="text-2xl font-bold">Tu Pedido</h1>

            <div className="flex flex-col space-y-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-zinc-800 last:border-0">
                        <div className="flex flex-col flex-1">
                            <span className="font-semibold text-sm">{item.title}</span>
                            <span className="text-primary font-bold text-sm text-[13px]">
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

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
                <h3 className="font-bold border-b pb-2">Datos de Entrega</h3>

                <input
                    required type="text" placeholder="Tu Nombre"
                    value={customerName} onChange={e => setCustomerName(e.target.value)}
                    className="w-full h-12 px-3 rounded-lg bg-gray-50 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-primary/20"
                />

                <input
                    required type="tel" placeholder="Tu WhatsApp (ej. 3001234567)"
                    value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full h-12 px-3 rounded-lg bg-gray-50 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-primary/20"
                />

                <input
                    required type="text" placeholder="Dirección de Entrega"
                    value={address} onChange={e => setAddress(e.target.value)}
                    className="w-full h-12 px-3 rounded-lg bg-gray-50 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-primary/20"
                />

                <textarea
                    placeholder="Notas para la cocina (opcional)"
                    value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full rounded-lg bg-gray-50 dark:bg-zinc-800 border-none outline-none focus:ring-2 focus:ring-primary/20 p-3"
                    rows={2}
                />
            </div>

            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl text-lg font-bold sticky bottom-20 shadow-xl"
            >
                {isSubmitting ? "Enviando..." : `Pedir por $${getTotal().toLocaleString('es-CO')}`}
            </Button>
        </form>
    )
}

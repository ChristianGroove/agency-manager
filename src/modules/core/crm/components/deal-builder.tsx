"use client"

import { useState, useEffect } from "react"
import { Plus, Minus, Type, Trash2, ShoppingCart, Loader2, Package, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { getDealCart, addToCart, removeCartItem, updateCartItem, sendInteractiveQuote, DealCart } from "../deal-actions"
import { ProductSelector } from "./product-selector"

interface DealBuilderProps {
    leadId: string
    conversationId: string
    onCartChange?: () => void
}

export function DealBuilder({ leadId, conversationId, onCartChange }: DealBuilderProps) {
    const [cart, setCart] = useState<DealCart | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Initial Load
    useEffect(() => {
        loadCart()
    }, [leadId])

    const loadCart = async () => {
        setLoading(true)
        setError(null)
        const res = await getDealCart(leadId)
        if (res.success && res.cart) {
            setCart(res.cart)
        } else {
            setError(res.error || "Error desconocido")
        }
        setLoading(false)
    }

    // Refresh without full loading spinner
    const refreshCart = async () => {
        const res = await getDealCart(leadId)
        if (res.success && res.cart) {
            setCart(res.cart)
            onCartChange?.()
        }
    }

    const handleAddItem = async (product: any) => {
        if (!cart) return

        // Optimistic UI could go here, but let's stick to reliable first
        const res = await addToCart(cart.id, product, 1)
        if (res.success) {
            toast.success("Producto agregado")
            refreshCart()
        } else {
            toast.error("Error al agregar")
        }
    }

    const handleRemove = async (itemId: string) => {
        const res = await removeCartItem(itemId)
        if (res.success) refreshCart()
    }

    const handleUpdateQty = async (itemId: string, currentQty: number, delta: number) => {
        const newQty = currentQty + delta
        if (newQty < 1) return handleRemove(itemId)

        const res = await updateCartItem(itemId, newQty)
        if (res.success) refreshCart()
    }

    const handleSendInteractive = async () => {
        if (!cart || !cart.items || cart.items.length === 0) return

        // Optimistic UI interaction (optional: set sending state)
        toast.promise(sendInteractiveQuote(cart.id, conversationId), {
            loading: 'Enviando cotización interactiva...',
            success: 'Cotización enviada con éxito 🚀',
            error: (err) => `Error al enviar: ${err}`
        })
    }

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>

    if (error) return <div className="p-4 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">Error: {error}</div>

    if (!cart) return <div className="p-4 text-sm text-red-500">No se pudo iniciar el carrito</div>

    const items = cart.items || []
    const hasItems = items.length > 0

    return (
        <div className="space-y-3">
            {/* Header / Cart Summary */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Productos</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-muted-foreground"
                        onClick={handleSendInteractive}
                        disabled={!hasItems}
                        title={hasItems ? "Enviar Cotización Interactiva" : "Agrega productos para enviar"}
                    >
                        <ArrowUpRight className="h-4 w-4" />
                    </Button>
                    <Badge variant="outline" className="font-mono tabular-nums">
                        {items.length} items
                    </Badge>
                </div>
            </div>

            {/* Item List */}
            {hasItems ? (
                <div className="space-y-2">
                    {items.map(item => (
                        <div key={item.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 group">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                    ${item.unit_price} x {item.quantity}
                                </p>
                            </div>

                            <div className="flex items-center gap-1">
                                <div className="flex items-center border rounded-md bg-background h-6">
                                    <button
                                        onClick={() => handleUpdateQty(item.id, item.quantity, -1)}
                                        className="px-1.5 hover:bg-muted h-full flex items-center justify-center rounded-l-md"
                                    >
                                        <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="w-6 text-center text-[10px] font-mono border-x h-full flex items-center justify-center">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => handleUpdateQty(item.id, item.quantity, 1)}
                                        className="px-1.5 hover:bg-muted h-full flex items-center justify-center rounded-r-md"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleRemove(item.id)}
                                    className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-between items-center pt-2 px-1">
                        <span className="text-xs font-semibold">Total Estimado</span>
                        <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            ${cart.total_amount?.toLocaleString()}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="py-6 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20">
                    <Package className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Carrito vacío</p>
                </div>
            )}

            {/* Add Item Button (Combobox) */}
            <ProductSelector
                onSelect={(product) => handleAddItem(product)}
            />
        </div>
    )
}

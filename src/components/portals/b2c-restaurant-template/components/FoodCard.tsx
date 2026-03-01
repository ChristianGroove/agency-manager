import React from "react"
import { useRestoCart } from "@/hooks/use-resto-cart"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuantitySelector } from "./QuantitySelector"

export interface FoodCardProps {
    item: {
        id: string
        name: string
        description?: string
        price?: number
        base_price?: number
        currency?: string
        images?: string[]
        image_url?: string    // From service_catalog universal type
        has_variants?: boolean
    }
    orgId: string
    primaryColor?: string
}

export function FoodCard({ item, orgId, primaryColor }: FoodCardProps) {
    const { items: cartItems, addItem, updateQuantity, removeItem, setOrgId, orgId: currentCartOrgId, clearCart } = useRestoCart()

    // Find if item is already in cart
    const cartItem = cartItems.find(i => i.catalogItemId === item.id)
    const quantity = cartItem?.quantity || 0

    // Manejar incompatibilidad de columnas entre catálogo universal y B2C
    const itemPrice = item.price || item.base_price || 0
    const itemImage = item.image_url || item.images?.[0] || null

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation()
        // Prevent mixing items from different restaurants
        if (currentCartOrgId && currentCartOrgId !== orgId) {
            if (confirm("Tienes productos de otro restaurante en el carrito. ¿Deseas vaciarlo e iniciar uno nuevo aquí?")) {
                clearCart()
            } else {
                return
            }
        }

        setOrgId(orgId)
        addItem({
            catalogItemId: item.id,
            title: item.name,
            price: itemPrice,
            quantity: 1,
            image: itemImage || undefined
        })
    }

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!cartItem) return

        if (cartItem.quantity > 1) {
            updateQuantity(cartItem.id, cartItem.quantity - 1)
        } else {
            removeItem(cartItem.id)
        }
    }

    const priceFormatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: item.currency || 'COP',
        maximumFractionDigits: 0
    }).format(itemPrice)

    // Highlight style if selected
    const isSelected = quantity > 0
    const borderStyle = isSelected && primaryColor
        ? { border: `2px solid ${primaryColor}`, boxShadow: `0 4px 12px ${primaryColor}20` }
        : {}

    return (
        <div
            className={`flex flex-row bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-3 gap-3 overflow-hidden h-36 relative transition-all hover:shadow-md ${isSelected ? 'scale-[1.01]' : ''}`}
            style={borderStyle}
        >
            {/* Imagen Plegada */}
            <div className="w-28 h-28 bg-gray-100 dark:bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0 relative">
                {itemImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={itemImage}
                        alt={item.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <span className="text-xs">Sin Foto</span>
                    </div>
                )}
            </div>

            {/* Detalles */}
            <div className="flex flex-col flex-1 py-0.5 justify-between">
                <div className="space-y-1">
                    <h3 className="font-bold text-[16px] leading-tight text-gray-900 dark:text-gray-100 line-clamp-1">
                        {item.name}
                    </h3>
                    {item.description && (
                        <p className="text-[11px] text-gray-400 line-clamp-2 leading-tight">
                            {item.description}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <span className="font-extrabold text-gray-950 dark:text-white text-[17px]">
                        {priceFormatted}
                    </span>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                        {quantity > 0 ? (
                            <QuantitySelector
                                quantity={quantity}
                                onIncrement={handleAdd}
                                onDecrement={handleRemove}
                                size="sm"
                                primaryColor={primaryColor}
                            />
                        ) : (
                            <Button
                                onClick={handleAdd}
                                size="icon"
                                className="h-8 w-8 rounded-full shadow-lg hover:bg-primary/90 transition-all active:scale-95 text-white"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

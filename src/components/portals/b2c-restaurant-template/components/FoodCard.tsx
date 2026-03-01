import React from "react"
import { useRestoCart } from "@/hooks/use-resto-cart"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

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
}

export function FoodCard({ item, orgId }: FoodCardProps) {
    const { addItem, setOrgId, orgId: currentCartOrgId, clearCart } = useRestoCart()

    // Manejar incompatibilidad de columnas entre catálogo universal y B2C
    const itemPrice = item.price || item.base_price || 0
    const itemImage = item.image_url || item.images?.[0] || null

    const handleAdd = () => {
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

    const priceFormatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: item.currency || 'COP',
        maximumFractionDigits: 0
    }).format(itemPrice)

    return (
        <div className="flex flex-row bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-3 gap-3 overflow-hidden h-36 relative">
            {/* Imagen Plegada */}
            <div className="w-28 h-full bg-gray-100 dark:bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 relative">
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
            <div className="flex flex-col flex-1 py-1 pr-1 justify-between">
                <div>
                    <h3 className="font-bold text-[15px] leading-tight text-gray-900 dark:text-gray-100 line-clamp-2">
                        {item.name}
                    </h3>
                    {item.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                        </p>
                    )}
                </div>

                <div className="flex items-end justify-between mt-2">
                    <span className="font-bold text-gray-900 dark:text-white text-base">
                        {priceFormatted}
                    </span>

                    <Button
                        onClick={handleAdd}
                        size="icon"
                        className="h-8 w-8 rounded-full rounded-tl-xl rounded-br-2xl absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

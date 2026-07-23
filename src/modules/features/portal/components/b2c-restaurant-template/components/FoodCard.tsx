import React from "react"
import { useRestoCart } from "@/hooks/use-resto-cart"
import { Plus, Flame, Leaf, WheatOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuantitySelector } from "./QuantitySelector"
import { RestoMenuItem } from "@/types"
import { usePortalThemeContext } from "@/modules/features/portal/theme/portal-theme-provider"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface FoodCardProps {
    item: RestoMenuItem
    orgId: string
    primaryColor?: string
    onSelect?: () => void
}

const formatAvailableDays = (days?: number[]) => {
    if (!days || days.length >= 7) return null;
    const isWeekend = days.length === 2 && days.includes(0) && days.includes(6);
    if (isWeekend) return 'Fines de semana';
    const isWeekdays = days.length === 5 && !days.includes(0) && !days.includes(6);
    if (isWeekdays) return 'Lunes a Viernes';
    const dayMap: Record<number, string> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo' };
    const sorted = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
    const names = sorted.map(d => dayMap[d]);
    
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} y ${names[1]}`;
    
    const last = names.pop();
    return `${names.join(', ')} y ${last}`;
}

export function FoodCard({ item, orgId, primaryColor, onSelect }: FoodCardProps) {
    const { items: cartItems, addItem, updateQuantity, removeItem, setOrgId, orgId: currentCartOrgId, clearCart } = useRestoCart()
    const { config, cardClasses, isGourmet } = usePortalThemeContext()
    const effectivePrimaryColor = primaryColor || config?.primary_color || '#F205E2'

    // Find ALL cart items for this menu item
    const matchingCartItems = cartItems.filter(i => i.menuItemId === item.id)
    const quantity = matchingCartItems.reduce((sum, i) => sum + i.quantity, 0)

    const itemPrice = item.metadata?.promotional_price || item.base_price || 0
    const itemImage = item.image_url || null

    const today = new Date().getDay();
    const isAvailableToday = item.metadata?.available_days ? item.metadata.available_days.includes(today) : true;

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isAvailableToday || !item.is_available) return;

        // If item has modifiers, open the modal instead
        if (item.modifiers && item.modifiers.length > 0) {
            if (onSelect) onSelect()
            return
        }

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
            menuItemId: item.id,
            title: item.name,
            price: itemPrice,
            quantity: 1,
            image: itemImage || undefined
        })
    }

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (matchingCartItems.length === 0) return

        // Remove from the most recently added config
        const cartItem = matchingCartItems[matchingCartItems.length - 1]

        if (cartItem.quantity > 1) {
            updateQuantity(cartItem.id, cartItem.quantity - 1)
        } else {
            removeItem(cartItem.id)
        }
    }

    const priceFormatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(itemPrice)

    const originalPriceFormatted = item.metadata?.promotional_price ? new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(item.base_price) : null

    // Highlight style if selected
    const isSelected = quantity > 0
    const borderStyle = isSelected && effectivePrimaryColor
        ? { border: `2px solid ${effectivePrimaryColor}`, boxShadow: `0 4px 12px ${effectivePrimaryColor}20` }
        : {}

    return (
        <div
            className={cn(
                "flex flex-row p-3 gap-3 overflow-hidden h-36 relative transition-all cursor-pointer",
                cardClasses,
                isSelected && 'scale-[1.01]',
                (!item.is_available || !isAvailableToday) && 'opacity-60 grayscale-[0.5]'
            )}
            style={borderStyle}
            onClick={onSelect}
        >
            {/* Promo Badge */}
            {item.metadata?.promo_badge && (
                <div className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded-br-lg z-10">
                    {item.metadata.promo_badge}
                </div>
            )}

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
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-xs">Sin Foto</span>
                    </div>
                )}
                {!item.is_available ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px] z-20">
                        <span className="text-white text-xs font-bold uppercase tracking-wider">Agotado</span>
                    </div>
                ) : !isAvailableToday ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px] z-20">
                        <span className="text-white text-[10px] text-center px-1 font-bold uppercase tracking-wider leading-tight">Hoy No</span>
                    </div>
                ) : null}
            </div>

            {/* Detalles */}
            <div className="flex flex-col flex-1 py-0.5 justify-between min-w-0">
                <div className="space-y-1">
                    <div className="flex justify-between items-start">
                        <h3 className={cn("font-bold text-[15px] sm:text-[16px] leading-tight line-clamp-1", isGourmet ? "text-amber-50 font-serif" : "text-gray-900 dark:text-gray-100")}>
                            {item.name}
                        </h3>
                    </div>
                    {item.description && (
                        <p className={cn("text-[11px] line-clamp-2 leading-tight", isGourmet ? "text-amber-200/70 font-serif italic" : "text-gray-500 dark:text-zinc-400")}>
                            {item.description}
                        </p>
                    )}
                    
                    {/* Diet Tags */}
                    <div className="flex flex-wrap gap-1 mt-1">
                        {item.metadata?.is_vegan && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                🌱 Vegano
                            </span>
                        )}
                        {item.metadata?.is_spicy && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                🌶️ Picante
                            </span>
                        )}
                        {item.metadata?.is_gluten_free && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                🌾 Sin Gluten
                            </span>
                        )}
                        {item.metadata?.alcohol_abv ? <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500">{item.metadata.alcohol_abv}% ALC</span> : null}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col">
                        <span className={cn("font-extrabold text-[16px] sm:text-[17px]", isGourmet ? "text-amber-400 font-serif" : "text-gray-950 dark:text-white")}>
                            {priceFormatted}
                        </span>
                        {originalPriceFormatted && (
                            <span className="text-[10px] text-gray-400 line-through">
                                {originalPriceFormatted}
                            </span>
                        )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                        {!isAvailableToday ? (
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 whitespace-nowrap">
                                Disponible {formatAvailableDays(item.metadata?.available_days)}
                            </span>
                        ) : quantity > 0 ? (
                            <QuantitySelector
                                quantity={quantity}
                                onIncrement={handleAdd}
                                onDecrement={handleRemove}
                                size="sm"
                                primaryColor={effectivePrimaryColor}
                            />
                        ) : (
                            <Button
                                onClick={handleAdd}
                                size="icon"
                                className="h-8 w-8 rounded-full shadow-lg hover:bg-primary/90 transition-all active:scale-95 text-white"
                                style={{ backgroundColor: effectivePrimaryColor }}
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

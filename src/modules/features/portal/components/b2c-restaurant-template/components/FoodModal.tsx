"use client"

import React, { useState, useMemo } from "react"
import { RestoMenuItem } from "@/types"
import { useRestoCart, CartItemModifier } from "@/hooks/use-resto-cart"
import { X, Plus, Minus, AlertCircle } from "lucide-react"
import { usePortalThemeContext } from "@/modules/features/portal/theme/portal-theme-provider"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface FoodModalProps {
    item: RestoMenuItem
    orgId: string
    primaryColor?: string
    onClose: () => void
}

export function FoodModal({ item, orgId, primaryColor: explicitPrimaryColor, onClose }: FoodModalProps) {
    const { addItem, setOrgId, orgId: currentCartOrgId, clearCart } = useRestoCart()
    const { config, isGourmet } = usePortalThemeContext()

    const pColor = explicitPrimaryColor || config?.primary_color || '#4f46e5'
    
    const [quantity, setQuantity] = useState(1)
    const [notes, setNotes] = useState("")
    
    // selectedMods format: { [groupId]: [optionId, optionId] }
    const [selectedMods, setSelectedMods] = useState<Record<string, string[]>>({})

    const itemBasePrice = item.metadata?.promotional_price || item.base_price || 0

    // Validate if required selections are met
    const { isValid, errors } = useMemo(() => {
        let valid = true
        const errs: Record<string, string> = {}

        item.modifiers?.forEach(group => {
            const selected = selectedMods[group.id] || []
            if (group.required && selected.length < group.min_selections) {
                valid = false
                errs[group.id] = `Selecciona al menos ${group.min_selections} opción(es)`
            }
        })

        return { isValid: valid, errors: errs }
    }, [item.modifiers, selectedMods])

    const currentPrice = useMemo(() => {
        let extra = 0
        Object.entries(selectedMods).forEach(([groupId, optionIds]) => {
            const group = item.modifiers?.find(g => g.id === groupId)
            if (group) {
                optionIds.forEach(optId => {
                    const opt = group.options.find(o => o.id === optId)
                    if (opt) extra += opt.price_modifier
                })
            }
        })
        return (itemBasePrice + extra) * quantity
    }, [itemBasePrice, selectedMods, quantity, item.modifiers])

    const handleToggleOption = (groupId: string, optionId: string, max: number) => {
        setSelectedMods(prev => {
            const current = prev[groupId] || []
            if (current.includes(optionId)) {
                return { ...prev, [groupId]: current.filter(id => id !== optionId) }
            }
            if (max === 1) {
                return { ...prev, [groupId]: [optionId] } // replace
            }
            if (current.length >= max) {
                return prev // can't add more
            }
            return { ...prev, [groupId]: [...current, optionId] }
        })
    }

    const handleAddToCart = () => {
        if (!isValid) return

        if (currentCartOrgId && currentCartOrgId !== orgId) {
            if (confirm("Tienes productos de otro restaurante en el carrito. ¿Deseas vaciarlo e iniciar uno nuevo aquí?")) {
                clearCart()
            } else {
                return
            }
        }

        const modsToAdd: CartItemModifier[] = []
        let finalPrice = itemBasePrice

        Object.entries(selectedMods).forEach(([groupId, optionIds]) => {
            const group = item.modifiers?.find(g => g.id === groupId)
            if (group) {
                optionIds.forEach(optId => {
                    const opt = group.options.find(o => o.id === optId)
                    if (opt) {
                        modsToAdd.push({
                            groupName: group.name,
                            optionName: opt.name,
                            price: opt.price_modifier
                        })
                        finalPrice += opt.price_modifier
                    }
                })
            }
        })

        setOrgId(orgId)
        addItem({
            menuItemId: item.id,
            title: item.name,
            price: finalPrice,
            quantity,
            image: item.image_url || undefined,
            notes: notes.trim() || undefined,
            modifiers: modsToAdd.length > 0 ? modsToAdd : undefined
        })
        
        onClose()
    }

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/25 dark:bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className={cn(
                    "w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95 border transition-all",
                    isGourmet 
                        ? "bg-zinc-950 text-amber-50 border-amber-500/30" 
                        : "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-100 dark:border-zinc-800"
                )}
            >
                {/* Header Image & Close Button */}
                <div className="relative h-48 bg-gray-100 dark:bg-zinc-800 shrink-0">
                    {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            Sin foto
                        </div>
                    )}
                    
                    {/* Botón de Cerrar (X) Funcional */}
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                        }}
                        className="absolute top-4 right-4 z-30 p-2.5 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
                        title="Cerrar modal"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                        <h2 className="text-2xl font-black text-white">{item.name}</h2>
                        {item.description && <p className="text-white/80 text-sm line-clamp-2 mt-1">{item.description}</p>}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
                    {item.modifiers?.map(group => (
                        <div key={group.id} className="space-y-3">
                            <div className="flex items-baseline justify-between">
                                <h3 className={cn("font-bold", isGourmet ? "text-amber-400 font-serif" : "text-gray-900 dark:text-white")}>
                                    {group.name}
                                </h3>
                                <span className={cn(
                                    "text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider",
                                    group.required 
                                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                                        : "bg-gray-100 dark:bg-zinc-800 text-gray-500"
                                )}>
                                    {group.required ? 'Obligatorio' : 'Opcional'}
                                </span>
                            </div>
                            
                            {errors[group.id] && (
                                <div className="text-xs text-red-500 font-medium flex items-center gap-1.5 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {errors[group.id]}
                                </div>
                            )}

                            <div className="space-y-2">
                                {group.options.map(opt => {
                                    const isSelected = selectedMods[group.id]?.includes(opt.id)
                                    return (
                                        <label 
                                            key={opt.id} 
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer",
                                                isSelected 
                                                    ? "bg-primary/5 shadow-sm" 
                                                    : isGourmet 
                                                        ? "border-zinc-800 hover:border-amber-500/30" 
                                                        : "border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700"
                                            )}
                                            style={isSelected ? { borderColor: pColor, backgroundColor: `${pColor}12` } : {}}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0"
                                                    style={{
                                                        borderColor: isSelected ? pColor : (isGourmet ? '#52525b' : '#d1d5db'),
                                                        backgroundColor: isSelected ? pColor : 'transparent'
                                                    }}
                                                >
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                </div>
                                                <span className={cn("font-medium text-sm", isSelected ? "font-bold text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300")}>
                                                    {opt.name}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500">
                                                {opt.price_modifier > 0 ? `+$${opt.price_modifier.toLocaleString()}` : 'Gratis'}
                                            </span>
                                            <input 
                                                type={group.max_selections === 1 ? 'radio' : 'checkbox'} 
                                                name={`group-${group.id}`}
                                                className="hidden"
                                                checked={!!isSelected}
                                                onChange={() => handleToggleOption(group.id, opt.id, group.max_selections)}
                                            />
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="space-y-2 pt-2">
                        <h3 className={cn("font-bold text-sm", isGourmet ? "text-amber-400 font-serif" : "text-gray-900 dark:text-white")}>
                            Notas Especiales
                        </h3>
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej. Sin cebolla, aderezo aparte..."
                            className={cn(
                                "w-full border rounded-2xl p-3 text-xs outline-none resize-none h-20 transition-all",
                                isGourmet
                                    ? "bg-zinc-900/80 border-zinc-800 text-amber-50 focus:border-amber-500"
                                    : "bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white focus:border-primary"
                            )}
                        />
                    </div>
                </div>

                {/* Footer Controls */}
                <div className={cn(
                    "p-4 border-t shrink-0 flex items-center gap-3",
                    isGourmet ? "bg-zinc-950 border-zinc-800" : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800"
                )}>
                    <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-2xl p-1 shrink-0">
                        <button 
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-7 text-center font-bold text-sm text-gray-900 dark:text-white">{quantity}</span>
                        <button 
                            type="button"
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <button 
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!isValid}
                        className="flex-1 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-md text-sm"
                        style={{ backgroundColor: isValid ? pColor : '#a1a1aa' }}
                    >
                        <span>Agregar</span>
                        <span className="font-black">
                            ${currentPrice.toLocaleString('es-CO')}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    )
}

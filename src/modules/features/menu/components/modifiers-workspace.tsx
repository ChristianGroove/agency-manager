"use client"

import React, { useState } from "react"
import { RestoMenuModifierGroup } from "@/types"
import { Plus, Settings2, Trash2 } from "lucide-react"
import { ModifierSheet } from "./modifier-sheet"
import { deleteModifierGroup } from "../modifiers-actions"
import { toast } from "sonner"

export function ModifiersWorkspace({ modifierGroups }: { modifierGroups: RestoMenuModifierGroup[] }) {
    const [sheetOpen, setSheetOpen] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<RestoMenuModifierGroup | null>(null)

    const handleOpenNew = () => {
        setSelectedGroup(null)
        setSheetOpen(true)
    }

    const handleOpenEdit = (group: RestoMenuModifierGroup) => {
        setSelectedGroup(group)
        setSheetOpen(true)
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!confirm("¿Seguro que deseas eliminar este grupo global? Afectará a todos los platos vinculados.")) return
        
        try {
            await deleteModifierGroup(id)
            toast.success("Grupo eliminado")
        } catch (error: any) {
            toast.error(error.message || "Error al eliminar")
        }
    }

    return (
        <div className="flex flex-col flex-1 h-full glass-panel bg-white/10 dark:bg-white/5 backdrop-blur-md shadow-lg shadow-black/10 dark:shadow-black/20 rounded-2xl p-6 min-w-0">
            <div className="flex items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modificadores Globales</h2>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Crea opciones reutilizables como "Tamaños" o "Extras" y asígnalas a múltiples platos.</p>
                </div>
                <button onClick={handleOpenNew} className="bg-brand-pink hover:bg-brand-pink/90 text-white font-semibold text-xs rounded-xl h-10 px-4 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
                    <Plus className="w-4 h-4" />
                    Nuevo Grupo
                </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {modifierGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-gray-100 dark:border-white/10 rounded-3xl bg-gray-50/50 dark:bg-zinc-900/40">
                        <div className="w-14 h-14 bg-brand-pink/10 rounded-2xl flex items-center justify-center mb-4 text-brand-pink">
                            <Settings2 className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Sin modificadores</h3>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 text-center">Empieza creando un grupo de opciones.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {modifierGroups.map(group => (
                            <div 
                                key={group.id} 
                                onClick={() => handleOpenEdit(group)}
                                className="bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-white/10 rounded-2xl p-5 cursor-pointer hover:border-brand-pink dark:hover:border-brand-pink hover:shadow-md transition-all group/card relative"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-base">{group.name}</h3>
                                    <button 
                                        onClick={(e) => handleDelete(e, group.id)}
                                        className="opacity-0 group-hover/card:opacity-100 p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">
                                        {group.required ? 'Obligatorio' : 'Opcional'}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">
                                        Sel: {group.min_selections} a {group.max_selections}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {group.options.slice(0, 3).map(opt => (
                                        <div key={opt.id} className="flex justify-between items-center text-xs">
                                            <span className="text-slate-600 dark:text-gray-400">{opt.name}</span>
                                            <span className="font-bold text-gray-900 dark:text-gray-200">
                                                {opt.price_modifier > 0 ? `+$${opt.price_modifier}` : 'Gratis'}
                                            </span>
                                        </div>
                                    ))}
                                    {group.options.length > 3 && (
                                        <div className="text-xs text-brand-pink font-semibold pt-1">
                                            + {group.options.length - 3} opciones más
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ModifierSheet 
                open={sheetOpen} 
                onOpenChange={setSheetOpen} 
                itemToEdit={selectedGroup}
            />
        </div>
    )
}

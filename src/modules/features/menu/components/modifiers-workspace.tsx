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
                    <p className="text-sm text-gray-500 mt-1">Crea opciones reutilizables como "Tamaños" o "Extras" y asígnalas a múltiples platos.</p>
                </div>
                <button onClick={handleOpenNew} className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap">
                    <Plus className="w-5 h-5" />
                    Nuevo Grupo
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                {modifierGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-3xl">
                        <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-4">
                            <Settings2 className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sin modificadores</h3>
                        <p className="text-gray-500 mt-1 text-sm text-center">Empieza creando un grupo de opciones.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {modifierGroups.map(group => (
                            <div 
                                key={group.id} 
                                onClick={() => handleOpenEdit(group)}
                                className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 cursor-pointer hover:border-primary hover:shadow-md transition-all group/card relative"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{group.name}</h3>
                                    <button 
                                        onClick={(e) => handleDelete(e, group.id)}
                                        className="opacity-0 group-hover/card:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                                        {group.required ? 'Obligatorio' : 'Opcional'}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                                        Sel: {group.min_selections} a {group.max_selections}
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    {group.options.slice(0, 3).map(opt => (
                                        <div key={opt.id} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">{opt.name}</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-200">
                                                {opt.price_modifier > 0 ? `+$${opt.price_modifier}` : 'Gratis'}
                                            </span>
                                        </div>
                                    ))}
                                    {group.options.length > 3 && (
                                        <div className="text-xs text-primary font-medium pt-1">
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

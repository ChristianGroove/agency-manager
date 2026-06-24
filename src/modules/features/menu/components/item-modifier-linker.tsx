"use client"

import React from "react"
import { RestoMenuModifierGroup } from "@/types"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface ItemModifierLinkerProps {
    availableGroups: RestoMenuModifierGroup[]
    selectedGroupIds: string[]
    onChange: (groupIds: string[]) => void
}

export function ItemModifierLinker({ availableGroups, selectedGroupIds, onChange }: ItemModifierLinkerProps) {
    const handleToggle = (id: string, checked: boolean) => {
        if (checked) {
            onChange([...selectedGroupIds, id])
        } else {
            onChange(selectedGroupIds.filter(gId => gId !== id))
        }
    }

    if (availableGroups.length === 0) {
        return (
            <div className="text-xs text-gray-500 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-dashed border-gray-200 dark:border-zinc-700 mt-4">
                No has creado ningún modificador global. Ve a la pestaña "Modificadores Globales" para crear uno.
            </div>
        )
    }

    return (
        <div className="space-y-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-4 shadow-sm mt-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Modificadores Adicionales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableGroups.map(group => (
                    <div key={group.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <Checkbox 
                            id={`mod-${group.id}`} 
                            checked={selectedGroupIds.includes(group.id)}
                            onCheckedChange={(c) => handleToggle(group.id, !!c)}
                            className="mt-0.5"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor={`mod-${group.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                {group.name}
                            </label>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {group.required ? 'Obligatorio' : 'Opcional'} • {group.options.length} opciones
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

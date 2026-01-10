"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { TAG_COLORS } from "./tag-colors"
import { type Tag } from "../../tags-actions"
import { cn } from "@/lib/utils"

interface TagFormProps {
    initialData?: Tag | null
    onSave: (name: string, color: string) => Promise<void>
    onCancel: () => void
    isLoading: boolean
}

export function TagForm({ initialData, onSave, onCancel, isLoading }: TagFormProps) {
    const [name, setName] = useState("")
    const [color, setColor] = useState(TAG_COLORS[0].value)

    useEffect(() => {
        if (initialData) {
            setName(initialData.name)
            setColor(initialData.color)
        } else {
            setName("")
            setColor(TAG_COLORS[0].value)
        }
    }, [initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        await onSave(name, color)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="tag-name">Nombre de la Etiqueta</Label>
                <div className="flex gap-2">
                    <Input
                        id="tag-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Cliente VIP"
                        className="flex-1"
                        autoFocus
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Color Distintivo</Label>
                <div className="grid grid-cols-6 gap-3">
                    {TAG_COLORS.map((c) => (
                        <button
                            key={c.value}
                            type="button"
                            onClick={() => setColor(c.value)}
                            className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-all ring-2 ring-offset-2 hover:scale-110",
                                c.value === color
                                    ? "ring-gray-900 dark:ring-white scale-110"
                                    : "ring-transparent hover:ring-gray-200 dark:hover:ring-gray-700"
                            )}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                        />
                    ))}
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-gray-100 dark:border-white/5 flex items-center justify-center h-24">
                {name ? (
                    <span
                        className="px-3 py-1 rounded-full text-sm font-medium text-white shadow-sm transition-all"
                        style={{ backgroundColor: color }}
                    >
                        {name}
                    </span>
                ) : (
                    <span className="text-muted-foreground text-sm italic">Vista previa</span>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" type="button" onClick={onCancel} disabled={isLoading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={!name.trim() || isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Guardar Cambios" : "Crear Etiqueta"}
                </Button>
            </div>
        </form>
    )
}

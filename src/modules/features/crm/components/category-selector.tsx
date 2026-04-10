"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { getClientCategories, createClientCategory, type ClientCategory } from "../services/logic/categories-actions"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

interface CategorySelectorProps {
    value?: string | null
    onChange: (categoryId: string) => void
    disabled?: boolean
}

export function CategorySelector({ value, onChange, disabled }: CategorySelectorProps) {
    const [open, setOpen] = useState(false)
    const [categories, setCategories] = useState<ClientCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    
    // Quick Creation State
    const [isCreating, setIsCreating] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState("")

    const loadCategories = async () => {
        setLoading(true)
        const res = await getClientCategories()
        if (res.success && res.data) {
            setCategories(res.data)
        } else {
            toast.error("Error cargando categorías")
        }
        setLoading(false)
    }

    useEffect(() => {
        loadCategories()
    }, [])

    const handleCreate = async () => {
        if (!newCategoryName.trim()) return
        setIsCreating(true)
        const res = await createClientCategory(newCategoryName.trim())
        if (res.success && res.data) {
            setCategories([...categories, res.data])
            onChange(res.data.id)
            setNewCategoryName("")
            setOpen(false)
            toast.success("Categoría creada")
        } else {
            toast.error(res.error || "Error creando categoría")
        }
        setIsCreating(false)
    }

    const selectedCategory = categories.find((c) => c.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled || loading}
                    className="w-full justify-between h-11 bg-gray-50/50 dark:bg-black/20 border-gray-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 dark:text-white transition-colors"
                >
                    {loading ? (
                        <div className="flex items-center gap-2 text-gray-400">
                            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                        </div>
                    ) : selectedCategory ? (
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: selectedCategory.color }} />
                            {selectedCategory.name}
                        </div>
                    ) : (
                        <span className="text-gray-500 dark:text-gray-400">Seleccionar categoría...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 dark:bg-slate-900 dark:border-white/10" align="start">
                <Command className="dark:bg-slate-900">
                    <CommandInput 
                        placeholder="Buscar categoría..." 
                        className="dark:text-white"
                    />
                    <CommandList>
                        <CommandEmpty className="py-2 px-4 text-xs text-gray-500 dark:text-gray-400">
                            No se encontraron categorías.
                        </CommandEmpty>
                        <CommandGroup>
                            {categories.map((category) => (
                                <CommandItem
                                    key={category.id}
                                    value={category.name}
                                    onSelect={() => {
                                        onChange(category.id === value ? "" : category.id)
                                        setOpen(false)
                                    }}
                                    className="cursor-pointer dark:hover:bg-white/5"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === category.id ? "opacity-100 text-primary" : "opacity-0"
                                        )}
                                    />
                                    <div className={`w-2 h-2 rounded-full mr-2`} style={{ backgroundColor: category.color }} />
                                    <span className="dark:text-gray-300">{category.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

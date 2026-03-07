"use client"

import { useState, useEffect } from "react"
import { Check, Plus, Tag as TagIcon, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
    getTags,
    getLeadTags,
    toggleLeadTag,
    type Tag,
    type LeadTag
} from "../../tags-actions"
import { toast } from "sonner"

interface TagsPickerProps {
    leadId: string
    organizationId?: string
}

export function TagsPicker({ leadId, organizationId }: TagsPickerProps) {
    const [open, setOpen] = useState(false)
    const [allTags, setAllTags] = useState<Tag[]>([])
    const [selectedTags, setSelectedTags] = useState<LeadTag[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [tags, leadTags] = await Promise.all([
                getTags(),
                getLeadTags(leadId)
            ])
            setAllTags(tags)
            setSelectedTags(leadTags)
        } catch (error) {
            console.error("Error loading tags:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (leadId) loadData()
    }, [leadId])

    const handleToggle = async (tag: Tag) => {
        const res = await toggleLeadTag(leadId, tag.id)
        if (res.success) {
            // Update local state for immediate feedback
            if (res.data?.action === 'added') {
                setSelectedTags(prev => [...prev, { ...tag, linked_at: new Date().toISOString() }])
                toast.success(`Etiqueta "${tag.name}" añadida`)
            } else {
                setSelectedTags(prev => prev.filter(t => t.id !== tag.id))
                toast.success(`Etiqueta "${tag.name}" eliminada`)
            }
        } else {
            toast.error(res.error || "Error al actualizar etiquetas")
        }
    }

    return (
        <div className="flex flex-wrap gap-1.5 p-2 bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-white/20 dark:border-white/5">
            {selectedTags.length > 0 ? (
                selectedTags.map(tag => (
                    <Badge
                        key={tag.id}
                        variant="secondary"
                        className="hover:opacity-80 transition-all px-2 py-0.5 text-[11px] font-medium shadow-sm border-0 text-white"
                        style={{ backgroundColor: tag.color }}
                    >
                        <TagIcon className="h-3 w-3 mr-1 opacity-70" />
                        {tag.name}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleToggle(tag)
                            }}
                            className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                        >
                            <X className="h-2.5 w-2.5" />
                        </button>
                    </Badge>
                ))
            ) : (
                <span className="text-[10px] text-muted-foreground px-1 italic">Sin etiquetas</span>
            )}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-6 rounded-full px-2 text-[10px] border-dashed text-muted-foreground hover:text-foreground bg-transparent"
                    >
                        <Plus className="h-3 w-3 mr-1" /> Gestionar
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Buscar etiqueta..." />
                        <CommandList>
                            <CommandEmpty className="py-2 text-xs text-center">No se encontraron etiquetas.</CommandEmpty>
                            <CommandGroup heading="Etiquetas disponibles">
                                {allTags.map((tag) => {
                                    const isSelected = selectedTags.some(t => t.id === tag.id)
                                    return (
                                        <CommandItem
                                            key={tag.id}
                                            onSelect={() => handleToggle(tag)}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="flex-1 truncate text-xs">{tag.name}</span>
                                            {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                                        </CommandItem>
                                    )
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}

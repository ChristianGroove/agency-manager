"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, MessageSquare, ShieldAlert } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { getChannels } from "@/modules/features/channels/actions"
import { Channel } from "@/modules/features/channels/types"
import { getCurrentUserPermissions } from "@/modules/core/settings/actions/team"

interface ChannelAccessSelectorProps {
    selectedIds: string[]
    onChange: (ids: string[]) => void
    disabled?: boolean
}

export function ChannelAccessSelector({ selectedIds, onChange, disabled }: ChannelAccessSelectorProps) {
    const [open, setOpen] = useState(false)
    const [channels, setChannels] = useState<Channel[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchChannels = async () => {
            const [data, perms] = await Promise.all([
                getChannels(),
                getCurrentUserPermissions()
            ])

            const role = perms?.role?.toLowerCase()
            const isOwner = role === 'owner' || role === 'dueño'
            const isAdmin = role === 'admin' || role === 'administrador'
            const authorizedChannels = perms?.permissions?.inbox_access || []

            let finalChannels = data
            if (!isOwner && isAdmin) {
                // Si es un admin restringido, solo puede ver/asignar los canales que él posee
                finalChannels = data.filter(c => authorizedChannels.includes(c.id))
            }

            setChannels(finalChannels)
            setLoading(false)

            // Auto-clean orphaned IDs on initial load
            const validIds = selectedIds.filter(id => finalChannels.some(c => c.id === id));
            if (validIds.length !== selectedIds.length) {
                onChange(validIds);
            }
        }
        fetchChannels()
    }, []) // Only run on mount to avoid loops

    const toggleChannel = (id: string) => {
        const newSelected = selectedIds.includes(id)
            ? selectedIds.filter(i => i !== id)
            : [...selectedIds, id]
        onChange(newSelected)
    }

    if (loading) return <div className="h-10 w-full animate-pulse bg-gray-100 rounded-md" />

    const validSelectedIds = selectedIds.filter(id => channels.some(c => c.id === id));

    return (
        <div className="space-y-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between hover:bg-gray-50 border-gray-200"
                        disabled={disabled}
                    >
                        <span className="flex items-center gap-2 truncate">
                            <MessageSquare className="h-4 w-4 text-indigo-500" />
                            {validSelectedIds.length === 0
                                ? "Sin canales autorizados"
                                : `${validSelectedIds.length} ${validSelectedIds.length === 1 ? 'canal seleccionado' : 'canales seleccionados'}`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command className="border-none">
                        <CommandInput placeholder="Buscar canal..." className="border-none focus:ring-0" />
                        <CommandList>
                            <CommandEmpty>No se encontraron canales.</CommandEmpty>
                            <CommandGroup heading="Canales Disponibles">
                                {channels.map((channel) => (
                                    <CommandItem
                                        key={channel.id}
                                        value={channel.connection_name || ""}
                                        onSelect={() => toggleChannel(channel.id)}
                                        className="cursor-pointer"
                                    >
                                        <div className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            selectedIds.includes(channel.id)
                                                ? "bg-primary text-primary-foreground"
                                                : "opacity-50 [&_svg]:invisible"
                                        )}>
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{channel.connection_name}</span>
                                            <span className="text-[10px] text-muted-foreground">{channel.metadata?.display_phone_number || channel.metadata?.phone_number || "WhatsApp"}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {validSelectedIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    {channels.filter(c => validSelectedIds.includes(c.id)).map(c => (
                        <Badge
                            key={c.id}
                            variant="secondary"
                            className="bg-white border-gray-200 text-gray-700 font-normal py-0 px-2 flex items-center gap-1"
                        >
                            {c.connection_name}
                            <button
                                onClick={() => toggleChannel(c.id)}
                                className="hover:text-red-500 rounded-full ml-1"
                            >
                                ×
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {validSelectedIds.length === 0 && !disabled && (
                <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-rose-600 bg-rose-50 rounded border border-rose-100 italic">
                    <ShieldAlert className="h-3 w-3" />
                    Aviso: El agente no verá ningún chat si no autorizas canales.
                </div>
            )}
        </div>
    )
}

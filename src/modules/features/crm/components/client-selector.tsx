"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Client } from "@/types"
import { getClients } from "../services/logic/actions"

interface ClientSelectorProps {
    value?: string
    onChange: (value: string) => void
    placeholder?: string
}

export function ClientSelector({
    value,
    onChange,
    placeholder = "Seleccionar cliente..."
}: ClientSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [clients, setClients] = React.useState<Client[]>([])
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        async function fetchClients() {
            const data = await getClients()
            setClients(data)
            setLoading(false)
        }
        fetchClients()
    }, [])

    const selectedClient = clients.find((client) => client.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedClient ? (
                        <span className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {selectedClient.name}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
                <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandEmpty>
                        {loading ? "Cargando..." : "No se encontraron clientes."}
                    </CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                        {clients.map((client) => (
                            <CommandItem
                                key={client.id}
                                value={`${client.name} ${client.email || ''} ${client.company_name || ''}`}
                                onSelect={() => {
                                    onChange(client.id)
                                    setOpen(false)
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === client.id ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <div className="flex flex-col">
                                    <span className="font-medium">{client.name}</span>
                                    {client.company_name && (
                                        <span className="text-sm text-muted-foreground">
                                            {client.company_name}
                                        </span>
                                    )}
                                    {client.email && (
                                        <span className="text-xs text-muted-foreground">
                                            {client.email}
                                        </span>
                                    )}
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

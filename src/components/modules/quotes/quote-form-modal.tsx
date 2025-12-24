"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { Check, ChevronsUpDown, Loader2, UserPlus, Users } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { LeadsService } from "@/services/leads-service"
import { QuotesService } from "@/services/quotes-service"
import { Client } from "@/types"
import { toast } from "sonner"

interface QuoteFormModalProps {
    isOpen: boolean
    onClose: () => void
}

export function QuoteFormModal({ isOpen, onClose }: QuoteFormModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<Client[]>([])

    // Form States
    const [selectedClientId, setSelectedClientId] = useState<string>("")
    const [prospectData, setProspectData] = useState({
        name: "",
        company_name: "",
        email: "",
        phone: ""
    })

    useEffect(() => {
        if (isOpen) {
            fetchClients()
        }
    }, [isOpen])

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('*').order('name')
        if (data) setClients(data)
    }

    const handleCreateQuoteForClient = async () => {
        if (!selectedClientId) return
        setLoading(true)
        try {
            const quote = await QuotesService.createQuote({
                client_id: selectedClientId,
                date: new Date().toISOString(),
                total: 0,
                items: []
            })
            toast.success("Cotización creada")
            onClose()
            router.push(`/quotes/${quote.id}/edit`)
        } catch (error) {
            console.error(error)
            toast.error("Error al crear la cotización")
        } finally {
            setLoading(false)
        }
    }

    const handleCreateQuoteForProspect = async () => {
        if (!prospectData.name) return
        setLoading(true)
        try {
            // 1. Create Lead
            const lead = await LeadsService.createLead({
                name: prospectData.name,
                company_name: prospectData.company_name,
                email: prospectData.email,
                phone: prospectData.phone
            })

            // 2. Create Quote
            const quote = await QuotesService.createQuote({
                lead_id: lead.id,
                date: new Date().toISOString(),
                total: 0,
                items: []
            })

            toast.success("Prospecto y cotización creados")
            onClose()
            router.push(`/quotes/${quote.id}/edit`)
        } catch (error) {
            console.error(error)
            toast.error("Error al crear el prospecto o la cotización")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] top-[5%] translate-y-0">
                <DialogHeader>
                    <DialogTitle>Nueva Cotización</DialogTitle>
                    <DialogDescription>
                        Selecciona un cliente existente o crea un nuevo prospecto.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="client" className="w-full mt-2">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="client" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Cliente Existente
                        </TabsTrigger>
                        <TabsTrigger value="prospect" className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Nuevo Prospecto
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="client" className="space-y-4 py-2">
                        <div className="space-y-2 flex flex-col">
                            <Label>Cliente</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn(
                                            "w-full justify-between",
                                            !selectedClientId && "text-muted-foreground"
                                        )}
                                    >
                                        {selectedClientId
                                            ? (() => {
                                                const c = clients.find((client) => client.id === selectedClientId)
                                                return c ? `${c.name} ${c.company_name ? `(${c.company_name})` : ''}` : "Seleccionar cliente..."
                                            })()
                                            : "Seleccionar cliente..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Buscar cliente..." />
                                        <CommandList className="max-h-[200px] overflow-y-auto">
                                            <CommandEmpty>No se encontró ningún cliente.</CommandEmpty>
                                            <CommandGroup>
                                                {clients.map((client) => (
                                                    <CommandItem
                                                        key={client.id}
                                                        value={`${client.name} ${client.company_name || ''}`}
                                                        onSelect={() => {
                                                            setSelectedClientId(client.id)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedClientId === client.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {client.name} {client.company_name ? <span className="text-xs text-muted-foreground ml-1">({client.company_name})</span> : ''}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </TabsContent>

                    <TabsContent value="prospect" className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Nombre Completo *</Label>
                            <Input
                                value={prospectData.name}
                                onChange={(e) => setProspectData({ ...prospectData, name: e.target.value })}
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Empresa (Opcional)</Label>
                            <Input
                                value={prospectData.company_name}
                                onChange={(e) => setProspectData({ ...prospectData, company_name: e.target.value })}
                                placeholder="Ej. Acme Inc."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={prospectData.email}
                                    onChange={(e) => setProspectData({ ...prospectData, email: e.target.value })}
                                    placeholder="juan@ejemplo.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Teléfono</Label>
                                <Input
                                    value={prospectData.phone}
                                    onChange={(e) => setProspectData({ ...prospectData, phone: e.target.value })}
                                    placeholder="+57 300..."
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="pt-4 border-t border-gray-100">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button
                        onClick={selectedClientId ? handleCreateQuoteForClient : handleCreateQuoteForProspect}
                        disabled={loading || (!selectedClientId && !prospectData.name)}
                        className="bg-brand-pink hover:bg-brand-pink/90 text-white"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Crear Cotización
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

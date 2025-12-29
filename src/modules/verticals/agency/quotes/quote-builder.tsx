"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Trash, ArrowLeft, Check, ChevronsUpDown, UserPlus, FileText, RefreshCcw, Building2 } from "lucide-react"
import { QuoteItem, ServiceCatalogItem, Client, Emitter } from "@/types"
import { createQuote } from "@/modules/verticals/agency/quotes/actions"


import { quickCreateProspect } from "@/modules/core/clients/actions"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface QuoteBuilderProps {
    onSuccess?: () => void
    mode?: 'page' | 'sheet'
    emitters?: Emitter[]
}

export function QuoteBuilder({ onSuccess, mode = 'page', emitters = [] }: QuoteBuilderProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    // --- Client State ---
    const [clients, setClients] = useState<Client[]>([])
    const [selectedClientId, setSelectedClientId] = useState<string>("")
    const [clientSearchOpen, setClientSearchOpen] = useState(false)
    const [clientSearchTerm, setClientSearchTerm] = useState("")

    // Quick Prospect State
    const [prospectData, setProspectData] = useState({ name: "", email: "", phone: "" })
    const [isProspectDialogOpen, setIsProspectDialogOpen] = useState(false)

    // --- Emitter State ---
    // Use props.emitters
    const [selectedEmitterId, setSelectedEmitterId] = useState<string>("")
    const [emitterOpen, setEmitterOpen] = useState(false)

    // Pre-select if only 1 emitter
    useEffect(() => {
        if (emitters.length === 1 && !selectedEmitterId) {
            setSelectedEmitterId(emitters[0].id)
        }
    }, [emitters])

    // --- Items State ---
    const [items, setItems] = useState<QuoteItem[]>([])
    // Catalog
    const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([])

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            // CRITICAL: Get organization context
            const supabase = await import('@/lib/supabase').then(m => m.supabase)
            const { getCurrentOrganizationId } = await import('@/modules/core/organizations/actions')
            const orgId = await getCurrentOrganizationId()

            if (!orgId) {
                console.error('No organization context found')
                return
            }

            // Fetch Clients - WITH ORGANIZATION FILTER
            const { data: clientsData } = await supabase
                .from('clients')
                .select('*')
                .eq('organization_id', orgId)
                .is('deleted_at', null)
                .order('name')
            if (clientsData) setClients(clientsData)

            // Fetch Catalog
            try {
                // Fetch strictly Catalog Items (is_catalog_item = true)
                const { data: catalogItems, error } = await supabase
                    .from('services')
                    .select('*')
                    .eq('is_catalog_item', true)
                    .eq('organization_id', orgId)
                    .order('name')

                if (error) throw error

                if (catalogItems) {
                    setCatalog(catalogItems as ServiceCatalogItem[])
                }
            } catch (err) {
                console.error("Catalog processing error:", err)
            }
        }
        fetchData()
    }, [])

    // --- Client Logic ---
    const openCreateProspect = () => {
        setProspectData(prev => ({ ...prev, name: clientSearchTerm }))
        setIsProspectDialogOpen(true)
        setClientSearchOpen(false)
    }

    const handleCreateProspect = async () => {
        if (!prospectData.name) return
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Usuario no autenticado")

            const res = await quickCreateProspect({
                ...prospectData,
                userId: user.id
            })

            if (res.success && res.client) {
                setClients(prev => [...prev, res.client])
                setSelectedClientId(res.client.id)
                setIsProspectDialogOpen(false)
                setClientSearchOpen(false)
                toast.success(`Prospecto ${res.client.name} creado`)
            } else {
                toast.error(`Error: ${res.error}`)
            }
        } catch (e: any) {
            console.error(e)
            toast.error(e.message || "Error inesperado")
        } finally {
            setLoading(false)
        }
    }

    // --- Items Logic ---
    const addItem = () => {
        setItems([...items, { description: "", quantity: 1, price: 0 }])
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...items]
        // @ts-ignore
        newItems[index][field] = value
        setItems(newItems)
    }

    const handleCatalogSelect = (index: number, serviceId: string) => {
        const service = catalog.find(s => s.id === serviceId)
        if (!service) return

        const newItems = [...items]
        newItems[index] = {
            ...newItems[index],
            description: service.name,
            price: service.base_price || 0,
            catalog_item_id: service.id,
            is_recurring: service.type === 'recurring',
            frequency: service.frequency
        }
        setItems(newItems)
    }

    // --- Totals ---
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const recurringTotal = items.filter(i => i.is_recurring).reduce((sum, i) => sum + (i.price * i.quantity), 0)
    const setupTotal = items.filter(i => !i.is_recurring).reduce((sum, i) => sum + (i.price * i.quantity), 0)

    // --- Save ---
    const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
        if (!selectedClientId) return toast.error("Selecciona un cliente")
        if (items.length === 0) return toast.error("Agrega al menos un ítem")
        // if (!selectedEmitterId) return toast.error("Selecciona una identidad de facturación") // Optional check

        setLoading(true)
        try {
            const response = await createQuote({
                client_id: selectedClientId,
                emitter_id: selectedEmitterId || null,
                items: items,
                total: total,
                date: new Date(date).toISOString(),
                // number is generated by backend
            })

            if (!response.success) {
                throw new Error(response.error)
            }

            const quote = response.data

            toast.success("Cotización creada exitosamente")

            if (onSuccess) {
                onSuccess()
            } else {
                router.push(`/quotes/${quote.id}`)
            }
        } catch (error: any) {
            console.error(error)
            toast.error("Error al guardar: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    const selectedClientName = clients.find(c => c.id === selectedClientId)?.name

    // Find active emitter name
    const selectedEmitter = emitters.find(e => e.id === selectedEmitterId)
    const activeEmitterName = selectedEmitter?.display_name || "Seleccionar emisor"

    return (
        <div className={cn(
            "flex flex-col h-full",
            mode === 'sheet' ? "bg-white/95 backdrop-blur-xl" : "pb-20 bg-gray-50/50"
        )}>

            {/* --- Sticky Header --- */}
            <div className={cn(
                "sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5",
                mode === 'sheet' ? "bg-white/40 backdrop-blur-md border-b border-black/5" : "bg-white/80 border-b"
            )}>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Nueva Cotización</h2>
                    <p className="text-xs text-muted-foreground">Detalla los servicios y sus costos.</p>
                </div>
            </div>

            {/* --- Main Content Grid --- */}
            <div className="flex-1 overflow-hidden">
                <div className="h-full grid grid-cols-1 lg:grid-cols-12 divide-x divide-gray-100/50">

                    {/* LEFT COLUMN: Editing Area (2/3) */}
                    <div className="lg:col-span-8 overflow-y-auto p-8 space-y-8 h-full relative scrollbar-thin scrollbar-thumb-gray-200">

                        {/* 0. Emitter & Date Row */}
                        <div className="flex gap-6">
                            {/* Emitter Selector */}
                            <div className="space-y-3 flex-1">
                                <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Identidad de Facturación</Label>
                                <Popover open={emitterOpen} onOpenChange={setEmitterOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between h-11 bg-white/50 border-gray-200"
                                        >
                                            <span className="flex items-center gap-2 text-gray-600">
                                                <Building2 className="h-4 w-4 text-gray-400" />
                                                {activeEmitterName}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
                                        <Command>
                                            <CommandInput placeholder="Buscar emisor..." />
                                            <CommandList>
                                                {emitters.map((emitter) => (
                                                    <CommandItem
                                                        key={emitter.id}
                                                        value={emitter.display_name}
                                                        onSelect={() => {
                                                            setSelectedEmitterId(emitter.id)
                                                            setEmitterOpen(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedEmitterId === emitter.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {emitter.display_name}
                                                    </CommandItem>
                                                ))}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Date */}
                            <div className="space-y-3 w-[200px]">
                                <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Fecha de Emisión</Label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="bg-white/50 border-gray-200 h-11 rounded-xl shadow-sm focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* 1. Client Selection */}
                        <section className="space-y-4">
                            <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Cliente</Label>

                            {selectedClientId ? (
                                // Active Client Card
                                <div className="group relative flex items-start justify-between p-4 rounded-2xl border border-indigo-100/50 bg-indigo-50/20 hover:bg-indigo-50/40 hover:border-indigo-200/60 transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-100/80 flex items-center justify-center text-indigo-600 font-bold text-lg shadow-inner">
                                            {selectedClientName?.[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{selectedClientName}</h3>
                                            <p className="text-sm text-gray-500">{clients.find(c => c.id === selectedClientId)?.email || "Sin email registrado"}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedClientId("")}
                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        Cambiar
                                    </Button>
                                </div>
                            ) : (
                                // Search Input
                                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between h-16 text-base bg-white/60 border-dashed border-gray-300 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all rounded-2xl"
                                        >
                                            <span className="flex items-center gap-3 text-muted-foreground pl-2">
                                                <div className="bg-gray-100 p-1.5 rounded-md">
                                                    <UserPlus className="h-4 w-4 text-gray-500" />
                                                </div>
                                                Buscar o crear cliente...
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 rounded-xl shadow-xl border-gray-100" align="start">
                                        <Command shouldFilter={false}>
                                            <CommandInput
                                                placeholder="Ej. Acme Corp..."
                                                value={clientSearchTerm}
                                                onValueChange={setClientSearchTerm}
                                                className="h-12 border-none focus:ring-0"
                                            />
                                            <CommandList>
                                                {clients
                                                    .filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                                                    .map((client) => (
                                                        <CommandItem
                                                            key={client.id}
                                                            value={client.name}
                                                            onSelect={() => {
                                                                setSelectedClientId(client.id)
                                                                setClientSearchOpen(false)
                                                                setClientSearchTerm("")
                                                            }}
                                                            className="py-3 px-4 cursor-pointer"
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4 text-indigo-600",
                                                                    selectedClientId === client.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-900">{client.name}</span>
                                                                {client.company_name && <span className="text-xs text-muted-foreground text-gray-500">{client.company_name}</span>}
                                                            </div>
                                                        </CommandItem>
                                                    ))}

                                                {clientSearchTerm.trim().length > 0 && (
                                                    <CommandGroup>
                                                        <CommandItem
                                                            value={`create-${clientSearchTerm}`}
                                                            onSelect={openCreateProspect}
                                                            className="text-indigo-600 font-medium bg-indigo-50/50 py-3 rounded-b-xl"
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Crear nuevo prospecto: "{clientSearchTerm}"
                                                        </CommandItem>
                                                    </CommandGroup>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </section>

                        {/* 3. Items Table Wrapper */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Items del Proyecto</Label>
                            </div>

                            <div className="border border-gray-200/60 rounded-2xl overflow-hidden bg-white/40 shadow-sm ring-1 ring-black/5">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50/80 border-b border-gray-200/60 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    <div className="col-span-10 md:col-span-5">Servicio</div>
                                    <div className="hidden md:block col-span-2">Tipo</div>
                                    <div className="col-span-2 text-center">Cant.</div>
                                    <div className="hidden md:block col-span-2 text-right">Unitario</div>
                                    <div className="col-span-1 md:col-span-1 text-center"></div>
                                </div>

                                {/* Items List */}
                                <div className="divide-y divide-gray-100/80">
                                    {items.map((item, index) => (
                                        <div key={index} className="group px-4 py-3 hover:bg-white transition-colors">
                                            {/* Top Row: Main Inputs */}
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">

                                                {/* Description / Catalog Selector */}
                                                <div className="col-span-12 md:col-span-5 space-y-2">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                role="combobox"
                                                                className={cn(
                                                                    "w-full justify-between font-normal text-left h-auto py-2.5 px-3 hover:bg-gray-100/50 rounded-lg",
                                                                    !item.description && "text-muted-foreground"
                                                                )}
                                                            >
                                                                <span className={cn("truncate block font-medium text-sm", !item.description && "italic opacity-50")}>
                                                                    {item.description || "Seleccionar servicio..."}
                                                                </span>
                                                                {/* <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-20" /> */}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
                                                            <Command>
                                                                <CommandInput
                                                                    placeholder="Buscar..."
                                                                    onValueChange={(val) => {
                                                                        if (val !== item.description) {
                                                                            updateItem(index, 'description', val)
                                                                            if (item.catalog_item_id) {
                                                                                updateItem(index, 'catalog_item_id', undefined)
                                                                                updateItem(index, 'is_recurring', false)
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                <CommandList>
                                                                    <CommandEmpty className="py-3 px-4 text-xs text-muted-foreground">Escribe para personalizar</CommandEmpty>
                                                                    <CommandGroup heading="Catálogo">
                                                                        {catalog.map((s) => (
                                                                            <CommandItem
                                                                                key={s.id}
                                                                                value={s.name}
                                                                                onSelect={() => handleCatalogSelect(index, s.id)}
                                                                            >
                                                                                <Check className={cn("mr-2 h-4 w-4", item.catalog_item_id === s.id ? "opacity-100" : "opacity-0")} />
                                                                                {s.name}
                                                                                {s.base_price > 0 && <span className="ml-auto text-xs text-gray-400 font-mono">${s.base_price.toLocaleString()}</span>}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>

                                                {/* Type & Frequency */}
                                                <div className="col-span-6 md:col-span-2 flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={item.is_recurring}
                                                            onCheckedChange={(c) => updateItem(index, 'is_recurring', c)}
                                                            className="scale-75 origin-left"
                                                        />
                                                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                                            {item.is_recurring ? 'Recurrente' : 'Único'}
                                                        </span>
                                                    </div>
                                                    {item.is_recurring && (
                                                        <Select value={item.frequency || 'monthly'} onValueChange={(v) => updateItem(index, 'frequency', v)}>
                                                            <SelectTrigger className="h-7 text-[10px] bg-indigo-50/50 border-none text-indigo-700 font-medium rounded-lg"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="biweekly">Quincenal</SelectItem>
                                                                <SelectItem value="monthly">Mensual</SelectItem>
                                                                <SelectItem value="quarterly">Trimestral</SelectItem>
                                                                <SelectItem value="semiannual">Semestral</SelectItem>
                                                                <SelectItem value="yearly">Anual</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>

                                                {/* Quantity */}
                                                <div className="col-span-6 md:col-span-2">
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                        className="text-center h-9 border-gray-100 bg-gray-50/30 rounded-lg focus:bg-white transition-all"
                                                    />
                                                </div>

                                                {/* Price */}
                                                <div className="col-span-6 md:col-span-2 relative">
                                                    <span className="absolute left-3 top-2.5 text-gray-400 text-xs">$</span>
                                                    <Input
                                                        className="pl-6 text-right h-9 font-mono border-gray-100 bg-gray-50/30 rounded-lg focus:bg-white transition-all"
                                                        type="number"
                                                        min="0"
                                                        value={item.price}
                                                        onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                                                    />
                                                </div>

                                                {/* Delete */}
                                                <div className="col-span-12 md:col-span-1 flex justify-center pt-2 md:pt-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-full"
                                                        onClick={() => removeItem(index)}
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Empty State / Add Button */}
                                    <button
                                        onClick={addItem}
                                        className="w-full py-4 bg-gray-50/30 hover:bg-white border-t border-gray-100 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <Plus className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                        AGREGAR ITEM
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Footer Spacer */}
                        <div className="h-24" />
                    </div>

                    {/* RIGHT COLUMN: The Receipt (1/3) */}
                    <div className="lg:col-span-4 bg-slate-100/50 p-8 flex flex-col h-full sticky top-0 overflow-y-auto">

                        <div className="flex-1 space-y-8">
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <FileText className="h-3 w-3" />
                                Resumen
                            </h3>

                            {items.length === 0 ? (
                                <div className="text-center py-20 opacity-40">
                                    <div className="bg-slate-200/50 h-24 w-24 mx-auto rounded-full flex items-center justify-center mb-4">
                                        <Plus className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">Agrega items para<br />ver el desglose</p>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* 1. Items List Summary */}
                                    <div className="space-y-3">
                                        {items.map((item, i) => (
                                            <div key={i} className="flex justify-between text-sm group">
                                                <span className="text-gray-600 truncate max-w-[180px] font-medium">{item.description || "Item sin nombre"}</span>
                                                <span className="font-mono text-gray-900">${(item.quantity * item.price).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="h-px bg-slate-200 w-full my-6" />

                                    {/* 2. Grouped Breakdown */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Pago Único (Setup)</span>
                                            <span className="font-medium text-gray-900">${setupTotal.toLocaleString()}</span>
                                        </div>

                                        {Object.entries(
                                            items.filter(i => i.is_recurring).reduce((acc, item) => {
                                                const freq = item.frequency || 'monthly'
                                                acc[freq] = (acc[freq] || 0) + (item.price * item.quantity)
                                                return acc
                                            }, {} as Record<string, number>)
                                        ).map(([freq, amount]) => (
                                            <div key={freq} className="flex justify-between text-sm items-center bg-white/60 p-3 rounded-xl shadow-sm border border-white/50">
                                                <span className="text-indigo-600 capitalize flex items-center gap-2 text-xs font-bold tracking-wide">
                                                    <div className="bg-indigo-100/50 p-1 rounded-full">
                                                        <RefreshCcw className="h-3 w-3" />
                                                    </div>
                                                    {{
                                                        'biweekly': 'Quincenal',
                                                        'monthly': 'Mensual',
                                                        'quarterly': 'Trimestral',
                                                        'semiannual': 'Semestral',
                                                        'yearly': 'Anual'
                                                    }[freq] || freq}
                                                </span>
                                                <span className="font-bold text-gray-900 font-mono text-sm">${amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sticky Bottom Actions inside layout */}
                        <div className="mt-8 pt-8 border-t border-slate-200/60 pb-12">
                            {/* Grand Total */}
                            <div className="mb-6">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="text-sm font-medium text-gray-500">Total Proyectado</span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-5xl font-bold text-slate-900 tracking-tighter leading-none">${total.toLocaleString()}</span>
                                    <span className="text-[10px] text-gray-400 font-medium px-2 py-1 bg-white/50 rounded-full mt-2">COP</span>
                                </div>
                            </div>

                            <Button
                                className="w-full h-14 text-base font-bold bg-slate-900 hover:bg-black text-white shadow-xl shadow-indigo-900/10 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-2xl"
                                onClick={() => handleSave('draft')}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : "Guardar Cotización"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Prospect Modal */}
            <Dialog open={isProspectDialogOpen} onOpenChange={setIsProspectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Prospecto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre Completo</Label>
                            <Input
                                placeholder="Ej. Juan Pérez"
                                value={prospectData.name}
                                onChange={(e) => setProspectData({ ...prospectData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email (Opcional)</Label>
                            <Input
                                placeholder="juan@empresa.com"
                                value={prospectData.email}
                                onChange={(e) => setProspectData({ ...prospectData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Teléfono (Opcional)</Label>
                            <Input
                                placeholder="+57 300..."
                                value={prospectData.phone}
                                onChange={(e) => setProspectData({ ...prospectData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsProspectDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateProspect} disabled={loading || !prospectData.name}>Crear & Seleccionar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}

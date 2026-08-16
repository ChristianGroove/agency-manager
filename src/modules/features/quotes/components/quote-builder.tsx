"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Trash, ArrowLeft, Check, ChevronsUpDown, UserPlus, FileText, RefreshCcw, Building2 } from "lucide-react"
import { QuoteItem, ServiceCatalogItem, Client, Emitter } from "@/types"
import { createQuoteAction as createQuote, updateQuoteAction as updateQuote, getContactOptionsAction } from "../quotes-actions"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { quickCreateProspect } from "@/modules/features/crm/services/logic/actions"
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
import { cn } from "@/modules/infrastructure/utils/utils"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { addDays } from "date-fns"

interface QuoteBuilderProps {
    onSuccess?: () => void
    mode?: 'page' | 'sheet'
    emitters: Emitter[]
    prefillLeadId?: string // Pre-link quote to a lead
    prefillLeadName?: string
    prefillLeadEmail?: string
    prefillLeadPhone?: string
    existingQuote?: any // For edit mode
}

export function QuoteBuilder({ onSuccess, mode = 'page', emitters, prefillLeadId, prefillLeadName, prefillLeadEmail, prefillLeadPhone, existingQuote }: QuoteBuilderProps) {
    const { t, locale } = useTranslation()
    const router = useRouter()

    // Initialize State - Check if we have an existing quote to edit
    const [step, setStep] = useState(1)

    // Initial Client Logic
    const initialClientType = existingQuote ? (existingQuote.lead_id ? "lead" : "client") : "client"
    const [clientType, setClientType] = useState<"client" | "lead">(initialClientType)

    const [selectedClientId, setSelectedClientId] = useState<string>(existingQuote?.client_id || "")
    const [selectedClient, setSelectedClient] = useState<Client | null>(existingQuote?.client || null)

    // Initial Lead Logic
    const initialLead = existingQuote?.lead || (prefillLeadId ? { id: prefillLeadId, name: prefillLeadName, email: prefillLeadEmail, phone: prefillLeadPhone } as any : null)
    const [selectedLead, setSelectedLead] = useState<any | null>(initialLead) // using any for simplicity with complex Lead types here

    // Date Logic - ensure string format YYYY-MM-DD for input[type=date]
    const initialDate = existingQuote && existingQuote.date ? new Date(existingQuote.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    const [date, setDate] = useState<string>(initialDate)

    // Items Logic
    const [items, setItems] = useState<QuoteItem[]>(existingQuote?.items || [])

    // Emitter Logic
    const [selectedEmitterId, setSelectedEmitterId] = useState<string>(existingQuote?.emitter_id || "")

    const [expirationDate, setExpirationDate] = useState<Date>(() => {
        if (existingQuote && existingQuote.valid_until) {
            const d = new Date(existingQuote.valid_until)
            if (!isNaN(d.getTime())) return d
        }
        return addDays(new Date(), 15)
    })
    const [loading, setLoading] = useState(false)
    const [duplicateWarning, setDuplicateWarning] = useState<(Client & { isLead?: boolean }) | null>(null)

    // --- Client State Helpers ---
    const [clients, setClients] = useState<Client[]>([])
    const [clientSearchOpen, setClientSearchOpen] = useState(false)
    const [clientSearchTerm, setClientSearchTerm] = useState("")

    // Quick Prospect State
    const [prospectData, setProspectData] = useState({ name: "", email: "", phone: "" })
    const [isProspectDialogOpen, setIsProspectDialogOpen] = useState(false)
    const [emitterOpen, setEmitterOpen] = useState(false)

    // Catalog
    const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([])

    // Pre-select if only 1 emitter
    useEffect(() => {
        if (emitters.length === 1 && !selectedEmitterId) {
            setSelectedEmitterId(emitters[0].id)
        }
    }, [emitters])

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // 1. Fetch Clients via Action (Filtered by contact_type='client')
                const clientsData = await getContactOptionsAction()
                if (clientsData) setClients(clientsData as Client[])

                // 2. Fetch Catalog (Keeping for now, but should move to service)
                const { supabase } = await import('@/modules/core/database/supabase')
                const { getCurrentOrganizationId } = await import('@/modules/core/organizations/organization-actions')
                const orgId = await getCurrentOrganizationId()
                
                if (orgId) {
                    const { data: catalogItems } = await supabase
                        .from('services')
                        .select('*')
                        .eq('is_catalog_item', true)
                        .eq('organization_id', orgId)
                        .order('name')
                    
                    if (catalogItems) setCatalog(catalogItems as ServiceCatalogItem[])
                }
            } catch (err) {
                console.error("Data fetching error:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Mode: If prefillLeadId is provided, we're in lead-only mode (no client required)
    const isLeadOnlyMode = Boolean(prefillLeadId)

    // --- Client Logic ---
    const checkDuplicatePhone = async (phone: string): Promise<any | null> => {
        if (!phone || phone.length < 7) {
            setDuplicateWarning(null)
            return null
        }

        // Clean phone for fuzzy search
        const clean = phone.replace(/\D/g, '')
        
        // Search in already loaded clients
        const localMatch = clients.find(c => c.phone?.includes(clean) || (c.phone && clean.includes(c.phone.replace(/\D/g, ''))))
        if (localMatch) {
            setDuplicateWarning(localMatch)
            return localMatch
        }

        // Search in DB if not found locally
        const { supabase } = await import('@/modules/core/database/supabase')
        const { getCurrentOrganizationId } = await import('@/modules/core/organizations/organization-actions')
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return null

        const { data: clientData } = await supabase
            .from('leads')
            .select('*')
            .eq('organization_id', orgId)
            .ilike('phone', `%${clean}%`)
            .limit(1)
            .maybeSingle()

        if (clientData) {
            const dbClean = clientData.phone?.replace(/\D/g, '') || ''
            if (dbClean.endsWith(clean) || clean.endsWith(dbClean)) {
                setDuplicateWarning(clientData)
                return clientData
            }
        }

        setDuplicateWarning(null)
        return null
    }

    const openCreateProspect = () => {
        setProspectData(prev => ({ ...prev, name: clientSearchTerm }))
        setIsProspectDialogOpen(true)
        setClientSearchOpen(false)
        setDuplicateWarning(null)
    }

    const handleUseDuplicate = async () => {
        if (!duplicateWarning) return

        if ((duplicateWarning as any).isLead) {
            const toastId = toast.loading("Convirtiendo lead a cliente...")
            try {
                const { supabase } = await import('@/modules/core/database/supabase')
                const { data: { user } } = await supabase.auth.getUser()

                // Convert Lead to Client (Create Client from Lead data)
                const res = await quickCreateProspect({
                    name: duplicateWarning.name,
                    phone: duplicateWarning.phone || "",
                    email: (duplicateWarning as any).email || "",
                    userId: user?.id || ""
                })

                if (res.success && res.client) {
                    setClients(prev => [...prev, res.client])
                    setSelectedClientId(res.client.id)
                    toast.success(`Lead ${duplicateWarning.name} convertido a Cliente`, { id: toastId })
                } else {
                    toast.error("Error al convertir lead: " + res.error, { id: toastId })
                    return
                }
            } catch (e: any) {
                console.error(e)
                toast.error("Error en conversión", { id: toastId })
                return
            }
        } else {
            // Existing Client
            if (!clients.find(c => c.id === duplicateWarning.id)) {
                setClients(prev => [...prev, duplicateWarning])
            }
            setSelectedClientId(duplicateWarning.id)
            toast.info(`Cliente existente seleccionado: ${duplicateWarning.name}`)
        }

        setIsProspectDialogOpen(false)
        setClientSearchOpen(false)
        setDuplicateWarning(null)
    }

    const handleCreateProspect = async () => {
        if (!prospectData.name) return

        // Blocking Check
        const dup = await checkDuplicatePhone(prospectData.phone)
        if (dup) {
            toast.warning(`El número ya existe (${dup.name}). Usa el botón 'Usar Existente'.`)
            return
        }

        setLoading(true)
        try {
            const { supabase } = await import('@/modules/core/database/supabase')
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
            frequency: service.frequency || undefined
        }
        setItems(newItems)
    }

    // --- Totals ---
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const recurringTotal = items.filter(i => i.is_recurring).reduce((sum, i) => sum + (i.price * i.quantity), 0)
    const setupTotal = items.filter(i => !i.is_recurring).reduce((sum, i) => sum + (i.price * i.quantity), 0)

    // --- Save ---
    const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
        // If in lead mode, don't require client. Otherwise require client.
        if (!isLeadOnlyMode && !selectedClientId) return toast.error(t('invoicing.toasts.select_client'))
        if (items.length === 0) return toast.error(t('quotes.builder.empty_items_message'))
        // if (!selectedEmitterId) return toast.error("Selecciona una identidad de facturación") // Optional check

        setLoading(true)
        try {
            const quoteData = {
                client_id: selectedClientId || undefined, // Optional when in lead mode
                emitter_id: selectedEmitterId || undefined,
                items: items,
                total: total,
                date: new Date(date).toISOString(),
                lead_id: prefillLeadId || undefined, // Link to lead if provided
                // valid_until: expirationDate.toISOString(), // Column not in DB yet
            }

            let response;
            if (existingQuote && existingQuote.id) {
                response = await updateQuote(existingQuote.id, quoteData)
            } else {
                response = await createQuote(quoteData)
            }

            if (!response.success) {
                throw new Error(response.error)
            }

            // For create, we get data back. For update, we might not, but success is true.
            // If update, we use existing ID.
            const quoteId = existingQuote ? existingQuote.id : (response as any).data?.id

            toast.success(existingQuote ? "Cotización actualizada" : t('invoicing.toasts.created_success'))

            if (onSuccess) {
                onSuccess()
            } else {
                router.push(`/quotes/${quoteId}`)
            }
        } catch (error: any) {
            console.error(error)
            toast.error((existingQuote ? "Error al actualizar" : t('invoicing.toasts.error_create')) + ": " + error.message)
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
            "flex flex-col h-full text-slate-900 dark:text-zinc-100",
            mode === 'sheet' ? "bg-white dark:bg-[#0a0a0a] dark:border dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl" : "pb-20 bg-zinc-50/50 dark:bg-zinc-950"
        )}>

            {/* --- Sticky Header --- */}
            <div className={cn(
                "sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5",
                mode === 'sheet' ? "bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5" : "bg-white/80 dark:bg-zinc-900/80 border-b dark:border-zinc-800"
            )}>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-yellow-500/10 rounded-xl text-yellow-600 dark:text-yellow-400 shrink-0">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t('quotes.builder.title')}</h2>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">{t('quotes.builder.subtitle')}</p>
                    </div>
                </div>
            </div>

            {/* --- Main Content Grid --- */}
            <div className="flex-1 overflow-hidden">
                <div className="h-full grid grid-cols-1 lg:grid-cols-12 divide-x divide-zinc-100/50">

                    {/* LEFT COLUMN: Editing Area (2/3) */}
                    <div className="lg:col-span-8 overflow-y-auto p-8 space-y-8 h-full relative scrollbar-thin scrollbar-thumb-zinc-200">

                        {/* 0. Emitter & Date Row */}
                        <div className="flex gap-6">
                            {/* Emitter Selector */}
                            <div className="space-y-3 flex-1">
                                <Label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest pl-1">{t('quotes.builder.emitter_section_label')}</Label>
                                <Popover open={emitterOpen} onOpenChange={setEmitterOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between h-11 bg-white/50 border-zinc-200"
                                        >
                                            <span className="flex items-center gap-2 text-zinc-600">
                                                <Building2 className="h-4 w-4 text-zinc-400" />
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
                                <Label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest pl-1">{t('quotes.builder.date_section_label')}</Label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="bg-white/50 border-zinc-200 h-11 rounded-xl shadow-sm focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* 1. Client Selection */}
                        <section className="space-y-4">
                            <Label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest pl-1">{t('quotes.builder.client_section_label')}</Label>

                            {isLeadOnlyMode ? (
                                <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4 flex items-center space-x-3">
                                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                        {prefillLeadName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-zinc-900">{prefillLeadName}</span>
                                        <span className="text-xs text-blue-600 font-medium bg-blue-100/50 px-2 py-0.5 rounded-full w-fit mt-1">
                                            Lead en Pipeline
                                        </span>
                                        <span className="text-xs text-zinc-400 mt-1">
                                            Se vinculará directamente al lead sin crear contacto.
                                        </span>
                                    </div>
                                </div>
                            ) : selectedClientId ? (
                                // Active Client Card
                                <div className="group relative flex items-start justify-between p-4 rounded-2xl border border-indigo-100/50 bg-indigo-50/20 hover:bg-indigo-50/40 hover:border-indigo-200/60 transition-all shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-100/80 flex items-center justify-center text-indigo-600 font-bold text-lg shadow-inner">
                                            {selectedClientName?.[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-zinc-900">{selectedClientName}</h3>
                                            <p className="text-sm text-zinc-500">{clients.find(c => c.id === selectedClientId)?.email || "Sin email registrado"}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedClientId("")}
                                        className="text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        Cambiar
                                    </Button>
                                </div>
                            ) : (
                                // Client Search Input
                                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between h-16 text-base bg-white/60 border-dashed border-zinc-300 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all rounded-2xl"
                                        >
                                            <span className="flex items-center gap-3 text-muted-foreground pl-2">
                                                <div className="bg-zinc-100 p-1.5 rounded-md">
                                                    <UserPlus className="h-4 w-4 text-zinc-500" />
                                                </div>
                                                {t('quotes.builder.search_client_placeholder')}
                                            </span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 rounded-xl shadow-xl border-zinc-100" align="start">
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
                                                                <span className="font-medium text-zinc-900">{client.name}</span>
                                                                {client.company_name && <span className="text-xs text-muted-foreground text-zinc-500">{client.company_name}</span>}
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
                                                            {t('quotes.builder.create_prospect_label')}: "{clientSearchTerm}"
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
                                <Label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Items del Proyecto</Label>
                            </div>

                            <div className="border border-zinc-200/60 rounded-2xl overflow-hidden bg-white/40 shadow-sm ring-1 ring-black/5">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-zinc-50/80 border-b border-zinc-200/60 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                    <div className="col-span-10 md:col-span-5">{t('quotes.builder.item_service_header')}</div>
                                    <div className="hidden md:block col-span-2">{t('quotes.builder.item_type_header')}</div>
                                    <div className="col-span-2 text-center">{t('quotes.builder.item_quantity_header')}</div>
                                    <div className="hidden md:block col-span-2 text-right">{t('quotes.builder.item_price_header')}</div>
                                    <div className="col-span-1 md:col-span-1 text-center"></div>
                                </div>

                                {/* Items List */}
                                <div className="divide-y divide-zinc-100/80">
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
                                                                    "w-full justify-between font-normal text-left h-auto py-2.5 px-3 hover:bg-zinc-100/50 rounded-lg",
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
                                                                                {s.base_price > 0 && <span className="ml-auto text-xs text-zinc-400 font-mono">${s.base_price.toLocaleString()}</span>}
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
                                                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                                            {item.is_recurring ? t('quotes.builder.recurring') : t('quotes.builder.one_time')}
                                                        </span>
                                                    </div>
                                                    {item.is_recurring && (
                                                        <Select value={item.frequency || 'monthly'} onValueChange={(v) => updateItem(index, 'frequency', v)}>
                                                            <SelectTrigger className="h-7 text-[10px] bg-indigo-50/50 border-none text-indigo-700 font-medium rounded-lg"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="biweekly">{t('quotes.builder.frequency.biweekly')}</SelectItem>
                                                                <SelectItem value="monthly">{t('quotes.builder.frequency.monthly')}</SelectItem>
                                                                <SelectItem value="quarterly">{t('quotes.builder.frequency.quarterly')}</SelectItem>
                                                                <SelectItem value="semiannual">{t('quotes.builder.frequency.semiannual')}</SelectItem>
                                                                <SelectItem value="yearly">{t('quotes.builder.frequency.yearly')}</SelectItem>
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
                                                        className="text-center h-9 border-zinc-100 bg-zinc-50/30 rounded-lg focus:bg-white transition-all"
                                                    />
                                                </div>

                                                {/* Price */}
                                                <div className="col-span-6 md:col-span-2 relative">
                                                    <span className="absolute left-3 top-2.5 text-zinc-400 text-xs">$</span>
                                                    <Input
                                                        className="pl-6 text-right h-9 font-mono border-zinc-100 bg-zinc-50/30 rounded-lg focus:bg-white transition-all"
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
                                                        className="text-zinc-300 hover:text-red-500 hover:bg-red-50 h-8 w-8 rounded-full"
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
                                        className="w-full py-4 bg-zinc-50/30 hover:bg-white border-t border-zinc-100 text-xs font-semibold text-zinc-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        <Plus className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                        {t('quotes.builder.add_item_button')}
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
                            <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <FileText className="h-3 w-3" />
                                {t('quotes.builder.summary_title')}
                            </h3>

                            {items.length === 0 ? (
                                <div className="text-center py-20 opacity-40">
                                    <div className="bg-slate-200/50 h-24 w-24 mx-auto rounded-full flex items-center justify-center mb-4">
                                        <Plus className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">{t('quotes.builder.empty_items_message')}</p>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* 1. Items List Summary */}
                                    <div className="space-y-3">
                                        {items.map((item, i) => (
                                            <div key={i} className="flex justify-between text-sm group">
                                                <span className="text-zinc-600 truncate max-w-[180px] font-medium">{item.description || "Item sin nombre"}</span>
                                                <span className="font-mono text-zinc-900">${(item.quantity * item.price).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="h-px bg-slate-200 w-full my-6" />

                                    {/* 2. Grouped Breakdown */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-zinc-500">{t('quotes.builder.setup_label')}</span>
                                            <span className="font-medium text-zinc-900">${setupTotal.toLocaleString()}</span>
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
                                                    {t(`quotes.builder.frequency.${freq}` as any) || freq}
                                                </span>
                                                <span className="font-bold text-zinc-900 font-mono text-sm">${amount.toLocaleString()}</span>
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
                                    <span className="text-sm font-medium text-zinc-500">{t('quotes.builder.projected_total_label')}</span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-5xl font-bold text-slate-900 tracking-tighter leading-none">${total.toLocaleString()}</span>
                                    <span className="text-[10px] text-zinc-400 font-medium px-2 py-1 bg-white/50 rounded-full mt-2">COP</span>
                                </div>
                            </div>

                            <Button
                                className="w-full h-14 text-base font-bold bg-slate-900 hover:bg-black text-white shadow-xl shadow-indigo-900/10 transition-all hover:scale-[1.01] active:scale-[0.99] rounded-2xl"
                                onClick={() => handleSave('draft')}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : t('quotes.builder.save_draft_button')}
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
                                onChange={(e) => {
                                    const val = e.target.value
                                    setProspectData({ ...prospectData, phone: val })
                                    if (duplicateWarning) setDuplicateWarning(null) // Clear warning on edit
                                }}
                                onBlur={(e) => checkDuplicatePhone(e.target.value)}
                            />
                            {duplicateWarning && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex flex-col gap-2 animate-in fade-in">
                                    <div className="flex items-center gap-2 text-amber-800 font-medium">
                                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                                        Este número ya pertenece a:
                                    </div>
                                    <div className="pl-4 text-zinc-600 font-bold">{duplicateWarning.name} {duplicateWarning.isLead ? '(Lead)' : ''}</div>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="w-full bg-amber-100/50 hover:bg-amber-100 text-amber-900 border-amber-200"
                                        onClick={handleUseDuplicate}
                                    >
                                        {duplicateWarning.isLead ? 'Convertir & Usar Lead' : 'Usar Cliente Existente'}
                                    </Button>
                                </div>
                            )}
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


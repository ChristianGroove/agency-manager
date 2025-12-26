"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2, Plus, ArrowLeft, Check, ChevronsUpDown } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { ServiceCatalogSelector } from "./service-catalog-selector"
import { Service } from "@/types"
import { logDomainEventAction } from "@/app/actions/log-actions"

export interface AddServiceModalProps {
    clientId?: string
    clientName?: string
    onSuccess?: () => void
    trigger?: React.ReactNode
    serviceToEdit?: any
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

// ... (previous imports)

export function AddServiceModal({ clientId, clientName, onSuccess, trigger, serviceToEdit, open, onOpenChange }: AddServiceModalProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = open !== undefined
    const isOpen = isControlled ? open : internalOpen

    const handleOpenChange = (value: boolean) => {
        if (onOpenChange) onOpenChange(value)
        if (!isControlled) setInternalOpen(value)
    }

    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'catalog' | 'form'>('catalog')

    // Client Selection Logic (if clientId not provided)
    const [clients, setClients] = useState<any[]>([])
    const [selectedClientId, setSelectedClientId] = useState<string>("")
    const [isLoadingClients, setIsLoadingClients] = useState(false)

    // Form State
    const [formData, setFormData] = useState<Partial<Service>>({
        name: "",
        description: "",
        amount: 0,
        quantity: 1, // Default quantity
        type: 'recurring',
        frequency: 'monthly',
        status: 'active',
        service_start_date: new Date().toISOString()
    })

    // Separate Unit Price State for calculation
    const [unitPrice, setUnitPrice] = useState<number>(0)

    // Recalculate total amount when quantity or unit price changes
    useEffect(() => {
        if (formData.quantity !== undefined && unitPrice !== undefined) {
            const total = unitPrice * formData.quantity
            setFormData(prev => ({ ...prev, amount: total }))
        }
    }, [formData.quantity, unitPrice])


    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            // Reset to default on close
            setStep('catalog')
            setFormData({
                name: "",
                description: "",
                amount: 0,
                quantity: 1,
                type: 'recurring',
                frequency: 'monthly',
                status: 'active'
            })
            setUnitPrice(0)
            if (!clientId) setSelectedClientId("")
        } else {
            // Load clients if we don't have a fixed clientId
            if (!clientId) {
                fetchClients()
            }
        }
    }, [isOpen, clientId])

    const fetchClients = async () => {
        setIsLoadingClients(true)
        const { data, error } = await supabase
            .from('clients')
            .select('id, name, company_name')
            .is('deleted_at', null)
            .order('name', { ascending: true })

        if (!error && data) {
            setClients(data)
        }
        setIsLoadingClients(false)
    }

    // Emitter Logic
    const [emitters, setEmitters] = useState<any[]>([])
    const [selectedEmitterId, setSelectedEmitterId] = useState<string>("")
    const [derivedDocType, setDerivedDocType] = useState<string>("")

    // Load active emitters
    useEffect(() => {
        import("@/lib/actions/emitters").then(async (mod) => {
            const data = await mod.getActiveEmitters()
            setEmitters(data)

            // Auto-select if only 1 active emitter
            if (data.length === 1) {
                const single = data[0]
                setSelectedEmitterId(single.id)
                import("@/lib/billing-utils").then(utils => {
                    setDerivedDocType(utils.getEmitterDocumentType(single.emitter_type))
                })
            }
        })
    }, [])

    // Update derived type when selection changes (if > 1)
    useEffect(() => {
        if (!selectedEmitterId) return
        const emitter = emitters.find(e => e.id === selectedEmitterId)
        if (emitter) {
            import("@/lib/billing-utils").then(utils => {
                setDerivedDocType(utils.getEmitterDocumentType(emitter.emitter_type))
            })
        }
    }, [selectedEmitterId, emitters])


    // Load service to edit
    useEffect(() => {
        if (serviceToEdit && isOpen) {
            setStep('form')
            const qty = serviceToEdit.quantity || 1
            const amount = serviceToEdit.amount || 0
            setFormData({
                name: serviceToEdit.name,
                description: serviceToEdit.description || "",
                amount: amount,
                quantity: qty,
                type: serviceToEdit.type || 'recurring',
                frequency: serviceToEdit.frequency || 'monthly',
                status: serviceToEdit.status || 'active',
                service_start_date: serviceToEdit.service_start_date || new Date().toISOString()
            })
            // Reverse calculate unit price if possible, or just assume amount matches
            setUnitPrice(qty > 0 ? (amount / qty) : 0)

            // Load existing emitter if present
            if (serviceToEdit.emitter_id) {
                setSelectedEmitterId(serviceToEdit.emitter_id)
            }

            // If editing and no prop clientId, invoke update logic if needed
            // But usually serviceToEdit implies we know the client or it's attached. 
            // The service object usually has client_id. 
            // We should ideally set selectedClientId if editing.
            if (!clientId && serviceToEdit.client_id) {
                setSelectedClientId(serviceToEdit.client_id)
            }

        } else if (!serviceToEdit && isOpen) {
            setStep('catalog')
            setFormData({
                name: "",
                description: "",
                amount: 0,
                quantity: 1,
                type: 'recurring',
                frequency: 'monthly',
                status: 'active'
            })
            setUnitPrice(0)

            // Re-apply default if single emitter exists
            if (emitters.length === 1) {
                setSelectedEmitterId(emitters[0].id)
            } else {
                setSelectedEmitterId("")
            }
        }
    }, [serviceToEdit, isOpen, emitters, clientId]) // Added emitters dep

    const handleCatalogSelect = (item: any) => {
        const initialQty = 1
        const initialPrice = item.base_price || 0
        setUnitPrice(initialPrice)
        setFormData({
            ...formData,
            name: item.name,
            description: item.description || "",
            amount: initialPrice * initialQty,
            quantity: initialQty,
            type: item.type,
            frequency: item.frequency || 'monthly',
        })
        setStep('form')
    }

    const [retroactiveModalOpen, setRetroactiveModalOpen] = useState(false)
    const [retroactiveStrategy, setRetroactiveStrategy] = useState<'start_from_today' | 'generate_overdue' | 'register_only' | null>('start_from_today')
    const [elapsedCycles, setElapsedCycles] = useState(0)

    const checkRetroactiveRisk = () => {
        // Only for recurring services with past start date
        if (formData.type !== 'recurring' || !formData.service_start_date) return false

        const start = new Date(formData.service_start_date)
        const today = new Date()
        const diffTime = today.getTime() - start.getTime()

        // If start date is future or today, no risk
        if (diffTime <= 0) return false

        // Calculate potential elapsed cycles
        // Simple estimation based on frequency
        let monthsElapsed = 0
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (formData.frequency === 'monthly') monthsElapsed = diffDays / 30
        else if (formData.frequency === 'biweekly') monthsElapsed = diffDays / 14
        else if (formData.frequency === 'quarterly') monthsElapsed = diffDays / 90
        else if (formData.frequency === 'semiannual') monthsElapsed = diffDays / 180
        else if (formData.frequency === 'yearly') monthsElapsed = diffDays / 365

        if (monthsElapsed >= 1) {
            setElapsedCycles(Math.floor(monthsElapsed))
            return true
        }
        return false
    }

    const confirmRetroactiveStrategy = async () => {
        setRetroactiveModalOpen(false)
        await executeSaveService(retroactiveStrategy)
    }

    const handleSaveService = async () => {
        if (!serviceToEdit && checkRetroactiveRisk()) {
            setRetroactiveModalOpen(true)
            return
        }
        await executeSaveService(null)
    }

    const executeSaveService = async (strategy: 'start_from_today' | 'generate_overdue' | 'register_only' | null) => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                alert("Sesión expirada")
                return
            }

            // Determine final Client ID
            const finalClientId = clientId || selectedClientId

            if (!finalClientId) {
                alert("Error: Debes seleccionar un cliente.")
                setLoading(false)
                return
            }

            // Validate Emitter Selection
            if (!selectedEmitterId) {
                alert("Debes seleccionar un Emisor para este servicio")
                setLoading(false)
                return
            }

            let startDate = formData.service_start_date ? new Date(formData.service_start_date) : new Date()
            let billingCycleStart = startDate

            // Strategy Adjustment
            if (strategy === 'start_from_today') {
                billingCycleStart = new Date() // Reset billing anchor to Today
            }

            // Calculate Cycle Dates based on Adjusted Start
            const cycleStart = billingCycleStart
            let cycleEnd = new Date(billingCycleStart)
            if (formData.frequency === 'biweekly') cycleEnd.setDate(cycleEnd.getDate() + 14)
            else if (formData.frequency === 'quarterly') cycleEnd.setMonth(cycleEnd.getMonth() + 3)
            else if (formData.frequency === 'semiannual') cycleEnd.setMonth(cycleEnd.getMonth() + 6)
            else if (formData.frequency === 'yearly') cycleEnd.setFullYear(cycleEnd.getFullYear() + 1)
            else cycleEnd.setMonth(cycleEnd.getMonth() + 1) // Default monthly

            const nextBillingDate = cycleEnd

            // Apply Strategy Metadata
            const metadata = {
                billing_start_strategy: strategy,
                original_input_start_date: formData.service_start_date,
                strategy_applied_at: new Date().toISOString()
            }

            const serviceData = {
                client_id: finalClientId,
                name: formData.name,
                description: formData.description,
                amount: formData.amount,
                quantity: formData.quantity,
                type: formData.type,
                frequency: formData.type === 'recurring' ? formData.frequency : null,
                status: formData.status,
                emitter_id: selectedEmitterId,
                document_type: derivedDocType,
                service_start_date: startDate.toISOString(),
                billing_cycle_start_date: billingCycleStart.toISOString(),
                next_billing_date: nextBillingDate.toISOString(),
                metadata: strategy ? metadata : {}
            }

            let result
            let serviceId = null

            if (serviceToEdit) {
                // Update
                result = await supabase
                    .from('services')
                    .update(serviceData)
                    .eq('id', serviceToEdit.id)
                    .select()
                    .single()

                if (result.data) serviceId = result.data.id
            } else {
                // Insert
                result = await supabase
                    .from('services')
                    .insert(serviceData)
                    .select()
                    .single()

                if (result.data) serviceId = result.data.id
            }

            if (result.error) throw result.error

            // --- CYCLES LOGIC ---

            if (formData.type === 'recurring' && !serviceToEdit && serviceId) {

                // Strategy: Generate Overdue Invoices
                if (strategy === 'generate_overdue') {
                    // Logic relies on the "Lazy Evaluator"
                }

                const { error: cycleError } = await supabase.from('billing_cycles').insert({
                    service_id: serviceId,
                    start_date: cycleStart.toISOString(),
                    end_date: cycleEnd.toISOString(),
                    due_date: new Date(cycleEnd.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                    amount: formData.amount,
                    status: 'pending'
                })

                if (cycleError) {
                    console.error("Error creating billing cycle:", cycleError)
                    alert(`Servicio creado, pero error al iniciar ciclo: ${cycleError.message}`)
                }
            } else if (formData.type === 'one_off' && !serviceToEdit && serviceId) {
                // Legacy flow for One-Off: Invoice Immediately
                const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
                const dueDate = new Date()
                dueDate.setDate(dueDate.getDate() + 15)

                const { data: invData, error: invError } = await supabase.from('invoices').insert({
                    client_id: finalClientId,
                    service_id: serviceId,
                    emitter_id: selectedEmitterId,
                    document_type: derivedDocType,
                    number: invoiceNumber,
                    date: new Date().toISOString(),
                    due_date: dueDate.toISOString(),
                    status: 'pending',
                    total: formData.amount,
                    items: [{
                        description: `${formData.name} (Pago único)`,
                        quantity: formData.quantity || 1,
                        price: unitPrice
                    }]
                }).select().single()

                if (invError) {
                    console.error(invError)
                    alert(`Error generando factura: ${invError.message}`)
                }
            }

            // Success
            await logDomainEventAction({
                entity_type: 'service',
                entity_id: serviceId,
                event_type: serviceToEdit ? 'service.updated' : 'service.created',
                payload: {
                    name: formData.name,
                    amount: formData.amount,
                    type: formData.type,
                    frequency: formData.frequency,
                    strategy: strategy
                }
            })

            if (onSuccess) onSuccess()
            handleOpenChange(false)
            setStep('catalog')

        } catch (error: any) {
            console.error("Error saving service:", error)
            alert(`Error al guardar el servicio: ${error.message || error}`)
        } finally {
            setLoading(false)
        }
    }



    // Render logic
    const isEditing = !!serviceToEdit

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                {trigger !== null && (
                    <DialogTrigger asChild>
                        {trigger === undefined ? (
                            <Button className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                                <Plus className="mr-2 h-4 w-4" />
                                Añadir Servicio
                            </Button>
                        ) : (
                            trigger
                        )}
                    </DialogTrigger>
                )}
                {/* Existing Dialog Content... */}
                <DialogContent className={cn("transition-all duration-300", step === 'catalog' && !isEditing ? "sm:max-w-4xl p-0 bg-transparent shadow-none border-0" : "sm:max-w-[600px]")}>
                    {step === 'catalog' && !isEditing ? (
                        <>
                            <DialogTitle className="sr-only">Seleccionar Servicio</DialogTitle>
                            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                                <ServiceCatalogSelector
                                    onSelect={handleCatalogSelect}
                                    onCancel={() => handleOpenChange(false)}
                                />
                                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-center">
                                    <Button variant="link" onClick={() => setStep('form')} className="text-gray-500 hover:text-brand-pink">
                                        Omitir catálogo y crear desde cero
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle>{isEditing ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
                                <DialogDescription>
                                    {isEditing ? "Modifica los detalles del servicio existente." : "Configura los detalles del nuevo servicio para este cliente."}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-6 py-4">
                                {/* ... Existing Fields ... */}
                                {/* NEW: Emitter Selection Block (Moved First) */}
                                {emitters.length > 0 && (
                                    <div className="space-y-2 bg-slate-50 p-3 rounded-md border border-slate-100">
                                        <Label>Emisor de Facturación</Label>
                                        {emitters.length === 1 ? (
                                            <div className="text-sm font-medium text-slate-700 flex flex-col">
                                                <span>{emitters[0].display_name}</span>
                                                <span className="text-xs text-muted-foreground font-normal">
                                                    Se generará: {derivedDocType === 'FACTURA_ELECTRONICA' ? 'Factura Electrónica' : 'Cuenta de Cobro'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2 sm:col-span-1">
                                                    <Select
                                                        value={selectedEmitterId}
                                                        onValueChange={setSelectedEmitterId}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar Emisor" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {emitters.map(e => (
                                                                <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {selectedEmitterId && (
                                                    <div className="flex items-center text-xs text-slate-500">
                                                        Generará: {derivedDocType === 'FACTURA_ELECTRONICA' ? <strong>Factura Electrónica</strong> : <strong>Cuenta de Cobro</strong>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Client Selection (Searchable) - If no clientId prop */}
                                {!clientId && (
                                    <div className="space-y-2 flex flex-col">
                                        <Label>Cliente Asignado</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "w-full justify-between",
                                                        !selectedClientId && "text-muted-foreground"
                                                    )}
                                                    disabled={isEditing || isLoadingClients}
                                                >
                                                    {selectedClientId
                                                        ? clients.find((client) => client.id === selectedClientId)?.company_name ||
                                                        clients.find((client) => client.id === selectedClientId)?.name
                                                        : isLoadingClients ? "Cargando clientes..." : "Buscar cliente..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Buscar por nombre o empresa..." />
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
                                                                    <div className="flex flex-col">
                                                                        <span>{client.name}</span>
                                                                        {client.company_name && (
                                                                            <span className="text-xs text-muted-foreground">{client.company_name}</span>
                                                                        )}
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}

                                {/* Service Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre del Servicio</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ej. Hosting Premium, Diseño Web..."
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                {/* Service Start Date (Model A+) */}
                                <div className="space-y-2 flex flex-col">
                                    <Label>Fecha de Inicio del Servicio</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !formData.service_start_date && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {formData.service_start_date ? format(new Date(formData.service_start_date), "PPP") : <span>Seleccionar fecha</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={formData.service_start_date ? new Date(formData.service_start_date) : undefined}
                                                onSelect={(date) => setFormData({ ...formData, service_start_date: date ? date.toISOString() : undefined })}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <p className="text-xs text-muted-foreground">
                                        Determina el inicio del ciclo. La primera factura se generará al completar el periodo.
                                    </p>
                                </div>

                                {/* Service Type & Frequency */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo de Servicio</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="recurring">Recurrente (Suscripción)</SelectItem>
                                                <SelectItem value="one_off">Único (One-time)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.type === 'recurring' && (
                                        <div className="space-y-2">
                                            <Label>Frecuencia de Cobro</Label>
                                            <Select
                                                value={formData.frequency}
                                                onValueChange={(val: any) => setFormData({ ...formData, frequency: val })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="monthly">Mensual</SelectItem>
                                                    <SelectItem value="biweekly">Quincenal</SelectItem>
                                                    <SelectItem value="quarterly">Trimestral</SelectItem>
                                                    <SelectItem value="semiannual">Semestral</SelectItem>
                                                    <SelectItem value="yearly">Anual</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                {/* Pricing Section - Unit Price & Quantity */}
                                <div className="grid grid-cols-12 gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    {/* Unit Price */}
                                    <div className="col-span-12 sm:col-span-5 space-y-2">
                                        <Label htmlFor="unitPrice">Precio Unitario</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                                            <Input
                                                id="unitPrice"
                                                type="number"
                                                placeholder="0.00"
                                                className="pl-7 bg-white"
                                                value={unitPrice || ''}
                                                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    {/* Operator */}
                                    <div className="hidden sm:flex col-span-1 items-center justify-center pb-3 text-gray-400 font-bold">×</div>

                                    {/* Quantity */}
                                    <div className="col-span-12 sm:col-span-2 space-y-2">
                                        <Label htmlFor="quantity">Cant/Hrs</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="1"
                                            placeholder="1"
                                            className="bg-white text-center"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 1 })}
                                        />
                                    </div>

                                    {/* Operator */}
                                    <div className="hidden sm:flex col-span-1 items-center justify-center pb-3 text-gray-400 font-bold">=</div>

                                    {/* Total Display (Read Only) */}
                                    <div className="col-span-12 sm:col-span-3 space-y-2">
                                        <Label className="text-gray-500">Total</Label>
                                        <div className="h-10 px-3 py-2 bg-gray-100 rounded-md border border-gray-200 text-gray-900 font-bold text-right flex items-center justify-end">
                                            ${(formData.amount || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>


                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description">Descripción (Opcional)</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Detalles del servicio, entregables, etc."
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
                                {!isEditing && (
                                    <Button variant="ghost" onClick={() => setStep('catalog')} size="sm" className="text-gray-500">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Volver al catálogo
                                    </Button>
                                )}
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                                    <Button onClick={handleSaveService} disabled={loading || !formData.name} className="bg-brand-pink text-white">
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isEditing ? "Guardar Cambios" : "Crear Servicio"}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* RETROACTIVE RISK MODAL */}
            <Dialog open={retroactiveModalOpen} onOpenChange={setRetroactiveModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            ⚠️ Servicio con ciclos anteriores
                        </DialogTitle>
                        <DialogDescription>
                            El servicio comienza en el pasado y tiene <strong>{elapsedCycles}</strong> ciclo{elapsedCycles !== 1 ? 's' : ''} que ya habrían finalizado.
                            Indica cómo deseas que el sistema gestione estos períodos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-4">
                            {/* Option 1: Start From Today */}
                            <div
                                className={cn(
                                    "p-4 border rounded-lg cursor-pointer transition-all",
                                    retroactiveStrategy === 'start_from_today' ? "border-brand-pink bg-brand-pink/5" : "border-gray-200 hover:border-gray-300"
                                )}
                                onClick={() => setRetroactiveStrategy('start_from_today')}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn("mt-0.5 w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center", retroactiveStrategy === 'start_from_today' && "border-brand-pink")}>
                                        {retroactiveStrategy === 'start_from_today' && <div className="w-2.5 h-2.5 rounded-full bg-brand-pink" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Iniciar cobros desde hoy (Recomendado)</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Ignora el pasado. El primer ciclo de cobro comienza hoy. Ideal para migraciones o carga administrativa.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Option 2: Generate Overdue */}
                            <div
                                className={cn(
                                    "p-4 border rounded-lg cursor-pointer transition-all",
                                    retroactiveStrategy === 'generate_overdue' ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-gray-300"
                                )}
                                onClick={() => setRetroactiveStrategy('generate_overdue')}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn("mt-0.5 w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center", retroactiveStrategy === 'generate_overdue' && "border-amber-500")}>
                                        {retroactiveStrategy === 'generate_overdue' && <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Generar facturas vencidas</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Se crearán facturas y notificaciones por los ciclos pasados. Afectará métricas históricas.
                                        </p>
                                        <p className="text-xs text-amber-600 mt-2 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                                            ⚠ Las cuentas de cobro se emitirán con la fecha actual, respetando el periodo histórico del servicio.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Option 3: Register Only */}
                            <div
                                className={cn(
                                    "p-4 border rounded-lg cursor-pointer transition-all",
                                    retroactiveStrategy === 'register_only' ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                                )}
                                onClick={() => setRetroactiveStrategy('register_only')}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn("mt-0.5 w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center", retroactiveStrategy === 'register_only' && "border-blue-500")}>
                                        {retroactiveStrategy === 'register_only' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Registrar servicio sin cobros</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Mantiene la fecha histórica original, pero no genera facturas pasadas. El próximo cobro será futuro.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRetroactiveModalOpen(false)}>Cancelar</Button>
                        <Button onClick={confirmRetroactiveStrategy} disabled={!retroactiveStrategy} className="bg-brand-pink text-white">
                            Confirmar y Crear
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )



}

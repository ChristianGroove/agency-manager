"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Calendar as CalendarIcon, Loader2, Plus, ArrowLeft, Check, ChevronsUpDown, Info, CreditCard } from "lucide-react"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ServiceCatalogSelector } from "@/modules/core/catalog/components/service-catalog-selector"
import { logDomainEventAction } from "@/modules/core/logging/actions"
import { ServiceRetroactiveModal } from "./service-retroactive-modal"

interface CreateServiceSheetProps {
    clientId?: string
    clientName?: string
    onSuccess?: () => void
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    serviceToEdit?: any
}

export function CreateServiceSheet({ clientId, clientName, onSuccess, trigger, open: controlledOpen, onOpenChange: setControlledOpen, serviceToEdit }: CreateServiceSheetProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const setOpen = (val: boolean) => {
        if (!isControlled) setInternalOpen(val)
        if (setControlledOpen) setControlledOpen(val)
    }

    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<'catalog' | 'form'>('catalog')
    const router = useRouter()

    // State
    const [clients, setClients] = useState<any[]>([])
    const [selectedClientId, setSelectedClientId] = useState<string>(clientId || "")
    const [isLoadingClients, setIsLoadingClients] = useState(false)
    const [emitters, setEmitters] = useState<any[]>([])
    const [selectedEmitterId, setSelectedEmitterId] = useState<string>("")
    const [derivedDocType, setDerivedDocType] = useState<string>("")
    const [retroactiveModalOpen, setRetroactiveModalOpen] = useState(false)
    const [pendingSaveData, setPendingSaveData] = useState<any>(null)

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        amount: 0,
        quantity: 1,
        type: 'recurring',
        frequency: 'monthly',
        status: 'active',
        insights_access: 'NONE', // NEW
        service_start_date: new Date().toISOString()
    })

    const [unitPrice, setUnitPrice] = useState<number>(0)

    // Derived Name for Display
    const displayClientName = clientId ? clientName : clients.find(c => c.id === selectedClientId)?.name

    // Effects
    useEffect(() => {
        if (!open) {
            setStep('catalog')
            setFormData({
                name: "", description: "", amount: 0, quantity: 1,
                type: 'recurring', frequency: 'monthly', status: 'active',
                insights_access: 'NONE',
                service_start_date: new Date().toISOString()
            })
            setUnitPrice(0)
            if (!clientId) setSelectedClientId("")
        } else {
            if (!clientId) fetchClients()
            loadEmitters()

            // Pre-fill if editing
            if (serviceToEdit) {
                setStep('form')
                setFormData({
                    name: serviceToEdit.name,
                    description: serviceToEdit.description || "",
                    amount: serviceToEdit.amount || 0,
                    quantity: serviceToEdit.quantity || 1,
                    type: serviceToEdit.type || 'recurring',
                    frequency: serviceToEdit.frequency || 'monthly',
                    status: serviceToEdit.status,
                    insights_access: serviceToEdit.insights_access || 'NONE',
                    service_start_date: serviceToEdit.service_start_date || new Date().toISOString()
                })
                setUnitPrice((serviceToEdit.amount || 0) / (serviceToEdit.quantity || 1))
                if (serviceToEdit.emitter_id) setSelectedEmitterId(serviceToEdit.emitter_id)
                if (serviceToEdit.client_id && !clientId) setSelectedClientId(serviceToEdit.client_id)
            }
        }
    }, [open, clientId, serviceToEdit])

    useEffect(() => {
        const total = (unitPrice || 0) * (formData.quantity || 1)
        setFormData(prev => ({ ...prev, amount: total }))
    }, [unitPrice, formData.quantity])

    const fetchClients = async () => {
        setIsLoadingClients(true)
        const { getCurrentOrganizationId } = await import('@/modules/core/organizations/actions')
        const orgId = await getCurrentOrganizationId()

        if (!orgId) {
            console.error('No organization context found')
            setIsLoadingClients(false)
            return
        }

        const { data } = await supabase
            .from('clients')
            .select('id, name, company_name')
            .eq('organization_id', orgId)
            .is('deleted_at', null)
            .order('name')
        if (data) setClients(data)
        setIsLoadingClients(false)
    }

    const loadEmitters = async () => {
        const mod = await import("@/modules/core/settings/emitters-actions")
        const data = await mod.getActiveEmitters()
        setEmitters(data)
        // Only set default if NOT editing
        if (data.length === 1 && !serviceToEdit) {
            setSelectedEmitterId(data[0].id)
            updateDocType(data[0])
        }
    }

    const updateDocType = async (emitter: any) => {
        const utils = await import("@/lib/billing-utils")
        setDerivedDocType(utils.getEmitterDocumentType(emitter.emitter_type))
    }

    useEffect(() => {
        if (!selectedEmitterId) return
        const emitter = emitters.find(e => e.id === selectedEmitterId)
        if (emitter) updateDocType(emitter)
    }, [selectedEmitterId, emitters])


    const handleCatalogSelect = (item: any) => {
        const initialPrice = item.base_price || 0
        setUnitPrice(initialPrice)
        setFormData(prev => ({
            ...prev,
            name: item.name,
            description: item.description || "",
            type: item.type,
            frequency: item.frequency || 'monthly',
        }))
        setStep('form')
    }

    const handleSave = async (strategy: 'RETROACTIVE' | 'IGNORE_PAST' | null = null) => {
        if (!formData.name) return toast.error("El nombre es requerido")
        const finalClient = clientId || selectedClientId
        if (!finalClient) return toast.error("Debes seleccionar un cliente")
        if (!selectedEmitterId) return toast.error("Debes seleccionar un emisor")

        // Date Check Interception
        const startDate = formData.service_start_date ? new Date(formData.service_start_date) : new Date()
        const today = new Date()

        // Check if date is in past (more than 24 hours to be safe)
        const isPastDate = startDate < new Date(today.getTime() - 24 * 60 * 60 * 1000)

        // If it's a past date AND we haven't selected a strategy yet AND it's a recurring service
        if (isPastDate && strategy === null && formData.type === 'recurring' && !serviceToEdit) {
            setRetroactiveModalOpen(true)
            return
        }

        // CRITICAL: Get organization context
        const { getCurrentOrganizationId } = await import('@/modules/core/organizations/actions')
        const orgId = await getCurrentOrganizationId()

        if (!orgId) return toast.error('No se encontró contexto de organización')

        setLoading(true)
        try {
            // Determine Billing Start based on strategy
            let billingStart = new Date() // Default: Today

            if (strategy === 'RETROACTIVE') {
                billingStart = startDate // Start billing from the past date
            } else if (strategy === 'IGNORE_PAST') {
                billingStart = new Date() // Start billing from now (ignore gap)
            } else {
                // Future dates or non-recurring
                billingStart = startDate < new Date() ? new Date() : startDate
            }

            // Calc Cycle End
            let cycleEnd = new Date(billingStart)
            if (formData.frequency === 'biweekly') cycleEnd.setDate(cycleEnd.getDate() + 14)
            else if (formData.frequency === 'quarterly') cycleEnd.setMonth(cycleEnd.getMonth() + 3)
            else if (formData.frequency === 'yearly') cycleEnd.setFullYear(cycleEnd.getFullYear() + 1)
            else cycleEnd.setMonth(cycleEnd.getMonth() + 1)

            const servicePayload = {
                organization_id: orgId, // CRITICAL FIX
                client_id: finalClient,
                name: formData.name,
                description: formData.description,
                amount: formData.amount,
                quantity: formData.quantity,
                type: formData.type,
                frequency: formData.type === 'recurring' ? formData.frequency : null,
                // status: 'active', // Don't reset status on edit unless intended
                insights_access: formData.insights_access,
                emitter_id: selectedEmitterId,
                document_type: derivedDocType,
                service_start_date: startDate.toISOString()
            }

            // Combine with create-specific fields if new
            const finalData = serviceToEdit ? { ...servicePayload } : {
                ...servicePayload,
                status: 'active',
                billing_cycle_start_date: billingStart.toISOString(),
                next_billing_date: cycleEnd.toISOString(),
                metadata: {
                    strategy: strategy || 'standard',
                    original_start: startDate.toISOString()
                }
            }

            let resultService;

            if (serviceToEdit) {
                // UPDATE
                const { data, error } = await supabase
                    .from('services')
                    .update(finalData)
                    .eq('id', serviceToEdit.id)
                    .select()
                    .single()

                if (error) throw error
                resultService = data
                toast.success("Servicio actualizado")
            } else {
                // INSERT
                const { data, error } = await supabase
                    .from('services')
                    .insert(finalData)
                    .select()
                    .single()

                if (error) throw error
                resultService = data

                // Create Cycle if recurring AND new
                if (formData.type === 'recurring') {
                    await supabase.from('billing_cycles').insert({
                        service_id: resultService.id,
                        start_date: billingStart.toISOString(),
                        end_date: cycleEnd.toISOString(),
                        due_date: new Date(cycleEnd.getTime() + 5 * 86400000).toISOString(),
                        amount: formData.amount,
                        status: 'pending'
                    })
                }
                toast.success("Servicio creado exitosamente")
            }

            await logDomainEventAction({
                entity_type: 'service',
                entity_id: resultService.id,
                event_type: serviceToEdit ? 'service.updated' : 'service.created',
                payload: { ...finalData, origin: 'sheet' }
            })

            setOpen(false)
            if (onSuccess) onSuccess()
            else router.refresh()

        } catch (error: any) {
            console.error(error)
            toast.error("Error al guardar: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button className="h-9 px-4 bg-brand-pink hover:bg-brand-pink/90 shadow-md text-white border-0">
                        <Plus className="mr-2 h-4 w-4" />
                        {serviceToEdit ? 'Editar Servicio' : 'Añadir Servicio'}
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[1000px] w-full p-0 gap-0 border-none shadow-2xl
                    fixed top-4 right-4 bottom-4 h-auto rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right
                    bg-transparent
                "
            >
                <SheetHeader className="hidden">
                    <SheetTitle>
                        {serviceToEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
                    </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-6 py-4 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-4">
                            {step === 'form' && !serviceToEdit && (
                                <Button variant="ghost" size="icon" onClick={() => setStep('catalog')} className="rounded-full h-8 w-8 -ml-2 hover:bg-white/50">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                    {serviceToEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {step === 'catalog' ? 'Selecciona una plantilla.' : 'Configura los detalles del contrato.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <div className={cn(
                            "h-full grid divide-x divide-gray-100/50",
                            step === 'catalog' ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-12"
                        )}>

                            {/* LEFT: FORM (OR CATALOG FULL WIDTH) */}
                            <div className={cn(
                                "overflow-y-auto h-full relative scrollbar-thin",
                                step === 'catalog' ? "col-span-1 p-0" : "lg:col-span-8 p-6"
                            )}>
                                {step === 'catalog' ? (
                                    <ServiceCatalogSelector onSelect={handleCatalogSelect} onCancel={() => setOpen(false)} />
                                ) : (
                                    <div className="space-y-8 max-w-2xl mx-auto">
                                        {/* Emitter & Client Section */}
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                                            {/* Client Selector (if not fixed) */}
                                            {!clientId && (
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase font-bold text-slate-500">Cliente</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" className="w-full justify-between bg-white" disabled={!!serviceToEdit}>
                                                                {displayClientName || "Seleccionar Cliente..."}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[400px] p-0" align="start">
                                                            <Command>
                                                                <CommandInput placeholder="Buscar cliente..." />
                                                                <CommandList>
                                                                    <CommandEmpty>No encontrado.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {clients.map(c => (
                                                                            <CommandItem key={c.id} onSelect={() => setSelectedClientId(c.id)}>
                                                                                <Check className={cn("mr-2 h-4 w-4", selectedClientId === c.id ? "opacity-100" : "opacity-0")} />
                                                                                {c.name} {c.company_name && `(${c.company_name})`}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            )}

                                            {/* Emitter Selector */}
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase font-bold text-slate-500">Emisor (Facturación)</Label>
                                                <Select value={selectedEmitterId} onValueChange={setSelectedEmitterId}>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Seleccionar empresa emisora" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {emitters.map(e => <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Service Details */}
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label className="font-semibold text-gray-700">Nombre del Servicio</Label>
                                                <Input
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    className="font-medium text-lg h-12"
                                                    placeholder="Ej. Hosting Anual"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label>Tipo</Label>
                                                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="recurring">Suscripción (Recurrente)</SelectItem>
                                                            <SelectItem value="one_off">Pago Único</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {formData.type === 'recurring' && (
                                                    <div className="space-y-2">
                                                        <Label>Frecuencia</Label>
                                                        <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="monthly">Mensual</SelectItem>
                                                                <SelectItem value="quarterly">Trimestral</SelectItem>
                                                                <SelectItem value="semiannual">Semestral</SelectItem>
                                                                <SelectItem value="yearly">Anual</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}

                                                <div className="space-y-2 col-span-2">
                                                    <Label>Acceso a Insights (Portal)</Label>
                                                    <Select value={formData.insights_access} onValueChange={(v) => setFormData({ ...formData, insights_access: v })}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="NONE">Sin Acceso</SelectItem>
                                                            <SelectItem value="ORGANIC">Solo Orgánico (Redes)</SelectItem>
                                                            <SelectItem value="ADS">Solo Ads (Publicidad)</SelectItem>
                                                            <SelectItem value="ALL">Todo (Ads + Orgánico)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-[10px] text-gray-500">
                                                        Activa pestañas automáticamente cuando este servicio está activo.
                                                    </p>
                                                </div>
                                            </div>



                                            {/* Pricing Line */}
                                            <div className="grid grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <div className="col-span-5 space-y-1">
                                                    <Label>Precio Unitario</Label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                                        <Input type="number" value={unitPrice || ''} onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)} className="pl-7 bg-white" />
                                                    </div>
                                                </div>
                                                <div className="col-span-2 text-center pb-2 text-gray-400 font-bold">×</div>
                                                <div className="col-span-5 space-y-1">
                                                    <Label>Total</Label>
                                                    <div className="h-10 px-3 flex items-center justify-end font-bold text-gray-900 bg-gray-100 rounded-md">
                                                        ${(formData.amount).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Inicio del Contrato</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start text-left font-normal border-gray-200">
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {format(new Date(formData.service_start_date), "PPP")}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={new Date(formData.service_start_date)} onSelect={d => d && setFormData({ ...formData, service_start_date: d.toISOString() })} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* RIGHT: SUMMARY (Visible only in form step) */}
                            {step === 'form' && (
                                <div className="hidden lg:flex lg:col-span-4 bg-slate-100/50 p-6 flex-col border-l border-white">
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                        <div className="text-center">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Resumen del Contrato</h3>
                                            <p className="text-sm text-slate-500">Vista previa de la facturación</p>
                                        </div>

                                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <CreditCard className="w-24 h-24" />
                                            </div>

                                            <div className="relative z-10">
                                                <p className="text-xs font-semibold text-brand-pink uppercase tracking-wide mb-2">
                                                    {formData.type === 'recurring' ? 'Suscripción Activa' : 'Pago Único'}
                                                </p>
                                                <h2 className="text-3xl font-bold text-gray-900 mb-1">
                                                    ${formData.amount.toLocaleString()}
                                                </h2>
                                                <p className="text-sm text-gray-500 mb-6">
                                                    {formData.type === 'recurring' ? `/ ${formData.frequency === 'monthly' ? 'Mes' : formData.frequency}` : 'Cobro único'}
                                                </p>

                                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Cliente</span>
                                                        <span className="font-medium text-gray-900 truncate max-w-[150px]">{displayClientName || "---"}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Inicio</span>
                                                        <span className="font-medium text-gray-900">{format(new Date(formData.service_start_date), "dd MMM yyyy")}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Facturación</span>
                                                        <span className="font-medium text-gray-900">{derivedDocType === 'FACTURA_ELECTRONICA' ? 'Electrónica' : 'Cuenta Cobro'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 text-blue-800 text-xs p-4 rounded-xl flex gap-3 items-start border border-blue-100">
                                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p>
                                                {serviceToEdit
                                                    ? 'Estás editando un servicio existente. Los cambios afectarán a las futuras facturaciones.'
                                                    : `Al crear este servicio, se generará ${formData.type === 'recurring' ? 'un ciclo de facturación pendiente' : 'una factura en borrador'} automáticamente.`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-between z-20">
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                        {step === 'form' && (
                            <Button onClick={() => handleSave(null)} disabled={loading} className="bg-black text-white px-8 rounded-xl hover:bg-gray-800">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {serviceToEdit ? 'Guardar Cambios' : 'Confirmar Servicio'}
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
            <ServiceRetroactiveModal
                isOpen={retroactiveModalOpen}
                onOpenChange={setRetroactiveModalOpen}
                startDate={new Date(formData.service_start_date)}
                onConfirm={handleSave}
            />
        </Sheet>
    )
}

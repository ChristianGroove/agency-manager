"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Loader2, Plus, ArrowLeft, Check, ChevronsUpDown, Info, FileText, Trash2, Building2, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getSettings } from "@/lib/actions/settings"
import { getActiveEmitters } from "@/lib/actions/emitters"
import { getEmitterDocumentType, getDocumentTypeLabel, isEmittersModuleEnabled } from "@/lib/billing-utils"
import { Calendar } from "@/components/ui/calendar"
import { InvoiceItem } from "@/types"

interface CreateInvoiceSheetProps {
    clientId?: string
    clientName?: string
    onSuccess?: () => void
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    invoiceToEdit?: any
    // Linking Props
    serviceId?: string
    cycleId?: string
    initialAmount?: number
    defaultDescription?: string
}

type UIInvoiceItem = InvoiceItem & { ui_id: string }

export function CreateInvoiceSheet({
    clientId,
    clientName,
    onSuccess,
    trigger,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    invoiceToEdit,
    serviceId,
    cycleId,
    initialAmount,
    defaultDescription
}: CreateInvoiceSheetProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const setOpen = (val: boolean) => {
        if (!isControlled) setInternalOpen(val)
        if (setControlledOpen) setControlledOpen(val)
    }

    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Data State
    const [clients, setClients] = useState<{ id: string, name: string, company_name?: string }[]>([])
    const [selectedClientId, setSelectedClientId] = useState<string>(clientId || "")
    const [emitters, setEmitters] = useState<any[]>([])
    const [selectedEmitterId, setSelectedEmitterId] = useState<string>("")
    const [derivedDocType, setDerivedDocType] = useState<string>("cuenta_cobro")
    const [settings, setSettings] = useState<any>({})

    // Form State
    const [invoiceNumber, setInvoiceNumber] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [items, setItems] = useState<UIInvoiceItem[]>([
        { ui_id: '1', description: defaultDescription || 'Servicios Profesionales', quantity: 1, price: initialAmount || 0 }
    ])

    // Derived Display Data
    const displayClient = clients.find(c => c.id === selectedClientId)
    const displayClientName = clientId ? clientName : (displayClient?.name || "")
    const displayValues = {
        subtotal: items.reduce((acc, item) => acc + (item.quantity * item.price), 0),
        tax: 0, // Simplified for now, can add tax logic if needed
        total: items.reduce((acc, item) => acc + (item.quantity * item.price), 0),
    }

    // --- Load Data ---
    useEffect(() => {
        if (open) {
            loadInitialData()
        } else {
            // Reset on close if not controlled or specifically needed? 
            // Better to reset only when opening new
        }
    }, [open])

    const loadInitialData = async () => {
        setLoading(true)
        try {
            // 1. Settings
            const settingsData = await getSettings()
            setSettings(settingsData)

            // 2. Clients (if needed)
            if (!clientId) {
                const { getCurrentOrganizationId } = await import('@/lib/actions/organizations')
                const orgId = await getCurrentOrganizationId()

                if (!orgId) {
                    console.error('No organization context found')
                    return
                }

                const { data } = await supabase
                    .from('clients')
                    .select('id, name, company_name')
                    .eq('organization_id', orgId)
                    .is('deleted_at', null)
                    .order('name')
                if (data) setClients(data)
            }

            // 3. Emitters
            if (isEmittersModuleEnabled()) {
                const activeEmitters = await getActiveEmitters()
                setEmitters(activeEmitters)

                // Auto-select logic
                if (activeEmitters.length === 1 && !selectedEmitterId && !invoiceToEdit) {
                    setSelectedEmitterId(activeEmitters[0].id)
                }
            }

            // 4. Pre-fill Form
            if (invoiceToEdit) {
                setInvoiceNumber(invoiceToEdit.number)
                setItems(invoiceToEdit.items.map((item: any, i: number) => ({ ...item, ui_id: `edit-${i}` })) || [])
                setDueDate(invoiceToEdit.due_date ? invoiceToEdit.due_date.split('T')[0] : "")
                setSelectedClientId(invoiceToEdit.client_id)
                if (invoiceToEdit.emitter_id) setSelectedEmitterId(invoiceToEdit.emitter_id)
            } else {
                // New Invoice Defaults
                if (!invoiceNumber) {
                    const prefix = settingsData.invoice_prefix || 'INV-'
                    const timestamp = Date.now()
                    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase()
                    setInvoiceNumber(`${prefix}${timestamp}-${randomSuffix}`)
                }

                if (!dueDate && settingsData.default_due_days) {
                    const d = new Date()
                    d.setDate(d.getDate() + (parseInt(settingsData.default_due_days) || 30))
                    setDueDate(d.toISOString().split('T')[0])
                }

                if (!items.length || (items.length === 1 && items[0].price === 0 && !defaultDescription)) {
                    setItems([{ ui_id: '1', description: defaultDescription || 'Servicios Profesionales', quantity: 1, price: initialAmount || 0 }])
                }
            }

        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    // --- Emitter Effect ---
    useEffect(() => {
        if (selectedEmitterId && emitters.length > 0) {
            const emitter = emitters.find(e => e.id === selectedEmitterId)
            if (emitter) {
                setDerivedDocType(getEmitterDocumentType(emitter.emitter_type))
            }
        }
    }, [selectedEmitterId, emitters])


    // --- Actions ---
    const addItem = () => {
        setItems([...items, {
            ui_id: Math.random().toString(36).substr(2, 9),
            description: "",
            quantity: 1,
            price: 0
        }])
    }

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.ui_id !== id))
        }
    }

    const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
        setItems(items.map(item =>
            item.ui_id === id ? { ...item, [field]: value } : item
        ))
    }

    const handleSave = async () => {
        const finalClient = clientId || selectedClientId
        if (!finalClient) return toast.error("Selecciona un cliente")
        if (isEmittersModuleEnabled() && !selectedEmitterId && emitters.length > 0) return toast.error("Selecciona un emisor")

        setLoading(true)
        try {
            const cleanItems = items.map(({ ui_id, ...item }) => item)

            let result;
            if (invoiceToEdit) {
                const { data, error } = await supabase
                    .from('invoices')
                    .update({
                        client_id: finalClient,
                        emitter_id: selectedEmitterId || null,
                        number: invoiceNumber,
                        due_date: dueDate || null,
                        items: cleanItems,
                        total: displayValues.total,
                        document_type: derivedDocType
                    })
                    .eq('id', invoiceToEdit.id)
                    .select().single()
                if (error) throw error
                result = data
                toast.success("Documento actualizado")
            } else {
                const { createInvoice } = await import('@/lib/actions/billing')
                const response = await createInvoice({
                    client_id: finalClient,
                    emitter_id: selectedEmitterId || null,
                    number: invoiceNumber,
                    date: new Date().toISOString(),
                    due_date: dueDate || null,
                    items: cleanItems,
                    total: displayValues.total,
                    status: 'pending',
                    document_type: derivedDocType,
                    service_id: serviceId,
                    cycle_id: cycleId
                })
                if (!response.success) throw new Error(response.error)
                result = response.data
                toast.success("Documento creado exitosamente")
            }

            setOpen(false)
            if (onSuccess) onSuccess()
            else {
                router.refresh()
            }

            // Should redirect? Maybe only if created new from blank
            if (!invoiceToEdit && !onSuccess) {
                // Optional: router.push(/invoices/${result.id})
            }

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
                        Nuevo Documento
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[1100px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    bg-transparent
                "
            >
                <SheetHeader className="hidden">
                    <SheetTitle>
                        {invoiceToEdit ? 'Editar Documento' : 'Nuevo Documento'}
                    </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                    {invoiceToEdit ? 'Editar Documento' : 'Nuevo Documento'}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {getDocumentTypeLabel(derivedDocType)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <div className="h-full grid grid-cols-1 lg:grid-cols-12 divide-x divide-gray-100/50">

                            {/* LEFT: FORM */}
                            <div className="lg:col-span-7 overflow-y-auto p-8 h-full relative scrollbar-thin">
                                <div className="space-y-8 max-w-2xl mx-auto">

                                    {/* Config Section */}
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                                        {!clientId && (
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase font-bold text-slate-500">Cliente</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-between bg-white" disabled={!!invoiceToEdit}>
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

                                        {isEmittersModuleEnabled() && (
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase font-bold text-slate-500">Emisor</Label>
                                                <Select value={selectedEmitterId} onValueChange={setSelectedEmitterId} disabled={!!invoiceToEdit}>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Seleccionar empresa emisora" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {emitters.map(e => (
                                                            <SelectItem key={e.id} value={e.id}>
                                                                {e.display_name} ({getEmitterDocumentType(e.emitter_type) === 'FACTURA_ELECTRONICA' ? 'Factura' : 'Cuenta/Cobro'})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase font-bold text-slate-500">Número</Label>
                                                <Input value={invoiceNumber} readOnly className="bg-gray-100 font-mono text-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs uppercase font-bold text-slate-500">Vencimiento</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-white border-gray-200">
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {dueDate ? format(new Date(dueDate), "PPP") : "Seleccionar"}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={dueDate ? new Date(dueDate) : undefined}
                                                            onSelect={d => d && setDueDate(d.toISOString().split('T')[0])}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-gray-900">Conceptos</h3>
                                            <Button variant="ghost" size="sm" onClick={addItem} className="text-brand-pink hover:text-brand-pink/80 hover:bg-brand-pink/10">
                                                <Plus className="h-4 w-4 mr-1" />
                                                Agregar Ítem
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            {items.map((item, index) => (
                                                <div key={item.ui_id} className="group relative flex gap-3 items-start bg-white p-3 rounded-xl border border-gray-100 hover:border-gray-200 shadow-sm transition-all">
                                                    <div className="grid gap-1.5 flex-1">
                                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Descripción</Label>
                                                        <Input
                                                            value={item.description}
                                                            onChange={(e) => updateItem(item.ui_id, 'description', e.target.value)}
                                                            className="border-0 bg-gray-50 focus-visible:ring-0 focus-visible:bg-white transition-all font-medium"
                                                            placeholder="Descripción del servicio..."
                                                        />
                                                    </div>
                                                    <div className="grid gap-1.5 w-20">
                                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Cant.</Label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(item.ui_id, 'quantity', parseInt(e.target.value) || 0)}
                                                            className="border-0 bg-gray-50 focus-visible:ring-0 focus-visible:bg-white transition-all text-center"
                                                        />
                                                    </div>
                                                    <div className="grid gap-1.5 w-32">
                                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Valor Unit.</Label>
                                                        <Input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => updateItem(item.ui_id, 'price', parseFloat(e.target.value) || 0)}
                                                            className="border-0 bg-gray-50 focus-visible:ring-0 focus-visible:bg-white transition-all text-right"
                                                        />
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white shadow-sm border border-gray-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => removeItem(item.ui_id)}
                                                        disabled={items.length === 1}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* RIGHT: PREVIEW */}
                            <div className="hidden lg:flex lg:col-span-5 bg-slate-100/50 p-8 flex-col border-l border-white items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />

                                <div className="w-full max-w-[400px] bg-white shadow-2xl shadow-slate-200/50 rounded-lg overflow-hidden border border-slate-200 text-[10px] leading-tight flex flex-col min-h-[500px] relative z-10 animate-in zoom-in-95 duration-500">
                                    {/* Mock Paper Header */}
                                    <div className="h-2 bg-brand-pink w-full" />
                                    <div className="p-6 space-y-6 flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-2">
                                                    LOGO
                                                </div>
                                                <p className="font-bold text-gray-900 text-sm">EMPRESA EJEMPLO</p>
                                                <p className="text-gray-400">NIT: 800.000.000-1</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-gray-900 text-sm">{invoiceNumber || "BORRADOR"}</p>
                                                <p className="text-gray-400 capitalize">{getDocumentTypeLabel(derivedDocType)}</p>
                                                {dueDate && <p className="text-red-400 mt-1 font-medium">Vence: {dueDate}</p>}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Cliente</p>
                                            <p className="font-bold text-gray-900 text-sm">{displayClientName || "Por definir..."}</p>
                                            {displayClient?.company_name && <p className="text-gray-500">{displayClient.company_name}</p>}
                                        </div>

                                        <div className="space-y-4">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-gray-100 text-gray-400">
                                                        <th className="pb-2 font-medium">Concepto</th>
                                                        <th className="pb-2 text-right font-medium">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {items.map((item) => (
                                                        <tr key={item.ui_id}>
                                                            <td className="py-2 pr-2">
                                                                <p className="font-medium text-gray-900">{item.description || "Sin descripción"}</p>
                                                                <p className="text-gray-400">{item.quantity} x ${item.price.toLocaleString()}</p>
                                                            </td>
                                                            <td className="py-2 text-right font-medium text-gray-900">
                                                                ${(item.quantity * item.price).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Footer Totals */}
                                    <div className="bg-slate-50 p-6 border-t border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-500">Subtotal</span>
                                            <span className="font-medium text-gray-900">${displayValues.subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-lg font-bold text-brand-pink pt-2 border-t border-slate-200">
                                            <span>Total</span>
                                            <span>${displayValues.total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-slate-400 mt-4 text-center max-w-xs">
                                    Vista previa aproximada. El documento PDF final puede variar según la plantilla configurada.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-between z-20">
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={loading || displayValues.total === 0} className="bg-black text-white px-8 rounded-xl hover:bg-gray-800">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {invoiceToEdit ? 'Actualizar Documento' : 'Emitir Documento'}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

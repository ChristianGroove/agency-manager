"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSettings } from "@/lib/actions/settings"
import { getActiveEmitters } from "@/lib/actions/emitters" // Import Emitter Action
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2, FileText, Edit, Building2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getDocumentTypeLabel, getEmitterDocumentType } from "@/lib/billing-utils"
import { isEmittersModuleEnabled } from "@/lib/billing-utils" // Import helper
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
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"


import { Invoice, InvoiceItem, Emitter } from "@/types/billing"

type UIInvoiceItem = InvoiceItem & { ui_id: string }

type CreateInvoiceModalProps = {
    clientId?: string
    clientName?: string
    onInvoiceCreated?: () => void
    invoiceToEdit?: Invoice
    trigger?: React.ReactNode
}

export function CreateInvoiceModal({ clientId, clientName, onInvoiceCreated, invoiceToEdit, trigger }: CreateInvoiceModalProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<{ id: string, name: string, company_name?: string }[]>([])
    const [selectedClientId, setSelectedClientId] = useState(clientId || "")
    const [settings, setSettings] = useState<any>({})

    // Emitter Logic
    const [emitters, setEmitters] = useState<any[]>([])
    const [selectedEmitterId, setSelectedEmitterId] = useState<string>("")
    const [derivedDocType, setDerivedDocType] = useState<string>("cuenta_cobro")


    // Form State
    const [invoiceNumber, setInvoiceNumber] = useState("")
    const [items, setItems] = useState<UIInvoiceItem[]>([
        { ui_id: '1', description: 'Servicios Profesionales', quantity: 1, price: 0 }
    ])
    const [notes, setNotes] = useState("")
    const [dueDate, setDueDate] = useState("")

    useEffect(() => {
        const loadSettings = async () => {
            const data = await getSettings()
            setSettings(data)
        }
        loadSettings()

        // Fetch Emitters
        const fetchEmitters = async () => {
            const activeEmitters = await getActiveEmitters()
            setEmitters(activeEmitters)

            // Auto-select if only one
            if (activeEmitters.length === 1) {
                setSelectedEmitterId(activeEmitters[0].id)
            }
        }
        if (isEmittersModuleEnabled()) {
            fetchEmitters()
        }
    }, [])

    // Derive Document Type when Emitter changes
    useEffect(() => {
        if (selectedEmitterId && emitters.length > 0) {
            const emitter = emitters.find(e => e.id === selectedEmitterId)
            if (emitter) {
                const type = getEmitterDocumentType(emitter.emitter_type)
                setDerivedDocType(type)
            }
        } else {
            // Fallback default
            setDerivedDocType("cuenta_cobro")
        }
    }, [selectedEmitterId, emitters])


    useEffect(() => {
        if (open) {
            if (invoiceToEdit) {
                setInvoiceNumber(invoiceToEdit.number)
                // Add UI IDs to existing items
                setItems(invoiceToEdit.items.map((item: any, i: number) => ({ ...item, ui_id: `edit-${i}` })) || [])
                setDueDate(invoiceToEdit.due_date ? invoiceToEdit.due_date.split('T')[0] : "")
                setSelectedClientId(invoiceToEdit.client_id)
                if (invoiceToEdit.emitter_id) setSelectedEmitterId(invoiceToEdit.emitter_id)
            } else {
                if (!invoiceNumber && settings.invoice_prefix) {
                    const timestamp = Date.now()
                    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase()
                    // Use configured prefix
                    const prefix = settings.invoice_prefix || 'INV-'
                    const generatedNumber = `${prefix}${timestamp}-${randomSuffix}`
                    setInvoiceNumber(generatedNumber)
                } else if (!invoiceNumber) {
                    const timestamp = Date.now()
                    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase()
                    setInvoiceNumber(`INV-${timestamp}-${randomSuffix}`)
                }

                if (!dueDate && settings.default_due_days) {
                    const defaultDueDate = new Date()
                    defaultDueDate.setDate(defaultDueDate.getDate() + (parseInt(settings.default_due_days) || 30))
                    setDueDate(defaultDueDate.toISOString().split('T')[0])
                } else if (!dueDate) {
                    const defaultDueDate = new Date()
                    defaultDueDate.setDate(defaultDueDate.getDate() + 30)
                    setDueDate(defaultDueDate.toISOString().split('T')[0])
                }

                if (!clientId) {
                    fetchClients()
                }
            }
        }
    }, [open, invoiceToEdit, settings])

    useEffect(() => {
        if (clientId) {
            setSelectedClientId(clientId)
        }
    }, [clientId])

    const fetchClients = async () => {
        const { data } = await supabase
            .from('clients')
            .select('id, name, company_name')
            .order('name')
        if (data) setClients(data)
    }

    const applyDefaultTax = () => {
        if (!settings.default_tax_rate) return

        const subtotal = calculateTotal()
        const taxRate = parseFloat(settings.default_tax_rate)
        const taxAmount = Math.round(subtotal * (taxRate / 100))

        setItems([...items, {
            ui_id: Math.random().toString(36).substr(2, 9),
            description: `${settings.default_tax_name || 'Impuesto'} (${taxRate}%)`,
            quantity: 1,
            price: taxAmount
        }])
    }

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

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + (item.quantity * item.price), 0)
    }

    const handleSaveInvoice = async () => {
        if (!selectedClientId) {
            alert("Por favor selecciona un cliente")
            return
        }

        // Validation: Emitter Required if module enabled and multiple exist (or just one)
        // Actually good practice to require it always if enabled
        if (isEmittersModuleEnabled() && !selectedEmitterId && emitters.length > 0) {
            alert("Por favor selecciona un Emisor para este documento")
            return
        }

        setLoading(true)

        try {
            const finalNumber = invoiceNumber
            const total = calculateTotal()
            // Strip UI IDs before saving
            const cleanItems = items.map(({ ui_id, ...item }) => item)

            let result;

            if (invoiceToEdit) {
                // Update existing invoice
                result = await supabase
                    .from('invoices')
                    .update({
                        client_id: selectedClientId,
                        emitter_id: selectedEmitterId || null, // Persist emitter
                        number: finalNumber,
                        due_date: dueDate || null,
                        items: cleanItems,
                        total: total,
                        document_type: derivedDocType,
                    })
                    .eq('id', invoiceToEdit.id)
                    .select()
                    .single()
            } else {
                // Create new invoice
                result = await supabase
                    .from('invoices')
                    .insert({
                        client_id: selectedClientId,
                        emitter_id: selectedEmitterId || null, // Persist emitter
                        number: finalNumber,
                        date: new Date().toISOString(),
                        due_date: dueDate || null,
                        items: cleanItems,
                        total: total,
                        status: 'pending',
                        document_type: derivedDocType
                    })
                    .select()
                    .single()
            }

            if (result.error) throw result.error

            setOpen(false)
            // Reset form for next use if creating new
            if (!invoiceToEdit) {
                setInvoiceNumber("")
                setItems([{ ui_id: '1', description: 'Servicios Profesionales', quantity: 1, price: 0 }])
                setDueDate("")
                setNotes("")
                if (!clientId) setSelectedClientId("")
            }

            if (onInvoiceCreated) onInvoiceCreated()

            // Redirect to the invoice view if created new, or just close if editing
            if (!invoiceToEdit) {
                router.push(`/invoices/${result.data.id}`)
            }

        } catch (error) {
            console.error("Error saving invoice:", error)
            alert("Error al guardar el documento.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {/* Suppress ID mismatch warning from Radix */}
                {trigger ? (
                    <div suppressHydrationWarning>{trigger}</div>
                ) : (
                    <Button className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                        <FileText className="mr-2 h-4 w-4" />
                        Generar Documento
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>
                        {invoiceToEdit ? 'Editar ' : 'Nueva '}
                        {getDocumentTypeLabel(derivedDocType)}
                    </DialogTitle>
                    <DialogDescription>
                        {invoiceToEdit
                            ? "Modifica los detalles del documento existente."
                            : clientId
                                ? `Creando documento para ${clientName}`
                                : "Emite una nueva cuenta de cobro."
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Emitter Selector */}
                    {isEmittersModuleEnabled() && emitters.length > 0 && (
                        <div className="grid gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <Label className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-indigo-600" />
                                Emisor del Documento
                            </Label>
                            <Select value={selectedEmitterId} onValueChange={setSelectedEmitterId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar Emisor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {emitters.map(emitter => (
                                        <SelectItem key={emitter.id} value={emitter.id}>
                                            {emitter.display_name || emitter.legal_name} ({getEmitterDocumentType(emitter.emitter_type) === 'FACTURA_ELECTRONICA' ? 'Factura' : 'Cuenta de Cobro'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Este documento se generará como: <strong>{getDocumentTypeLabel(derivedDocType)}</strong>
                            </p>
                        </div>
                    )}

                    {!clientId && !invoiceToEdit && (
                        <div className="grid gap-2 flex flex-col">
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
                                            ? clients.find((client) => client.id === selectedClientId)?.name
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Número de Documento</Label>
                            <Input
                                value={invoiceNumber}
                                readOnly
                                className="bg-gray-50 cursor-not-allowed"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Fecha de Vencimiento (Opcional)</Label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Ítems</Label>
                            <div className="flex gap-2">
                                {settings?.default_tax_rate > 0 && (
                                    <Button variant="outline" size="sm" onClick={applyDefaultTax} className="text-xs h-8">
                                        + {settings.default_tax_name || 'Impuesto'} ({settings.default_tax_rate}%)
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={addItem} className="text-indigo-600 hover:bg-indigo-50">
                                    <Plus className="h-4 w-4 mr-1" /> Agregar Ítem
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={item.ui_id} className="flex gap-3 items-start">
                                    <div className="grid gap-1 flex-1">
                                        {index === 0 && <Label className="text-xs text-muted-foreground">Descripción</Label>}
                                        <Input
                                            placeholder="Desarrollo web, Consultoría..."
                                            value={item.description}
                                            onChange={(e) => updateItem(item.ui_id, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-1 w-20">
                                        {index === 0 && <Label className="text-xs text-muted-foreground">Cant.</Label>}
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.ui_id, 'quantity', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="grid gap-1 w-32">
                                        {index === 0 && <Label className="text-xs text-muted-foreground">Valor Unit.</Label>}
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={item.price}
                                            onChange={(e) => updateItem(item.ui_id, 'price', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="pt-6">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:bg-red-50 h-10 w-10"
                                            onClick={() => removeItem(item.ui_id)}
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold text-gray-900">${calculateTotal().toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveInvoice} disabled={loading || calculateTotal() === 0} className="bg-brand-pink text-white border-0">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {invoiceToEdit ? 'Actualizar' : 'Emitir Documento'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

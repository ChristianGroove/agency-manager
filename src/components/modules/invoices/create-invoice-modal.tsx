"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { Plus, Trash2, Loader2, FileText, Edit } from "lucide-react"
import { supabase } from "@/lib/supabase"

type InvoiceItem = {
    id: string
    description: string
    quantity: number
    price: number
}

type CreateInvoiceModalProps = {
    clientId?: string
    clientName?: string
    onInvoiceCreated?: () => void
    invoiceToEdit?: any // Should be typed properly
    trigger?: React.ReactNode
}

export function CreateInvoiceModal({ clientId, clientName, onInvoiceCreated, invoiceToEdit, trigger }: CreateInvoiceModalProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<{ id: string, name: string }[]>([])
    const [selectedClientId, setSelectedClientId] = useState(clientId || "")

    // Form State
    const [invoiceNumber, setInvoiceNumber] = useState("")
    const [items, setItems] = useState<InvoiceItem[]>([
        { id: '1', description: 'Servicios Profesionales', quantity: 1, price: 0 }
    ])
    const [notes, setNotes] = useState("")
    const [dueDate, setDueDate] = useState("")

    // Auto-generate invoice number and set default due date when modal opens
    useEffect(() => {
        if (open) {
            if (invoiceToEdit) {
                setInvoiceNumber(invoiceToEdit.number)
                setItems(invoiceToEdit.items || [])
                setDueDate(invoiceToEdit.due_date ? invoiceToEdit.due_date.split('T')[0] : "")
                setSelectedClientId(invoiceToEdit.client_id)
            } else {
                if (!invoiceNumber) {
                    const timestamp = Date.now()
                    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase()
                    const generatedNumber = `INV-${timestamp}-${randomSuffix}`
                    setInvoiceNumber(generatedNumber)
                }

                if (!dueDate) {
                    const defaultDueDate = new Date()
                    defaultDueDate.setDate(defaultDueDate.getDate() + 30)
                    setDueDate(defaultDueDate.toISOString().split('T')[0])
                }

                if (!clientId) {
                    fetchClients()
                }
            }
        }
    }, [open, invoiceToEdit])

    useEffect(() => {
        if (clientId) {
            setSelectedClientId(clientId)
        }
    }, [clientId])

    const fetchClients = async () => {
        const { data } = await supabase
            .from('clients')
            .select('id, name')
            .order('name')
        if (data) setClients(data)
    }

    const addItem = () => {
        setItems([...items, {
            id: Math.random().toString(36).substr(2, 9),
            description: "",
            quantity: 1,
            price: 0
        }])
    }

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id))
        }
    }

    const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
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
        setLoading(true)

        try {
            const finalNumber = invoiceNumber
            const total = calculateTotal()

            let result;

            if (invoiceToEdit) {
                // Update existing invoice
                result = await supabase
                    .from('invoices')
                    .update({
                        client_id: selectedClientId,
                        number: finalNumber,
                        due_date: dueDate || null,
                        items: items,
                        total: total,
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
                        number: finalNumber,
                        date: new Date().toISOString(),
                        due_date: dueDate || null,
                        items: items,
                        total: total,
                        status: 'pending'
                    })
                    .select()
                    .single()
            }

            if (result.error) throw result.error

            setOpen(false)
            // Reset form for next use if creating new
            if (!invoiceToEdit) {
                setInvoiceNumber("")
                setItems([{ id: '1', description: 'Servicios Profesionales', quantity: 1, price: 0 }])
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
            alert("Error al guardar la cuenta de cobro.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                        <FileText className="mr-2 h-4 w-4" />
                        Generar Cuenta de Cobro
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>{invoiceToEdit ? 'Editar Cuenta de Cobro' : 'Nueva Cuenta de Cobro'}</DialogTitle>
                    <DialogDescription>
                        {invoiceToEdit
                            ? "Modifica los detalles de la cuenta de cobro existente."
                            : clientId
                                ? `Creando cuenta de cobro para ${clientName}`
                                : "Crea una nueva cuenta de cobro y asígnala a un cliente"
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {!clientId && !invoiceToEdit && (
                        <div className="grid gap-2">
                            <Label htmlFor="client">Cliente</Label>
                            <select
                                id="client"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                            >
                                <option value="">Seleccionar cliente...</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Número de Factura</Label>
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
                            <Label>Ítems del Servicio</Label>
                            <Button variant="ghost" size="sm" onClick={addItem} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                <Plus className="h-4 w-4 mr-1" /> Agregar Ítem
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={item.id} className="flex gap-3 items-start">
                                    <div className="grid gap-1 flex-1">
                                        {index === 0 && <Label className="text-xs text-muted-foreground">Descripción</Label>}
                                        <Input
                                            placeholder="Descripción del servicio..."
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-1 w-20">
                                        {index === 0 && <Label className="text-xs text-muted-foreground">Cant.</Label>}
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="grid gap-1 w-32">
                                        {index === 0 && <Label className="text-xs text-muted-foreground">Valor Unit.</Label>}
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={item.price}
                                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="pt-6">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10 w-10"
                                            onClick={() => removeItem(item.id)}
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
                            <p className="text-sm text-muted-foreground">Total a Cobrar</p>
                            <p className="text-2xl font-bold text-gray-900">
                                ${calculateTotal().toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveInvoice} disabled={loading || calculateTotal() === 0} className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {invoiceToEdit ? 'Actualizar Cuenta de Cobro' : 'Generar Cuenta de Cobro'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

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
import { Loader2, Plus, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { ServiceCatalogSelector } from "./service-catalog-selector"
import { Service } from "@/types"

export interface AddServiceModalProps {
    clientId?: string
    clientName?: string
    onSuccess?: () => void
    trigger?: React.ReactNode
    serviceToEdit?: any
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

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

    // Form State
    const [formData, setFormData] = useState<Partial<Service>>({
        name: "",
        description: "",
        amount: 0,
        quantity: 1, // Default quantity
        type: 'recurring',
        frequency: 'monthly',
        status: 'active'
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
        }
    }, [isOpen])

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
                status: serviceToEdit.status || 'active'
            })
            // Reverse calculate unit price if possible, or just assume amount matches
            setUnitPrice(qty > 0 ? (amount / qty) : 0)

            // Load existing emitter if present
            if (serviceToEdit.emitter_id) {
                setSelectedEmitterId(serviceToEdit.emitter_id)
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
    }, [serviceToEdit, isOpen, emitters]) // Added emitters dep

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

    const handleSaveService = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                alert("Sesión expirada")
                return
            }

            if (!clientId) {
                alert("Error: No se ha identificado el cliente.")
                return
            }

            // Validate Emitter Selection
            if (!selectedEmitterId) {
                alert("Debes seleccionar un Emisor para este servicio")
                setLoading(false)
                return
            }

            const serviceData = {
                client_id: clientId,
                name: formData.name,
                description: formData.description,
                amount: formData.amount,
                quantity: formData.quantity, // Save quantity to DB
                type: formData.type,
                frequency: formData.type === 'recurring' ? formData.frequency : null,
                status: formData.status,
                emitter_id: selectedEmitterId,
                document_type: derivedDocType
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

            // Create Invoice Logic (Only for new services that are active)
            // If it's a new service and has a price, we create a pending invoice
            if (!serviceToEdit && serviceId && formData.amount && formData.amount > 0) {
                const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
                const dueDate = new Date()
                dueDate.setDate(dueDate.getDate() + (formData.type === 'one_off' ? 15 : 5))

                // Fetch billing utils for labels just in case
                // Actually we just need to pass the IDs

                const { data: invData, error: invError } = await supabase.from('invoices').insert({
                    client_id: clientId,
                    service_id: serviceId,
                    emitter_id: selectedEmitterId, // Attach Emitter
                    document_type: derivedDocType,
                    number: invoiceNumber,
                    date: new Date().toISOString(),
                    due_date: dueDate.toISOString(),
                    status: 'pending',
                    total: formData.amount,
                    items: [{
                        description: `${formData.name} (${formData.type === 'one_off' ? 'Pago único' : 'Mensual'}) [x${formData.quantity}]`,
                        quantity: formData.quantity || 1,
                        price: unitPrice // Invoice item price is unit price
                    }]
                }).select().single()

                if (invError) {
                    console.error("Error creating initial invoice:", invError)
                    alert(`El servicio se creó, pero hubo un error al crear la factura: ${invError.message}`)
                }
            }

            // Success
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
                            {/* NEW: Emitter Selection Block */}
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
    )
}

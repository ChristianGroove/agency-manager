"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Edit } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface AddServiceModalProps {
    clientId?: string
    clientName?: string
    onSuccess?: () => void
    trigger?: React.ReactNode
    serviceToEdit?: any // Should be typed properly but using any for now to avoid conflicts
}

export function AddServiceModal({ clientId, clientName, onSuccess, trigger, serviceToEdit }: AddServiceModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [clients, setClients] = useState<{ id: string, name: string }[]>([])
    const [selectedClientId, setSelectedClientId] = useState(clientId || "")

    const [newService, setNewService] = useState({
        name: '',
        service_type: 'marketing',
        frequency: 'monthly',
        amount: '',
        start_date: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        if (isOpen && !clientId) {
            fetchClients()
        }
    }, [isOpen, clientId])

    useEffect(() => {
        if (clientId) {
            setSelectedClientId(clientId)
        }
    }, [clientId])

    useEffect(() => {
        if (serviceToEdit && isOpen) {
            setNewService({
                name: serviceToEdit.name,
                service_type: serviceToEdit.service_type,
                frequency: serviceToEdit.frequency,
                amount: serviceToEdit.amount.toString(),
                start_date: serviceToEdit.start_date || new Date().toISOString().split('T')[0]
            })
            if (serviceToEdit.client_id) {
                setSelectedClientId(serviceToEdit.client_id)
            }
        } else if (!serviceToEdit && isOpen) {
            // Reset if opening for new service
            setNewService({
                name: '',
                service_type: 'marketing',
                frequency: 'monthly',
                amount: '',
                start_date: new Date().toISOString().split('T')[0]
            })
        }
    }, [serviceToEdit, isOpen])

    const fetchClients = async () => {
        const { data } = await supabase
            .from('clients')
            .select('id, name')
            .order('name')
        if (data) setClients(data)
    }

    const handleSaveService = async () => {
        if (!newService.name || !newService.amount || !selectedClientId) {
            alert('Por favor completa todos los campos requeridos')
            return
        }

        setSaving(true)
        try {
            // Calculate dates
            const startDate = newService.start_date ? new Date(newService.start_date) : new Date()
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const startDay = new Date(startDate)
            startDay.setHours(0, 0, 0, 0)

            const isFuture = startDay > today

            let nextBilling = null
            let invoiceId = null

            // Only generate invoice logic for NEW services or if specifically requested (simplified for now: only new)
            // For edits, we usually just update the subscription details. 
            // If the user changes the frequency/amount, it will affect the NEXT generated invoice, not the current one.

            if (!serviceToEdit) {
                if (isFuture) {
                    // Future service: No invoice now. Next billing is the start date.
                    nextBilling = new Date(startDate)
                } else {
                    // Current/Past service: Generate invoice immediately

                    // Calculate next billing for recurring services
                    if (newService.frequency !== 'one-time') {
                        nextBilling = new Date(startDate)
                        if (newService.frequency === 'biweekly') {
                            nextBilling.setDate(nextBilling.getDate() + 15)
                        } else if (newService.frequency === 'monthly') {
                            nextBilling.setMonth(nextBilling.getMonth() + 1)
                        } else if (newService.frequency === 'quarterly') {
                            nextBilling.setMonth(nextBilling.getMonth() + 3)
                        } else {
                            nextBilling.setFullYear(nextBilling.getFullYear() + 1)
                        }
                    }

                    // Calculate due date for the immediate invoice
                    let dueDate = new Date(startDate)
                    if (newService.frequency === 'one-time') {
                        dueDate.setDate(dueDate.getDate() + 30)
                    } else {
                        if (nextBilling) {
                            dueDate = new Date(nextBilling)
                        }
                    }

                    // Create the invoice
                    const invoiceNumber = `INV-${Date.now()}`
                    const { data: invoiceData, error: invoiceError } = await supabase
                        .from('invoices')
                        .insert({
                            client_id: selectedClientId,
                            number: invoiceNumber,
                            date: new Date().toISOString(),
                            due_date: dueDate.toISOString(),
                            items: [{
                                description: newService.name,
                                quantity: 1,
                                price: parseFloat(newService.amount)
                            }],
                            total: parseFloat(newService.amount),
                            status: 'pending',
                            sent: false
                        })
                        .select()
                        .single()

                    if (invoiceError) throw invoiceError
                    invoiceId = invoiceData.id
                }
            } else {
                // For edits, preserve existing next_billing_date unless logic dictates otherwise (complex, skipping auto-update of billing date for now to avoid messing up cycles)
                // Ideally, we might ask the user if they want to reset the billing cycle.
                // For now, we'll keep the existing next_billing_date if it exists, or calculate if missing.
                if (serviceToEdit.next_billing_date) {
                    nextBilling = new Date(serviceToEdit.next_billing_date)
                }
            }

            if (serviceToEdit) {
                // UPDATE
                const { error } = await supabase
                    .from('subscriptions')
                    .update({
                        name: newService.name,
                        service_type: newService.service_type,
                        frequency: newService.frequency,
                        amount: parseFloat(newService.amount),
                        start_date: newService.start_date,
                        // Do not update next_billing_date automatically on simple edit to avoid resetting cycles
                        // next_billing_date: nextBilling ? nextBilling.toISOString() : null, 
                    })
                    .eq('id', serviceToEdit.id)

                if (error) throw error
            } else {
                // INSERT
                const { error } = await supabase
                    .from('subscriptions')
                    .insert([{
                        client_id: selectedClientId,
                        name: newService.name,
                        service_type: newService.service_type,
                        frequency: newService.frequency,
                        amount: parseFloat(newService.amount),
                        start_date: newService.start_date,
                        status: 'active',
                        next_billing_date: nextBilling ? nextBilling.toISOString() : null,
                        invoice_id: invoiceId
                    }])

                if (error) throw error
            }

            setIsOpen(false)
            // Reset form
            setNewService({
                name: '',
                service_type: 'marketing',
                frequency: 'monthly',
                amount: '',
                start_date: new Date().toISOString().split('T')[0]
            })
            if (!clientId) setSelectedClientId("")

            if (onSuccess) onSuccess()

        } catch (error) {
            console.error('Error saving service:', error)
            alert('Error al guardar el servicio')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                        <Plus className="mr-2 h-4 w-4" />
                        Añadir Servicio
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{serviceToEdit ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
                    <DialogDescription>
                        {serviceToEdit
                            ? "Modifica los detalles del servicio existente."
                            : clientId
                                ? `Añade un nuevo servicio o suscripción para ${clientName}`
                                : "Crea un nuevo servicio y asígnalo a un cliente"
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {!clientId && !serviceToEdit && (
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

                    <div className="grid gap-2">
                        <Label htmlFor="name">Nombre del Servicio</Label>
                        <Input
                            id="name"
                            placeholder="Ej: Marketing Digital Pro"
                            value={newService.name}
                            onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="service_type">Tipo de Servicio</Label>
                            <select
                                id="service_type"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={newService.service_type}
                                onChange={(e) => {
                                    const type = e.target.value
                                    setNewService({
                                        ...newService,
                                        service_type: type,
                                        frequency: type === 'hosting' ? 'yearly' : type === 'other' ? 'one-time' : 'monthly'
                                    })
                                }}
                            >
                                <option value="marketing">Marketing</option>
                                <option value="marketing_ads">Marketing + Meta Ads</option>
                                <option value="ads">Meta Ads</option>
                                <option value="branding">Branding / Logo</option>
                                <option value="crm">CRM / Software</option>
                                <option value="hosting">Hosting / Dominio</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="frequency">Frecuencia</Label>
                            <select
                                id="frequency"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={newService.frequency}
                                onChange={(e) => setNewService({ ...newService, frequency: e.target.value })}
                                disabled={newService.service_type === 'hosting'}
                            >
                                <option value="one-time">Una sola vez (Servicio único)</option>
                                <option value="biweekly">Quincenal (cada 15 días)</option>
                                <option value="monthly">Mensual</option>
                                <option value="quarterly">Trimestral (cada 3 meses)</option>
                                <option value="yearly">Anual</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Monto</Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={newService.amount}
                                onChange={(e) => setNewService({ ...newService, amount: e.target.value })}
                            />
                        </div>
                        {newService.service_type !== 'other' && (
                            <div className="grid gap-2">
                                <Label htmlFor="start_date">Inicio</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={newService.start_date}
                                    onChange={(e) => setNewService({ ...newService, start_date: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveService} disabled={saving} className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {serviceToEdit ? 'Actualizar' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

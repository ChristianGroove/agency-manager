"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { createQuote } from "@/modules/core/quotes/actions"
import { createLead } from "@/modules/core/crm/leads-actions"
import { Client } from "@/types"
import { Loader2, Users, UserPlus } from "lucide-react"

export default function NewQuotePage() {
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
        fetchClients()
    }, [])

    const fetchClients = async () => {
        try {
            const { getClients } = await import("@/modules/core/clients/actions")
            const data = await getClients()
            if (data) setClients(data)
        } catch (error) {
            console.error("Error fetching clients:", error)
        }
    }

    const handleCreateQuoteForClient = async () => {
        if (!selectedClientId) return
        setLoading(true)
        try {
            const response = await createQuote({
                client_id: selectedClientId,
                date: new Date().toISOString(),
                total: 0,
                items: [],
                title: 'Nueva Cotización' // Default title
            })

            if (!response.success || !response.data) throw new Error(response.error)

            router.push(`/quotes/${response.data.id}/edit`)
        } catch (error) {
            console.error(error)
            alert("Error al crear la cotización")
        } finally {
            setLoading(false)
        }
    }

    const handleCreateQuoteForProspect = async () => {
        if (!prospectData.name) return
        setLoading(true)
        try {
            // 1. Create Lead
            const leadRes = await createLead({
                name: prospectData.name,
                company_name: prospectData.company_name,
                email: prospectData.email,
                phone: prospectData.phone
            })

            if (!leadRes.success || !leadRes.data) throw new Error(leadRes.error)
            const lead = leadRes.data

            // 2. Create Quote
            const response = await createQuote({
                lead_id: lead.id,
                date: new Date().toISOString(),
                total: 0,
                items: [],
                title: 'Nueva Cotización'
            })

            if (!response.success || !response.data) throw new Error(response.error)

            router.push(`/quotes/${response.data.id}/edit`)
        } catch (error: any) {
            console.error(error)
            alert("Error al crear la cotización: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container max-w-2xl mx-auto py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Nueva Cotización</h1>
                <p className="text-muted-foreground">Selecciona un cliente existente o crea un nuevo prospecto.</p>
            </div>

            <Tabs defaultValue="client" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="client" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Cliente Existente
                    </TabsTrigger>
                    <TabsTrigger value="prospect" className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Nuevo Prospecto
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="client">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seleccionar Cliente</CardTitle>
                            <CardDescription>Elige un cliente de tu lista para crearle una cotización.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Cliente</Label>
                                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar cliente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map(client => (
                                            <SelectItem key={client.id} value={client.id}>
                                                {client.name} {client.company_name ? `(${client.company_name})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                className="w-full"
                                onClick={handleCreateQuoteForClient}
                                disabled={!selectedClientId || loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Crear Cotización
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="prospect">
                    <Card>
                        <CardHeader>
                            <CardTitle>Datos del Prospecto</CardTitle>
                            <CardDescription>Ingresa los datos básicos para crear una cotización rápida.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                            <Button
                                className="w-full"
                                onClick={handleCreateQuoteForProspect}
                                disabled={!prospectData.name || loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Crear Cotización
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

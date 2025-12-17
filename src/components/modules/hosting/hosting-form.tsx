"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export function HostingForm() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        domain: "",
        provider: "Hostinger",
        start_date: "",
        renewal_date: "",
        cost: "",
        client_id: "" // In real app, this would be a select dropdown
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        // Logic to save to Supabase
        // Requires selecting a client first
        alert("Funcionalidad de guardado pendiente de integración con selector de clientes")
        setIsLoading(false)
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Información del Hosting</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="domain">Dominio</Label>
                            <Input id="domain" placeholder="ejemplo.com" value={formData.domain} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="provider">Proveedor</Label>
                            <Input id="provider" placeholder="Hostinger" value={formData.provider} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Fecha Inicio</Label>
                            <Input id="start_date" type="date" value={formData.start_date} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="renewal_date">Fecha Renovación</Label>
                            <Input id="renewal_date" type="date" value={formData.renewal_date} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cost">Costo Anual</Label>
                            <Input id="cost" type="number" placeholder="0.00" value={formData.cost} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="client_id">ID Cliente (Temporal)</Label>
                            <Input id="client_id" placeholder="UUID del cliente" value={formData.client_id} onChange={handleChange} required />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                    <Button variant="outline" type="button" onClick={() => router.back()}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Hosting
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BriefingTemplate } from "@/types/briefings"
import { Service } from "@/types"
import { createBriefing } from "@/lib/actions/briefings"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CreateBriefingFormProps {
    templates: BriefingTemplate[]
    clients: { id: string, name: string }[]
    onSuccess?: () => void
    onCancel?: () => void
}

export function CreateBriefingForm({ templates, clients, onSuccess, onCancel }: CreateBriefingFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<string>("")
    const [selectedClient, setSelectedClient] = useState<string>("none")
    const [clientServices, setClientServices] = useState<Service[]>([])
    const [selectedService, setSelectedService] = useState<string>("none")

    const fetchServices = async (clientId: string) => {
        const { data } = await supabase
            .from('services')
            .select('*')
            .eq('client_id', clientId)
            .eq('status', 'active')
        if (data) setClientServices(data as Service[])
    }

    const handleClientChange = (clientId: string) => {
        setSelectedClient(clientId)
        setSelectedService("none")
        if (clientId && clientId !== "none") {
            fetchServices(clientId)
        } else {
            setClientServices([])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTemplate) {
            toast.error("Debes seleccionar una plantilla")
            return
        }

        setLoading(true)
        try {
            const clientId = selectedClient === "none" ? null : selectedClient
            const serviceId = selectedService === "none" ? null : selectedService
            await createBriefing(selectedTemplate, clientId, serviceId)
            toast.success("Briefing creado correctamente")

            if (onSuccess) {
                onSuccess()
            } else {
                router.push("/briefings")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al crear el briefing")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label>Plantilla de Briefing</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo de proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                        {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                                {t.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedTemplate && (
                    <p className="text-sm text-gray-500">
                        {templates.find(t => t.id === selectedTemplate)?.description}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Cliente (Opcional)</Label>
                <Select value={selectedClient} onValueChange={handleClientChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Asociar a un cliente existente..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">-- Sin Cliente (Lead Nuevo) --</SelectItem>
                        {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={onCancel}>Cancelar</Button>
                <Button
                    type="submit"
                    className="bg-brand-pink hover:bg-brand-pink/90 text-white"
                    disabled={loading}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Generar Link de Briefing
                </Button>
            </div>
        </form>
    )
}

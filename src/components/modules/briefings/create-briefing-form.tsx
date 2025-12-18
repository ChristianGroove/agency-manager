"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BriefingTemplate } from "@/types/briefings"
import { createBriefing } from "@/lib/actions/briefings"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CreateBriefingFormProps {
    templates: BriefingTemplate[]
    clients: { id: string, name: string }[]
}

export function CreateBriefingForm({ templates, clients }: CreateBriefingFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<string>("")
    const [selectedClient, setSelectedClient] = useState<string>("none")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTemplate) {
            toast.error("Debes seleccionar una plantilla")
            return
        }

        setLoading(true)
        try {
            const clientId = selectedClient === "none" ? null : selectedClient
            await createBriefing(selectedTemplate, clientId)
            toast.success("Briefing creado correctamente")
            router.push("/briefings")
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
                <Select value={selectedClient} onValueChange={setSelectedClient}>
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

            <Button
                type="submit"
                className="w-full bg-[#F205E2] hover:bg-[#D104C3] text-white"
                disabled={loading}
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generar Link de Briefing
            </Button>
        </form>
    )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createSystemBroadcast } from "@/app/actions/admin-dashboard-actions"
import { toast } from "sonner"
import { Megaphone } from "lucide-react"

export function CreateBroadcastDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [form, setForm] = useState({
        title: "",
        message: "",
        severity: "info",
        hours_active: "24"
    })

    const handleSubmit = async () => {
        setLoading(true)
        try {
            // Calculate expiration
            const expires = new Date()
            expires.setHours(expires.getHours() + parseInt(form.hours_active))

            await createSystemBroadcast({
                title: form.title,
                message: form.message,
                severity: form.severity as any,
                expires_at: expires.toISOString()
            })

            toast.success("Difusión enviada correctamente")
            setOpen(false)
            setForm({ title: "", message: "", severity: "info", hours_active: "24" })
        } catch (error: any) {
            toast.error(error.message || "Error")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Megaphone className="mr-2 h-4 w-4" />
                    Nueva Difusión
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Difundir Mensaje Global</DialogTitle>
                    <DialogDescription>
                        Este mensaje será visible para TODOS los usuarios del sistema.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="Ej: Mantenimiento Programado"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Mensaje</Label>
                        <Textarea
                            value={form.message}
                            onChange={e => setForm({ ...form, message: e.target.value })}
                            placeholder="Detalles del anuncio..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Severidad</Label>
                            <Select
                                value={form.severity}
                                onValueChange={v => setForm({ ...form, severity: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="info">Info (Azul)</SelectItem>
                                    <SelectItem value="warning">Advertencia (Amarillo)</SelectItem>
                                    <SelectItem value="critical">Crítico (Rojo)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Duración</Label>
                            <Select
                                value={form.hours_active}
                                onValueChange={v => setForm({ ...form, hours_active: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 Hora</SelectItem>
                                    <SelectItem value="24">24 Horas</SelectItem>
                                    <SelectItem value="48">48 Horas</SelectItem>
                                    <SelectItem value="168">1 Semana</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading || !form.title}>
                        {loading ? "Enviando..." : "Enviar Difusión"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createHostingAccount, updateHostingAccount } from "@/modules/core/hosting/actions"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface CreateHostingSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    accountToEdit?: any
}

export function CreateHostingSheet({ open, onOpenChange, onSuccess, accountToEdit }: CreateHostingSheetProps) {
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<any[]>([])

    const [formData, setFormData] = useState({
        client_id: "",
        domain_url: "",
        provider_name: "",
        server_ip: "",
        plan_name: "",
        cpanel_url: "",
        status: "active",
        renewal_date: ""
    })

    useEffect(() => {
        if (open) {
            fetchClients()
            if (accountToEdit) {
                setFormData({
                    client_id: accountToEdit.client_id || "",
                    domain_url: accountToEdit.domain_url || "",
                    provider_name: accountToEdit.provider_name || "",
                    server_ip: accountToEdit.server_ip || "",
                    plan_name: accountToEdit.plan_name || "",
                    cpanel_url: accountToEdit.cpanel_url || "",
                    status: accountToEdit.status || "active",
                    renewal_date: accountToEdit.renewal_date || ""
                })
            } else {
                setFormData({
                    client_id: "",
                    domain_url: "",
                    provider_name: "",
                    server_ip: "",
                    plan_name: "",
                    cpanel_url: "",
                    status: "active",
                    renewal_date: ""
                })
            }
        }
    }, [open, accountToEdit])

    const fetchClients = async () => {
        const { data } = await supabase.from('clients').select('id, name').order('name')
        if (data) setClients(data)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.domain_url) return toast.error("El dominio es requerido")

        setLoading(true)
        try {
            const payload = { ...formData }
            if (!payload.client_id) delete (payload as any).client_id
            if (!payload.renewal_date) delete (payload as any).renewal_date

            if (accountToEdit) {
                await updateHostingAccount(accountToEdit.id, payload)
                toast.success("Cuenta actualizada")
            } else {
                await createHostingAccount(payload)
                toast.success("Cuenta creada")
            }
            onOpenChange(false)
            onSuccess()
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[500px]">
                <SheetHeader>
                    <SheetTitle>{accountToEdit ? "Editar Hosting" : "Nuevo Hosting"}</SheetTitle>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Cliente</Label>
                        <Select
                            value={formData.client_id}
                            onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar Cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Dominio (URL)</Label>
                        <Input
                            placeholder="ejemplo.com"
                            value={formData.domain_url}
                            onChange={(e) => setFormData({ ...formData, domain_url: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Proveedor</Label>
                            <Input
                                placeholder="AWS, HostGator..."
                                value={formData.provider_name}
                                onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>IP Servidor</Label>
                            <Input
                                placeholder="192.168.x.x"
                                value={formData.server_ip}
                                onChange={(e) => setFormData({ ...formData, server_ip: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Plan / Paquete</Label>
                        <Input
                            placeholder="Business 10GB"
                            value={formData.plan_name}
                            onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>URL cPanel / Acceso</Label>
                        <Input
                            placeholder="https://cpanel.ejemplo.com"
                            value={formData.cpanel_url}
                            onChange={(e) => setFormData({ ...formData, cpanel_url: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Estado</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(v) => setFormData({ ...formData, status: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="suspended">Suspendido</SelectItem>
                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Renovación</Label>
                            <Input
                                type="date"
                                value={formData.renewal_date}
                                onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <SheetFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-brand-pink text-white">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}

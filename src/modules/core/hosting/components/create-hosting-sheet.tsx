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
    clientId?: string
}

export function CreateHostingSheet({ open, onOpenChange, onSuccess, accountToEdit, clientId }: CreateHostingSheetProps) {
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
                    client_id: clientId || "", // Pre-fill client ID if provided
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
    }, [open, accountToEdit, clientId])

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
            <SheetContent
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center gap-3 shrink-0 px-8 py-5 bg-white/80 backdrop-blur-md border-b border-gray-100">
                        <div className="p-2 bg-brand-pink/10 rounded-lg text-brand-pink">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
                                <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
                                <line x1="6" x2="6.01" y1="6" y2="6" />
                                <line x1="6" x2="6.01" y1="18" y2="18" />
                            </svg>
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-semibold text-gray-900">
                                {accountToEdit ? "Editar Hosting" : "Nuevo Hosting"}
                            </SheetTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Configura los datos del servidor
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label>Cliente</Label>
                                <Select
                                    value={formData.client_id}
                                    onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                                    disabled={!!clientId}
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
                                <Label>Dominio (URL) *</Label>
                                <Input
                                    placeholder="ejemplo.com"
                                    value={formData.domain_url}
                                    onChange={(e) => setFormData({ ...formData, domain_url: e.target.value })}
                                    className="h-11"
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
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center justify-between">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-brand-pink hover:bg-brand-pink/90 text-white px-6"
                            onClick={handleSubmit}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {accountToEdit ? "Guardar Cambios" : "Crear Hosting"}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

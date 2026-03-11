"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Loader2, Search, MoreHorizontal, ShieldAlert, CreditCard, ExternalLink, Package } from "lucide-react"
import { toast } from "sonner"
import { getAllPlatformSubscriptions, adminUpdateSubscription, adminCreateSubscription } from "@/modules/billing/saas/admin-actions"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function PlatformSubscriptionManager() {
    const [loading, setLoading] = useState(true)
    const [organizations, setOrganizations] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await getAllPlatformSubscriptions()
            setOrganizations(data)
        } catch (error) {
            toast.error("Error cargando suscripciones")
        } finally {
            setLoading(false)
        }
    }

    const handleAdminUpdate = async (subId: string, updates: any) => {
        try {
            await adminUpdateSubscription(subId, updates)
            toast.success("Suscripción actualizada correctamente")
            loadData()
        } catch (error) {
            toast.error("Error al actualizar suscripción")
        }
    }

    const handleCreateSubscription = async (orgId: string, appId: string) => {
        try {
            await adminCreateSubscription(orgId, appId)
            toast.success("Suscripción creada y plan asignado")
            loadData()
        } catch (error) {
            toast.error("Error al crear suscripción")
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
            case 'legacy_manual': return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
            case 'past_due': return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
            case 'canceled': return 'bg-red-500/10 text-red-700 border-red-500/20'
            default: return 'bg-gray-500/10 text-gray-700'
        }
    }

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>

    return (
        <Card className="border-none shadow-none bg-transparent">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">Suscripciones de Plataforma</h2>
                    <p className="text-sm text-muted-foreground">
                        Gestión total de acceso y periodos de facturación de las organizaciones.
                    </p>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar organización..."
                        className="pl-9 w-[300px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Organización</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Próximo Pago</TableHead>
                        <TableHead>Gateway</TableHead>
                        <TableHead className="w-10"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredOrgs.map((org) => {
                        const sub = org.saas_subscriptions // It's an object now, not array
                        return (
                            <TableRow key={org.id}>
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{org.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">@{org.slug}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {sub?.saas_apps?.name || <span className="text-muted-foreground italic">Sin plan</span>}
                                </TableCell>
                                <TableCell>
                                    {sub ? (
                                        <Badge variant="outline" className={getStatusColor(sub.status)}>
                                            {sub.status.toUpperCase()}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-muted-foreground">SIN ACTIVA</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {sub?.current_period_end ? format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: es }) : '-'}
                                </TableCell>
                                <TableCell className="capitalize">
                                    {sub?.payment_gateway || '-'}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {sub ? (
                                                <>
                                                    <DropdownMenuLabel>Acciones de Control</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />

                                                    <AdminEditSubscriptionDialog
                                                        sub={sub}
                                                        onUpdate={(updates) => handleAdminUpdate(sub.id, updates)}
                                                    />

                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleAdminUpdate(sub.id, { status: 'active' })}>
                                                        Activar Acceso
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAdminUpdate(sub.id, { status: 'past_due' })} className="text-amber-600">
                                                        Marcar como Mora
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAdminUpdate(sub.id, { status: 'canceled' })} className="text-red-600">
                                                        Suspender Acceso
                                                    </DropdownMenuItem>
                                                </>
                                            ) : (
                                                <>
                                                    <DropdownMenuLabel>Acceso Inicial</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleCreateSubscription(org.id, org.active_app_id || 'app_saas_platform')}>
                                                        <CreditCard className="h-4 w-4 mr-2" />
                                                        Asignar Plan {org.active_app_id === 'app_saas_platform' ? 'SaaS' : 'Actual'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-muted-foreground italic text-xs">
                                                        Requiere asignar un plan para ver más opciones.
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </Card>
    )
}

function AdminEditSubscriptionDialog({
    sub,
    onUpdate
}: {
    sub: any,
    onUpdate: (updates: any) => Promise<void>
}) {
    const [open, setOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSubmitting(true)
        const formData = new FormData(e.currentTarget)
        const updates = {
            status: formData.get('status'),
            custom_price: formData.get('custom_price') ? parseFloat(formData.get('custom_price') as string) : null,
            billing_cycle: formData.get('billing_cycle'),
            bypass_until: formData.get('bypass_until') || null,
            admin_notes: formData.get('admin_notes')
        }
        await onUpdate(updates)
        setSubmitting(false)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Gestión Avanzada
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Gestión Administrativa</DialogTitle>
                    <DialogDescription>
                        Control total sobre el acceso y cobros de esta suscripción.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Estado de Acceso</Label>
                            <Select name="status" defaultValue={sub.status}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="past_due">Mora</SelectItem>
                                    <SelectItem value="canceled">Suspendido</SelectItem>
                                    <SelectItem value="legacy_manual">Manual Legacy</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="billing_cycle">Ciclo de Cobro</Label>
                            <Select name="billing_cycle" defaultValue={sub.billing_cycle || 'monthly'}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Mensual</SelectItem>
                                    <SelectItem value="quarterly">Trimestral</SelectItem>
                                    <SelectItem value="semi_annual">Semestral</SelectItem>
                                    <SelectItem value="annual">Anual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="custom_price">Precio Personalizado (USD)</Label>
                            <Input name="custom_price" type="number" step="0.01" defaultValue={sub.custom_price || ""} placeholder="Dejar vacío para base" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bypass_until">Bypass Hasta (Cortesía)</Label>
                            <Input name="bypass_until" type="date" defaultValue={sub.bypass_until ? sub.bypass_until.split('T')[0] : ""} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="admin_notes">Notas Administrativas</Label>
                        <Textarea name="admin_notes" defaultValue={sub.admin_notes || ""} placeholder="Razón del precio especial, bypass, etc." />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

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
import { Loader2, Search, MoreHorizontal, ShieldAlert, CreditCard, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { getAllPlatformSubscriptions, updateSubscriptionStatusAdmin } from "@/modules/billing/saas/admin-actions"
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

    const handleStatusUpdate = async (subId: string, newStatus: string) => {
        try {
            await updateSubscriptionStatusAdmin(subId, newStatus)
            toast.success(`Estado actualizado a ${newStatus}`)
            loadData()
        } catch (error) {
            toast.error("Error al actualizar estado")
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
                        const sub = org.subscription?.[0]
                        return (
                            <TableRow key={org.id}>
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{org.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">@{org.slug}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {sub?.plan?.name || <span className="text-muted-foreground italic">Sin plan</span>}
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
                                    {sub && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones de Control</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleStatusUpdate(sub.id, 'active')}>
                                                    Activar Acceso
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusUpdate(sub.id, 'past_due')} className="text-amber-600">
                                                    Marcar como Mora
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusUpdate(sub.id, 'canceled')} className="text-red-600">
                                                    Suspender Acceso
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </Card>
    )
}

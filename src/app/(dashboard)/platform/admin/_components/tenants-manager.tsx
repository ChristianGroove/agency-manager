"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Search, Building, Plus, Settings, Pencil, Ban, CheckCircle, Trash2, Receipt, Clock, AlertCircle, Shield, Mail, Users, Briefcase, MessageSquare, Phone, Radio } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CreateOrganizationSheet } from "@/modules/core/organizations/components/create-organization-sheet"
import { TenantConfigurationSheet } from "@/modules/core/organizations/components/tenant-configuration-sheet"
import { EditLimitsModal } from "@/modules/core/organizations/components/edit-limits-modal"
import { OrgDetailsSheet } from "@/modules/core/admin/components/org-details-sheet"
import { EditOrganizationDialog } from "@/modules/core/admin/components/edit-organization-dialog"
import { updateOrganizationStatus, deleteOrganization, type AdminOrganization } from '@/modules/core/admin/actions'
import { toast } from 'sonner'
import { ManualBillingModal } from "./manual-billing-modal"

const PROTECTED_ORG_SLUGS = ['pixy', 'pixy-agency', 'pixy-pds']

interface TenantsManagerProps {
    organizations: any[]
    allModules: any[]
}

function renderConnectedChannels(channels: string[] = []) {
    if (!channels || channels.length === 0) {
        return <span className="text-[11px] text-muted-foreground/60 italic">Sin canales</span>
    }

    return (
        <div className="flex items-center gap-1.5">
            {channels.map((provider) => {
                const p = provider.toLowerCase()
                if (p.includes('meta') || p.includes('evolution') || p.includes('whatsapp')) {
                    return (
                        <div key={provider} className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title={`WhatsApp / Meta Cloud (${provider})`}>
                            <MessageSquare className="h-3.5 w-3.5" />
                        </div>
                    )
                }
                if (p.includes('resend') || p.includes('email')) {
                    return (
                        <div key={provider} className="p-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" title={`Email / Resend (${provider})`}>
                            <Mail className="h-3.5 w-3.5" />
                        </div>
                    )
                }
                if (p.includes('twilio') || p.includes('sms')) {
                    return (
                        <div key={provider} className="p-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" title={`SMS / Twilio (${provider})`}>
                            <Phone className="h-3.5 w-3.5" />
                        </div>
                    )
                }
                return (
                    <div key={provider} className="p-1 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20" title={provider}>
                        <Radio className="h-3.5 w-3.5" />
                    </div>
                )
            })}
        </div>
    )
}

export function TenantsManager({ organizations, allModules }: TenantsManagerProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all')
    const [creationOpen, setCreationOpen] = useState(false)

    // Premium Sheet and Edit States
    const [activeSheetOrgId, setActiveSheetOrgId] = useState<string | null>(null)
    const [editOrg, setEditOrg] = useState<AdminOrganization | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    // Manual Billing State
    const [billingOrg, setBillingOrg] = useState<{ id: string, name: string } | null>(null)

    const router = useRouter()

    const filteredOrgs = organizations.filter(org => {
        const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (org.owner_email && org.owner_email.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesFilter = filter === 'all' || org.status === filter
        return matchesSearch && matchesFilter
    })

    const handleDelete = async (orgId: string) => {
        if (!confirm("ADVERTENCIA CRÍTICA: Se eliminará permanentemente la organización y TODOS sus datos (contactos, facturas, etc).\n\n¿Deseas continuar?")) return;

        try {
            await deleteOrganization(orgId)
            toast.success("Organización eliminada correctamente")
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Error al eliminar")
        }
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            {/* INJECT PREMIUM SHEET & EDIT MODAL */}
            <OrgDetailsSheet
                orgId={activeSheetOrgId}
                isOpen={!!activeSheetOrgId}
                onClose={() => setActiveSheetOrgId(null)}
            />
            <EditOrganizationDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                organization={editOrg}
                onSuccess={() => { router.refresh() }}
            />
            <ManualBillingModal
                isOpen={!!billingOrg}
                onOpenChange={(open) => !open && setBillingOrg(null)}
                organizationId={billingOrg?.id || ""}
                organizationName={billingOrg?.name || ""}
            />

            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">Red de Organizaciones</h2>
                        <p className="text-sm text-muted-foreground">Gestión centralizada de todos los tenants del sistema.</p>
                    </div>
                    <Button onClick={() => setCreationOpen(true)} className="bg-brand-pink text-white hover:bg-brand-pink/90 font-semibold text-xs rounded-xl h-10 px-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Organización
                    </Button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900/50 p-2 rounded-xl border border-gray-200/50 dark:border-white/10 shadow-sm">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, correo de propietario o slug..."
                            className="pl-9 bg-transparent border-none shadow-none focus-visible:ring-0 text-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="h-6 w-px bg-border mx-2" />
                    <div className="flex gap-2">
                        <Badge
                            variant={filter === 'all' ? 'default' : 'outline'}
                            className="cursor-pointer rounded-lg text-xs"
                            onClick={() => setFilter('all')}
                        >
                            Todos ({organizations.length})
                        </Badge>
                        <Badge
                            variant={filter === 'active' ? 'secondary' : 'outline'}
                            className="cursor-pointer hover:bg-emerald-100 hover:text-emerald-800 rounded-lg text-xs"
                            onClick={() => setFilter('active')}
                        >
                            Activos ({organizations.filter(o => o.status === 'active').length})
                        </Badge>
                        <Badge
                            variant={filter === 'suspended' ? 'destructive' : 'outline'}
                            className="cursor-pointer rounded-lg text-xs"
                            onClick={() => setFilter('suspended')}
                        >
                            Suspendidos ({organizations.filter(o => o.status === 'suspended').length})
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-gray-200/50 dark:border-white/10 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/5">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Organización & Propietario</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Estado</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Plan / Membresía</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Canales Conectados</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Uso & Métricas</TableHead>
                            <TableHead className="font-bold text-xs uppercase tracking-wider h-11">Ciclo / Expiración</TableHead>
                            <TableHead className="text-right font-bold text-xs uppercase tracking-wider h-11 pr-6">Acciones Rápidas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrgs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground bg-slate-50/50 dark:bg-transparent">
                                    <div className="flex justify-center items-center flex-col gap-2">
                                        <span className="text-4xl opacity-20">∅</span>
                                        <span>No hay organizaciones encontradas.</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrgs.map((org) => {
                                const planName = org.saas_subscriptions?.saas_apps?.name || org.base_app_slug || 'Plan Estándar'

                                return (
                                    <TableRow key={org.id} className="group hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors duration-200">
                                        {/* 1. Org Name & Owner Email */}
                                        <TableCell className="py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black shrink-0 shadow-xs">
                                                    {org.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2 truncate">
                                                        {org.name}
                                                        {PROTECTED_ORG_SLUGS.includes(org.slug) && (
                                                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold shrink-0">
                                                                SISTEMA
                                                            </Badge>
                                                        )}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                                        <span className="truncate font-medium text-slate-600 dark:text-gray-300" title={org.owner_email || 'Sin correo asignado'}>
                                                            {org.owner_email || 'Sin correo de dueño'}
                                                        </span>
                                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                                        <span className="text-[10px] font-mono text-slate-400 truncate opacity-80" title={org.slug}>
                                                            {org.slug}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* 2. Status */}
                                        <TableCell className="py-3">
                                            <Badge
                                                variant="outline"
                                                className={`capitalize tracking-wider text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border shadow-none ${
                                                    org.status === 'active' 
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                                        : org.status === 'suspended'
                                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                }`}
                                            >
                                                {org.status === 'active' ? 'Activo' : org.status === 'suspended' ? 'Suspendido' : org.status}
                                            </Badge>
                                        </TableCell>

                                        {/* 3. Plan / Membership */}
                                        <TableCell className="py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-800 dark:text-gray-200 capitalize">
                                                    {planName}
                                                </span>
                                                {org.saas_subscriptions?.bypass_until && new Date(org.saas_subscriptions.bypass_until) > new Date() ? (
                                                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Beneficio Cortesía</span>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground">Plan Licenciado</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* 4. Canales Conectados */}
                                        <TableCell className="py-3">
                                            {renderConnectedChannels(org.connected_channels)}
                                        </TableCell>

                                        {/* 5. Usage & Metrics (NEW Column) */}
                                        <TableCell className="py-3">
                                            <div className="flex items-center gap-3 text-xs">
                                                <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-gray-300" title="Miembros del equipo">
                                                    <Users className="h-3.5 w-3.5 text-blue-500" />
                                                    <span>{org.member_count ?? 0}</span>
                                                </div>
                                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                                <div className="flex items-center gap-1 font-semibold text-slate-600 dark:text-gray-300" title="Contactos/Clientes gestionados">
                                                    <Briefcase className="h-3.5 w-3.5 text-emerald-500" />
                                                    <span>{org.client_count ?? 0}</span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* 6. Renewal / Cycle */}
                                        <TableCell className="py-3 text-xs">
                                            {org.saas_subscriptions?.bypass_until && new Date(org.saas_subscriptions.bypass_until) > new Date() ? (
                                                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg w-max text-[11px]">
                                                    <Shield className="h-3 w-3" />
                                                    Cortesía (hasta {format(new Date(org.saas_subscriptions.bypass_until), 'dd MMM', { locale: es })})
                                                </span>
                                            ) : org.saas_subscriptions?.status === 'active' || org.saas_subscriptions?.status === 'legacy_manual' ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                    {org.saas_subscriptions.status === 'legacy_manual' ? 'Manual: ' : 'Renueva: '}
                                                    {org.saas_subscriptions.current_period_end ? format(new Date(org.saas_subscriptions.current_period_end), 'dd MMM yyyy', { locale: es }) : '-'}
                                                </span>
                                            ) : org.saas_subscriptions?.status === 'past_due' ? (
                                                <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    En Mora ({org.saas_subscriptions.current_period_end ? format(new Date(org.saas_subscriptions.current_period_end), 'dd MMM', { locale: es }) : '-'})
                                                </span>
                                            ) : org.status === 'suspended' ? (
                                                <span className="text-red-600 dark:text-red-400 font-bold">Bloqueado</span>
                                            ) : org.trial_ends_at && new Date(org.trial_ends_at) > new Date() ? (
                                                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Expira: {format(new Date(org.trial_ends_at), 'dd MMM yyyy', { locale: es })}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">Expirado / Sin Plan</span>
                                            )}
                                        </TableCell>

                                        {/* 7. Actions */}
                                        <TableCell className="text-right pr-6 py-3">
                                            <div className="flex justify-end gap-1.5">
                                                {/* 1. Settings Action - Opens Sheet */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 shrink-0 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 rounded-xl"
                                                    title="Panel Integral del Tenant"
                                                    onClick={() => setActiveSheetOrgId(org.id)}
                                                >
                                                    <Settings className="h-4 w-4" />
                                                </Button>

                                                {/* 2. Edit Basic Properties Action */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 shrink-0 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 rounded-xl"
                                                    title="Editar Parámetros"
                                                    onClick={() => { setEditOrg(org); setIsEditOpen(true); }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>

                                                {/* 3. Manual Billing Action */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 shrink-0 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl"
                                                    title="Generar Cobro Manual (Pixy)"
                                                    onClick={() => setBillingOrg({ id: org.id, name: org.name })}
                                                >
                                                    <Receipt className="h-4 w-4" />
                                                </Button>

                                                {/* 4. Delete Action */}
                                                {!PROTECTED_ORG_SLUGS.includes(org.slug) && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 shrink-0 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-xl"
                                                        title="Eliminar Definitivamente"
                                                        onClick={() => handleDelete(org.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="mt-4 text-xs text-muted-foreground text-center">
                Mostrando {filteredOrgs.length} de {organizations.length} organizaciones
            </div>

            <CreateOrganizationSheet
                open={creationOpen}
                onOpenChange={setCreationOpen}
                onSuccess={() => {
                    router.refresh()
                }}
            />
        </Card>
    )
}


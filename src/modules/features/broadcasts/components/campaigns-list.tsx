'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Folder,
    MoreHorizontal,
    Trash2,
    Clock,
    Megaphone,
    ArrowRight,
    Plus
} from 'lucide-react'
import Link from 'next/link'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { createCampaign, getCampaigns, deleteCampaign, Campaign } from '../marketing-actions'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function CampaignsList() {
    const router = useRouter()
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newCampaignName, setNewCampaignName] = useState('')

    useEffect(() => {
        loadCampaigns()
    }, [])

    async function loadCampaigns() {
        setLoading(true)
        const result = await getCampaigns()
        if (result.success) {
            setCampaigns(result.campaigns!)
        }
        setLoading(false)
    }

    async function handleCreate() {
        if (!newCampaignName.trim()) return

        const result = await createCampaign({ name: newCampaignName })
        if (result.success) {
            toast.success('Campaña creada')
            setIsCreateOpen(false)
            setNewCampaignName('')
            // Auto-redirect to builder
            router.push(`/crm/marketing/campaigns/${result.campaign!.id}`)
        } else {
            toast.error(result.error)
        }
    }

    async function handleEdit(id: string) {
        router.push(`/crm/marketing/campaigns/${id}`)
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Estás seguro de eliminar esta campaña?')) return
        const result = await deleteCampaign(id)
        if (result.success) {
            toast.success('Campaña eliminada')
            loadCampaigns()
        } else {
            toast.error(result.error)
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando campañas...</div>
    }

    if (campaigns.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                <div className="p-6 bg-gradient-to-tr from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full mb-6 relative">
                    <Megaphone className="w-12 h-12 text-brand-pink" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Comienza tu primera Campaña</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md text-center mb-8">
                    Organiza tus envíos, crea secuencias automáticas y mide el impacto real de tu marketing.
                </p>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-brand-pink text-white hover:bg-brand-pink/90">Crear Campaña</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nueva Campaña</DialogTitle>
                            <DialogDescription>Asigna un nombre para identificar tu campaña</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input
                                    placeholder="Ej: Black Friday 2026"
                                    value={newCampaignName}
                                    onChange={(e) => setNewCampaignName(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleCreate} disabled={!newCampaignName.trim()} className="w-full bg-brand-pink text-white hover:bg-brand-pink/90">
                                Crear
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mis Campañas</h3>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline"> <Plus className="w-4 h-4 mr-2" /> Nueva </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nueva Campaña</DialogTitle>
                            <DialogDescription>Asigna un nombre para identificar tu campaña</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input
                                    placeholder="Ej: Black Friday 2026"
                                    value={newCampaignName}
                                    onChange={(e) => setNewCampaignName(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleCreate} disabled={!newCampaignName.trim()} className="w-full bg-brand-pink text-white hover:bg-brand-pink/90">
                                Crear
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map(campaign => (
                    <Card key={campaign.id} className="group hover:shadow-lg transition-all border-gray-100 dark:border-white/10 overflow-hidden bg-white dark:bg-white/5">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors text-blue-600 dark:text-blue-400">
                                        <Folder className="w-5 h-5 fill-current" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">{campaign.name}</h4>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true, locale: es })}
                                        </p>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(campaign.id)}>
                                            Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDelete(campaign.id)} className="text-red-600">
                                            <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Impactados</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{campaign.total_enrolled}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Engagement</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{campaign.engagement_score}%</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                    {campaign.status === 'draft' ? 'Borrador' : 'Activa'}
                                </Badge>
                                <Link href={`/crm/marketing/campaigns/${campaign.id}`}>
                                    <Button size="sm" variant="ghost" className="h-7 hover:bg-blue-50 hover:text-blue-600 px-2 -mr-2">
                                        Ver Detalles <ArrowRight className="w-3 h-3 ml-1" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        {/* Progress Bar (Fake for now) */}
                        <div className="h-1 w-full bg-gray-100 dark:bg-white/5">
                            <div className="h-full bg-blue-500 w-[0%] transition-all" />
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}

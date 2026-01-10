'use client'

import { useState, useEffect } from 'react'
import { Campaign, Sequence, Audience, getSequences, createSequence, addStepToSequence, deleteStep, updateCampaign, getAudiences, createAudience, deleteAudience, previewAudienceCount, importLeads, getCampaign, getCampaignStats, updateStep, deleteSequence, linkAudienceToCampaign, enrollAudienceInCampaign } from '../marketing-actions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Plus, GitMerge, Clock, Mail, MessageSquare, Play, Sparkles,
    AlertCircle, Trash2, X, Settings, Users, Shield, Zap, Lock,
    Activity, BarChart2, Edit2, MoreVertical, Filter, Upload, FileSpreadsheet, Search, RefreshCw
} from 'lucide-react'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader,
    DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CampaignBuilderProps {
    campaignId: string
    campaignName: string
}

export function CampaignBuilder({ campaignId, campaignName }: CampaignBuilderProps) {
    const [sequences, setSequences] = useState<Sequence[]>([])
    const [loading, setLoading] = useState(true)
    const [activeSequence, setActiveSequence] = useState<string | null>(null)
    const [audiences, setAudiences] = useState<Audience[]>([])
    const [campaignStatus, setCampaignStatus] = useState<'draft' | 'active' | 'paused' | 'completed' | 'archived'>('draft')
    const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null)
    const [scheduledFor, setScheduledFor] = useState<string>('')
    const [isEnrolling, setIsEnrolling] = useState(false)

    // Insights State
    const [stats, setStats] = useState<{
        stats: { total: number, active: number, completed: number, failed: number },
        recentActivity: any[]
    } | null>(null)

    // Safety Config State
    const [deliveryConfig, setDeliveryConfig] = useState({
        mode: 'stealth',
        humanize: true,
        start_hour: 9,
        end_hour: 18
    })

    // Create Sequence State
    const [isCreateSeqOpen, setIsCreateSeqOpen] = useState(false)
    const [newSeqName, setNewSeqName] = useState('')

    // Add Step State
    const [isAddStepOpen, setIsAddStepOpen] = useState(false)
    const [editingStepId, setEditingStepId] = useState<string | null>(null)
    const [stepForm, setStepForm] = useState({ type: 'email', name: '', content: '', delay: '1' })

    // Audience Manager State
    const [isCreateAudienceOpen, setIsCreateAudienceOpen] = useState(false)
    const [audienceName, setAudienceName] = useState('')
    const [audienceFilters, setAudienceFilters] = useState({ status: '', tags: [] as string[], has_phone: true })
    const [audiencePreviewCount, setAudiencePreviewCount] = useState<number | null>(null)
    const [isImportOpen, setIsImportOpen] = useState(false)

    useEffect(() => {
        loadData()
    }, [campaignId])

    async function loadData() {
        setLoading(true)
        const [seqResult, audResult, campResult, statsResult] = await Promise.all([
            getSequences(campaignId),
            getAudiences(),
            getCampaign(campaignId),
            getCampaignStats(campaignId)
        ])

        if (seqResult.success) {
            setSequences(seqResult.sequences!)
            if (seqResult.sequences!.length > 0 && !activeSequence) {
                setActiveSequence(seqResult.sequences![0].id)
            }
        }
        if (audResult.success) {
            setAudiences(audResult.audiences || [])
        }
        if (campResult.success && campResult.campaign) {
            setCampaignStatus(campResult.campaign.status)
            setDeliveryConfig(campResult.campaign.delivery_config as any || deliveryConfig)
            // Load linked audience
            setSelectedAudienceId((campResult.campaign as any).audience_id || null)
            setScheduledFor((campResult.campaign as any).scheduled_for || '')
        }
        if (statsResult.success) {
            setStats(statsResult)
        }
        setLoading(false)
    }

    async function handleToggleStatus() {
        const newStatus = campaignStatus === 'active' ? 'paused' : 'active'

        if (newStatus === 'active') {
            // When activating, enroll the linked audience
            if (!selectedAudienceId) {
                toast.error('Primero selecciona una audiencia en la pestaña Configuración')
                return
            }

            setIsEnrolling(true)
            toast.info('Inscribiendo leads...')

            const enrollResult = await enrollAudienceInCampaign(campaignId)
            setIsEnrolling(false)

            if (!enrollResult.success) {
                toast.error(enrollResult.error || 'Error al inscribir')
                return
            }

            toast.success(`¡${enrollResult.enrolled} leads inscritos! Campaña Activada 🚀`)
            setCampaignStatus('active')
            loadData() // Refresh stats
        } else {
            // Pausing is simple
            const result = await updateCampaign(campaignId, { status: 'paused' })
            if (result.success) {
                setCampaignStatus('paused')
                toast.success('Campaña Pausada ⏸️')
            } else {
                toast.error(result.error)
            }
        }
    }

    async function handleLinkAudience(audienceId: string) {
        const result = await linkAudienceToCampaign(campaignId, audienceId)
        if (result.success) {
            setSelectedAudienceId(audienceId)
            toast.success('Audiencia vinculada')
        } else {
            toast.error(result.error)
        }
    }

    async function handleCreateSequence() {
        if (!newSeqName.trim()) return
        const result = await createSequence({ name: newSeqName, campaign_id: campaignId, trigger_type: 'manual' })
        if (result.success) {
            toast.success('Secuencia creada')
            setIsCreateSeqOpen(false)
            setNewSeqName('')
            loadData()
        } else {
            toast.error(result.error)
        }
    }

    async function handleDeleteSequence(seqId: string) {
        if (!confirm('¿Eliminar esta secuencia y todos sus pasos?')) return
        const result = await deleteSequence(seqId)
        if (result.success) {
            toast.success('Secuencia eliminada')
            if (activeSequence === seqId) setActiveSequence(null)
            loadData()
        } else {
            toast.error(result.error)
        }
    }

    // --- Audience Handlers ---

    async function handlePreviewAudience() {
        setAudiencePreviewCount(null)
        const result = await previewAudienceCount(audienceFilters)
        if (result.success) {
            setAudiencePreviewCount(result.count || 0)
        } else {
            setAudiencePreviewCount(null)
            toast.error('Error: ' + result.error)
        }
    }

    async function handleCreateAudience() {
        if (!audienceName) return toast.error('Nombre requerido')

        const result = await createAudience({
            name: audienceName,
            filter_config: audienceFilters
        })

        if (result.success) {
            toast.success('Audiencia creada')
            setIsCreateAudienceOpen(false)
            setAudienceName('')
            setAudienceFilters({ status: '', tags: [], has_phone: true })
            setAudiencePreviewCount(null)
            loadData()
        } else {
            toast.error(result.error)
        }
    }

    async function handleDeleteAudience(id: string) {
        if (!confirm('¿Eliminar esta audiencia?')) return
        const result = await deleteAudience(id)
        if (result.success) {
            toast.success('Audiencia eliminada')
            loadData()
        } else {
            toast.error(result.error)
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            const text = event.target?.result as string
            const lines = text.split('\n').filter(l => l.trim())
            if (lines.length < 2) return toast.error('Archivo vacío o sin datos')

            // Simple header detection
            const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
            const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('nombre'))
            const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('tel') || h.includes('cel'))
            const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('correo'))

            if (phoneIdx === -1 && emailIdx === -1) {
                return toast.error('No se detectó columna de Teléfono o Email. Formato: Nombre, Telefono, Email')
            }

            const leads = lines.slice(1).map(line => {
                const cols = line.split(',').map(c => c.trim())
                return {
                    name: nameIdx !== -1 ? cols[nameIdx] : 'Unknown',
                    phone: phoneIdx !== -1 ? cols[phoneIdx] : null,
                    email: emailIdx !== -1 ? cols[emailIdx] : null
                }
            })

            const toastId = toast.loading(`Importando ${leads.length} contactos...`)
            const result = await importLeads(leads)
            toast.dismiss(toastId)

            if (result.success) {
                toast.success(`${result.count} Contactos procesados correctamente`)
                setIsImportOpen(false)
            } else {
                toast.error(result.error)
            }
        }
        reader.readAsText(file)
    }

    function openAddStep() {
        setEditingStepId(null)
        setStepForm({ type: 'email', name: '', content: '', delay: '1' })
        setIsAddStepOpen(true)
    }

    function openEditStep(step: any) {
        setEditingStepId(step.id)
        setStepForm({
            type: step.type,
            name: step.name,
            content: step.type === 'delay' ? '' : (step.content?.body || ''),
            delay: step.type === 'delay' ? (step.delay_config?.duration || '1') : '1'
        })
        setIsAddStepOpen(true)
    }

    async function handleSaveStep() {
        if (!activeSequence) return
        if (!stepForm.name) {
            toast.error('Nombre requerido')
            return
        }

        const content = stepForm.type === 'delay' ? { duration: stepForm.delay } : { body: stepForm.content }
        const stepData = {
            type: stepForm.type, name: stepForm.name, content,
            delay_config: stepForm.type === 'delay' ? { duration: stepForm.delay, unit: 'days' } : undefined
        }

        let result
        if (editingStepId) {
            result = await updateStep(editingStepId, stepData)
        } else {
            result = await addStepToSequence(activeSequence, stepData)
        }

        if (result.success) {
            toast.success(editingStepId ? 'Paso actualizado' : 'Paso añadido')
            setIsAddStepOpen(false)
            setEditingStepId(null)
            setStepForm({ type: 'email', name: '', content: '', delay: '1' })
            loadData()
        } else {
            toast.error(result.error)
        }
    }

    async function handleDeleteStep(stepId: string) {
        if (!confirm('¿Eliminar este paso?')) return
        const result = await deleteStep(stepId)
        if (result.success) {
            toast.success('Paso eliminado')
            loadData()
        }
    }

    async function handleSaveConfig() {
        const result = await updateCampaign(campaignId, { delivery_config: deliveryConfig } as any)
        if (result.success) {
            toast.success('Configuración guardada')
        } else {
            toast.error(result.error)
        }
    }

    const currentSequence = sequences.find(s => s.id === activeSequence)

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {campaignName}
                        <Badge variant={campaignStatus === 'active' ? 'default' : 'outline'} className={cn("ml-2 font-normal", campaignStatus === 'active' ? "bg-green-500 hover:bg-green-600" : "")}>
                            {campaignStatus === 'active' ? 'Activa' : (campaignStatus === 'paused' ? 'Pausada' : 'Borrador')}
                        </Badge>
                        {stats && (
                            <div className="flex items-center gap-2 ml-4 text-sm font-medium text-muted-foreground border-l pl-4">
                                <span title="Total Inscritos" className="flex items-center gap-1"><Users className="w-4 h-4" /> {stats.stats.total}</span>
                                <span title="En Progreso" className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400"><Activity className="w-4 h-4" /> {stats.stats.active}</span>
                            </div>
                        )}
                    </h2>
                    <p className="text-sm text-muted-foreground">Marketing Engine Configuration</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleToggleStatus}
                        className={cn("shadow-lg transition-all", campaignStatus === 'active' ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20" : "bg-green-600 text-white hover:bg-green-700 shadow-green-500/20")}
                    >
                        {campaignStatus === 'active' ? <><div className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" /> Pausar Campaña</> : <><Play className="w-4 h-4 mr-2" /> Activar Campaña</>}
                    </Button>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="design" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="bg-white dark:bg-zinc-900 border border-gray-100 px-2 justify-start w-fit rounded-lg mb-4">
                    <TabsTrigger value="design" className="gap-2"><GitMerge className="w-4 h-4" /> Diseñador</TabsTrigger>
                    <TabsTrigger value="audience" className="gap-2"><Users className="w-4 h-4" /> Audiencia</TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" /> Configuración & Seguridad</TabsTrigger>
                    {campaignStatus !== 'draft' && (
                        <TabsTrigger value="results" className="gap-2 text-brand-pink data-[state=active]:bg-brand-pink/10"><BarChart2 className="w-4 h-4" /> Resultados</TabsTrigger>
                    )}
                </TabsList>

                {/* --- DESIGN TAB --- */}
                <TabsContent value="design" className="flex-1 flex gap-6 overflow-hidden mt-0">
                    {/* Sidebar */}
                    <div className="w-64 shrink-0 flex flex-col gap-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Secuencias</h3>
                            <Dialog open={isCreateSeqOpen} onOpenChange={setIsCreateSeqOpen}>
                                <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-6 w-6"><Plus className="w-4 h-4" /></Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Nueva Secuencia</DialogTitle></DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <Input placeholder="Ej: Bienvenida" value={newSeqName} onChange={(e) => setNewSeqName(e.target.value)} />
                                        <Button onClick={handleCreateSequence} className="w-full">Crear</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="space-y-1">
                            {sequences.map(seq => (
                                <div key={seq.id} className={cn("group flex items-center gap-2 w-full p-2 rounded-lg text-sm font-medium transition-all", activeSequence === seq.id ? "bg-blue-50 text-blue-700 border border-blue-200" : "hover:bg-gray-100 text-gray-700")}>
                                    <button onClick={() => setActiveSequence(seq.id)} className="flex-1 text-left flex items-center gap-3 truncate">
                                        <GitMerge className="w-4 h-4 shrink-0 opacity-70" /> <span className="truncate">{seq.name}</span>
                                    </button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical className="w-3 h-3" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDeleteSequence(seq.id)}><Trash2 className="w-3 h-3 mr-2" /> Eliminar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Canvas */}
                    <Card className="flex-1 bg-slate-50/50 dark:bg-zinc-900/50 border-gray-200 flex flex-col overflow-hidden relative">
                        {!currentSequence ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground"><Sparkles className="w-12 h-12 mb-4 text-gray-300" /><p>Selecciona una secuencia</p></div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
                                    <h3 className="font-bold flex items-center gap-2"><GitMerge className="w-4 h-4 text-blue-500" />{currentSequence.name}</h3>
                                    <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
                                        <Button size="sm" variant="outline" onClick={openAddStep}><Plus className="w-3 h-3 mr-2" />Agregar Paso</Button>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Añadir Paso</DialogTitle></DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <Label>Tipo</Label>
                                                <Select value={stepForm.type} onValueChange={(v) => setStepForm({ ...stepForm, type: v })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="delay">Delay</SelectItem></SelectContent>
                                                </Select>
                                                <Label>Nombre</Label><Input value={stepForm.name} onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })} />
                                                <Label>Contenido / Duración</Label>
                                                {stepForm.type === 'delay' ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input type="number" value={stepForm.delay} onChange={(e) => setStepForm({ ...stepForm, delay: e.target.value })} />
                                                        <span className="text-sm text-muted-foreground">días</span>
                                                    </div>
                                                ) : (
                                                    <Textarea value={stepForm.content} onChange={(e) => setStepForm({ ...stepForm, content: e.target.value })} />
                                                )}
                                                <Button onClick={handleSaveStep} className="w-full">{editingStepId ? 'Guardar Cambios' : 'Añadir'}</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <ScrollArea className="flex-1 p-8">
                                    <div className="max-w-2xl mx-auto space-y-8 pb-20 relative">
                                        <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-200 -z-10" />
                                        <div className="flex gap-6 relative"><div className="w-16 flex justify-center"><div className="w-8 h-8 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center"><Play className="w-3 h-3 text-green-600" /></div></div><div className="pt-1"><h4 className="font-semibold">Inicio</h4></div></div>
                                        {currentSequence.steps?.map((step, idx) => (
                                            <div key={step.id} className="flex gap-6 relative group">
                                                {/* Connector Line */}
                                                {idx < (currentSequence.steps?.length || 0) - 1 && (
                                                    <div className="absolute left-8 top-10 bottom-[-24px] w-0.5 bg-gray-200 -z-10" />
                                                )}

                                                <div className="w-16 flex justify-center"><div className="w-10 h-10 rounded-xl bg-white border shadow-sm flex items-center justify-center z-10 group-hover:scale-110 transition-transform cursor-pointer" onClick={() => openEditStep(step)}>{step.type === 'email' ? <Mail className="w-5 h-5 text-purple-500" /> : step.type === 'whatsapp' ? <MessageSquare className="w-5 h-5 text-green-500" /> : <Clock className="w-5 h-5 text-amber-500" />}</div></div>
                                                <Card className="flex-1 p-4 bg-white border-gray-100 hover:shadow-md transition-all relative cursor-pointer" onClick={() => openEditStep(step)}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1"><Badge variant="outline" className="text-[10px] h-5 uppercase">{step.type}</Badge></div>
                                                            <h4 className="font-semibold">{step.name}</h4>
                                                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{step.type === 'delay' ? `Esperar ${step.delay_config?.duration} días` : step.content?.body}</p>
                                                        </div>
                                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => openEditStep(step)}><Edit2 className="w-3 h-3 text-gray-400 hover:text-blue-500" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteStep(step.id)}><Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" /></Button>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </Card>
                </TabsContent>


                {/* --- AUDIENCE TAB --- */}
                <TabsContent value="audience" className="flex-1 mt-0 overflow-hidden">
                    <div className="flex gap-6 h-full">
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            <Card className="p-6 h-full flex flex-col">
                                <div className="flex justify-between items-center mb-6 shrink-0">
                                    <div>
                                        <h3 className="text-xl font-bold">Mis Audiencias</h3>
                                        <p className="text-sm text-muted-foreground">Gestiona tus segmentos de clientes</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setIsImportOpen(true)}><Upload className="w-4 h-4 mr-2" /> Importar CSV</Button>
                                        <Button onClick={() => setIsCreateAudienceOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nueva Audiencia</Button>
                                    </div>
                                </div>
                                <ScrollArea className="flex-1 -mr-4 pr-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                                        {audiences.map(aud => (
                                            <Card key={aud.id} className="p-4 relative group hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-blue-500">
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDeleteAudience(aud.id)}><Trash2 className="w-4 h-4" /></Button>
                                                </div>
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0"><Users className="w-5 h-5" /></div>
                                                    <div className="overflow-hidden">
                                                        <h4 className="font-semibold truncate" title={aud.name}>{aud.name}</h4>
                                                        <Badge variant="secondary" className="text-xs mt-1">{aud.cached_count} contactos</Badge>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground bg-slate-50 p-2 rounded line-clamp-2 border h-10">
                                                    {aud.filter_config?.status ? `Estado: ${aud.filter_config.status}` : 'Todos los estados'}
                                                    {aud.filter_config?.has_phone && ', Solo WhatsApp'}
                                                </div>
                                            </Card>
                                        ))}
                                        {audiences.length === 0 && (
                                            <div className="col-span-full py-12 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                                                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                                <p>No hay audiencias creadas</p>
                                                <Button variant="link" onClick={() => setIsCreateAudienceOpen(true)}>Crear la primera</Button>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </Card>
                        </div>
                    </div>

                    <Dialog open={isCreateAudienceOpen} onOpenChange={setIsCreateAudienceOpen}>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Crear Audiencia Inteligente</DialogTitle>
                                <DialogDescription>
                                    Filtra usuarios de tu <strong>Base de Datos de Clientes (CRM)</strong>.
                                    Incluye contactos importados y leads entrantes.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <div className="grid gap-2">
                                    <Label>Nombre del Segmento</Label>
                                    <Input value={audienceName} onChange={e => setAudienceName(e.target.value)} placeholder="Ej: Clientes VIP Activos" />
                                </div>

                                <div className="border rounded-lg p-4 space-y-4 bg-slate-50 dark:bg-zinc-900/50">
                                    <h4 className="font-medium text-sm flex items-center gap-2 text-blue-800"><Filter className="w-4 h-4" /> Configuración de Filtros</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Estado del Cliente</Label>
                                            <Select value={audienceFilters.status} onValueChange={(v) => setAudienceFilters({ ...audienceFilters, status: v })}>
                                                <SelectTrigger><SelectValue placeholder="Cualquiera" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="new">Nuevo</SelectItem>
                                                    <SelectItem value="contacted">Contactado</SelectItem>
                                                    <SelectItem value="qualified">Calificado</SelectItem>
                                                    <SelectItem value="closed">Cerrado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 flex flex-col justify-end">
                                            <div className="flex items-center gap-3 border p-3 rounded-md bg-white shadow-sm">
                                                <Switch checked={audienceFilters.has_phone} onCheckedChange={(c) => setAudienceFilters({ ...audienceFilters, has_phone: c })} />
                                                <Label className="cursor-pointer" onClick={() => setAudienceFilters({ ...audienceFilters, has_phone: !audienceFilters.has_phone })}>Solo con WhatsApp Valido</Label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg text-blue-900 border border-blue-100">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-white p-2 rounded-full shadow-sm"><Users className="w-5 h-5 text-blue-600" /></div>
                                        <div className="flex flex-col">
                                            <div className="flex items-baseline gap-1">
                                                <span className="font-bold text-xl">{audiencePreviewCount !== null ? audiencePreviewCount : '-'}</span>
                                                <span className="text-sm opacity-80">contactos coinciden</span>
                                            </div>
                                            {audiencePreviewCount === null && <span className="text-xs text-blue-600/70">Calculando...</span>}
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={handlePreviewAudience} className="bg-white hover:bg-blue-50 text-blue-700 border-blue-200"><RefreshCw className="w-4 h-4 mr-2" /> Recalcular</Button>
                                </div>

                                <Button onClick={handleCreateAudience} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">Guardar Audiencia</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Placeholder for CSV Import Dialog - To be implemented next step if verified */}
                    <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Importar Contactos (CSV)</DialogTitle></DialogHeader>
                            <div className="py-8 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg bg-slate-50 relative group hover:bg-blue-50 transition-colors">
                                <FileSpreadsheet className="w-12 h-12 text-green-500 mb-4 group-hover:scale-110 transition-transform" />
                                <p className="font-medium text-lg">Arrastra tu archivo aquí</p>
                                <p className="text-sm text-muted-foreground mb-4">Formato CSV: Nombre, Teléfono, Email</p>
                                <Label htmlFor="csv-upload" className="cursor-pointer">
                                    <div className="bg-white border rounded-md px-4 py-2 hover:bg-gray-50 shadow-sm font-medium">Seleccionar Archivo</div>
                                    <Input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                                </Label>
                            </div>
                            <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 flex gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                Los contactos importados se añadirán a la base de datos general y se validarán duplicados por teléfono.
                            </div>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                {/* --- SETTINGS TAB (Smart Guard) --- */}
                <TabsContent value="settings" className="flex-1 mt-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="max-w-4xl mx-auto py-8 px-4">
                            {/* Audience Selector */}
                            <Card className="p-6 mb-8 border-2 border-blue-200 bg-blue-50/50">
                                <div className="flex items-center gap-3 mb-4">
                                    <Users className="w-6 h-6 text-blue-600" />
                                    <div>
                                        <h4 className="font-bold text-lg">Audiencia de la Campaña</h4>
                                        <p className="text-sm text-muted-foreground">Selecciona qué contactos recibirán esta campaña</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Audiencia</Label>
                                        <Select value={selectedAudienceId || ''} onValueChange={handleLinkAudience}>
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Seleccionar audiencia..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {audiences.map(aud => (
                                                    <SelectItem key={aud.id} value={aud.id}>
                                                        {aud.name} ({aud.cached_count} contactos)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Programar Envío (Opcional)</Label>
                                        <Input
                                            type="datetime-local"
                                            value={scheduledFor}
                                            onChange={(e) => setScheduledFor(e.target.value)}
                                            className="bg-white"
                                        />
                                        <p className="text-xs text-muted-foreground">Deja vacío para iniciar inmediatamente al activar</p>
                                    </div>
                                </div>
                                {selectedAudienceId && (
                                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 text-green-800 text-sm flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        Audiencia vinculada. Al activar la campaña se inscribirán automáticamente los leads.
                                    </div>
                                )}
                            </Card>

                            <div className="flex items-center gap-3 mb-8">
                                <Shield className="w-8 h-8 text-brand-pink" />
                                <div>
                                    <h3 className="text-2xl font-bold">Smart Guard 🛡️</h3>
                                    <p className="text-muted-foreground">Configuración de entrega segura y prevención de bloqueos</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className={cn("p-6 rounded-2xl border-2 cursor-pointer transition-all", deliveryConfig.mode === 'stealth' ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-200")} onClick={() => setDeliveryConfig({ ...deliveryConfig, mode: 'stealth' })}>
                                    <div className="p-3 bg-green-100 rounded-lg w-fit mb-4"><Shield className="w-6 h-6 text-green-700" /></div>
                                    <h4 className="font-bold text-lg mb-2">Stealth Mode</h4>
                                    <p className="text-sm text-gray-600 mb-4">Máxima seguridad. Imita comportamiento humano con pausas largas.</p>
                                    <Badge variant="outline" className="bg-green-100 text-green-700 border-none">Recomendado</Badge>
                                </div>
                                <div className={cn("p-6 rounded-2xl border-2 cursor-pointer transition-all", deliveryConfig.mode === 'growth' ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200")} onClick={() => setDeliveryConfig({ ...deliveryConfig, mode: 'growth' })}>
                                    <div className="p-3 bg-blue-100 rounded-lg w-fit mb-4"><Users className="w-6 h-6 text-blue-700" /></div>
                                    <h4 className="font-bold text-lg mb-2">Growth</h4>
                                    <p className="text-sm text-gray-600 mb-4">Balance ideal entre velocidad y seguridad para listas tibias.</p>
                                </div>
                                <div className={cn("p-6 rounded-2xl border-2 cursor-pointer transition-all", deliveryConfig.mode === 'turbo' ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-red-200")} onClick={() => setDeliveryConfig({ ...deliveryConfig, mode: 'turbo' })}>
                                    <div className="p-3 bg-red-100 rounded-lg w-fit mb-4"><Zap className="w-6 h-6 text-red-700" /></div>
                                    <h4 className="font-bold text-lg mb-2">Turbo</h4>
                                    <p className="text-sm text-gray-600 mb-4">Máxima velocidad API. Solo para alertas críticas o listas 100% verificadas.</p>
                                    <Badge variant="destructive">Alto Riesgo</Badge>
                                </div>
                            </div>

                            <Card className="p-6 space-y-6">
                                <h4 className="font-semibold flex items-center gap-2"><Settings className="w-4 h-4" /> Configuración Avanzada</h4>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <div>
                                        <Label className="text-base font-semibold">Humanizar Contenido (AI Spintax)</Label>
                                        <p className="text-sm text-muted-foreground">Reescribe automáticamente variaciones para evitar huellas repetitivas.</p>
                                    </div>
                                    <Switch checked={deliveryConfig.humanize} onCheckedChange={(v) => setDeliveryConfig({ ...deliveryConfig, humanize: v })} />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <div>
                                        <Label className="text-base font-semibold">Horario de Protección</Label>
                                        <p className="text-sm text-muted-foreground">Solo enviar en horario comercial (9:00 - 18:00) para reducir quejas.</p>
                                    </div>
                                    <Switch checked={true} />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl opacity-70">
                                    <div>
                                        <Label className="text-base font-semibold">Circuit Breaker</Label>
                                        <p className="text-sm text-muted-foreground">Detener campaña si la tasa de error supera el 3% (Siempre activo).</p>
                                    </div>
                                    <Clock className="w-5 h-5 text-gray-400" />
                                </div>
                            </Card>

                            <div className="mt-8 flex justify-end pb-10">
                                <Button size="lg" onClick={handleSaveConfig} className="bg-brand-pink text-white hover:bg-brand-pink/90">Guardar Configuración</Button>
                            </div>
                        </div>
                    </ScrollArea>
                </TabsContent>

                {/* --- RESULTS TAB (Insights) --- */}
                <TabsContent value="results" className="flex-1 mt-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">

                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-pink/10 rounded-xl"><Activity className="w-8 h-8 text-brand-pink" /></div>
                                <div>
                                    <h3 className="text-2xl font-bold">Resultados y Ejecución</h3>
                                    <p className="text-muted-foreground">Monitoreo en tiempo real del rendimiento de tu campaña.</p>
                                </div>
                            </div>

                            {/* KPI Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="p-5 border-t-4 border-blue-500 shadow-sm">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Inscritos</p>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.stats?.total || 0}</p>
                                </Card>
                                <Card className="p-5 border-t-4 border-yellow-500 shadow-sm">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">En Progreso</p>
                                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats?.stats?.active || 0}</p>
                                </Card>
                                <Card className="p-5 border-t-4 border-green-500 shadow-sm">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Completados</p>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.stats?.completed || 0}</p>
                                </Card>
                                <Card className="p-5 border-t-4 border-red-500 shadow-sm">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Fallidos</p>
                                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats?.stats?.failed || 0}</p>
                                </Card>
                            </div>

                            {/* Recent Activity */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <Card className="lg:col-span-2 p-0 overflow-hidden">
                                    <div className="p-4 border-b bg-slate-50 dark:bg-zinc-800/50 flex justify-between items-center">
                                        <h4 className="font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /> Actividad Reciente</h4>
                                        <Button variant="ghost" size="sm" onClick={() => loadData()} className="text-xs h-7">Actualizar</Button>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {!stats?.recentActivity?.length ? (
                                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                                                <Activity className="w-12 h-12 text-gray-200 mb-2" />
                                                <p>No hay actividad reciente registrada.</p>
                                            </div>
                                        ) : (
                                            stats.recentActivity.map((log: any) => (
                                                <div key={log.id} className="p-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                    <div className={cn("mt-1 w-2 h-2 rounded-full shrink-0",
                                                        log.status === 'completed' ? 'bg-green-500' :
                                                            log.status === 'failed' ? 'bg-red-500' :
                                                                log.status === 'active' ? 'bg-yellow-500' : 'bg-gray-300'
                                                    )} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-sm font-semibold truncate">{log.lead?.phone || 'Desconocido'} <span className="text-muted-foreground font-normal">({log.lead?.name || 'Lead'})</span></p>
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.last_updated).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                                            {log.last_log?.action === 'message_sent' ? 'Mensaje enviado exitosamente' :
                                                                log.last_log?.error ? `Error: ${log.last_log.error}` :
                                                                    `Estado actualizado a: ${log.status}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>

                                <Card className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
                                    <h4 className="font-bold mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-blue-500" /> Estado del Motor</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Velocidad</span>
                                            <Badge variant="outline" className="bg-white">{deliveryConfig.mode.toUpperCase()}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Humanización</span>
                                            <span className={cn("text-xs font-medium", deliveryConfig.humanize ? "text-green-600" : "text-gray-500")}>
                                                {deliveryConfig.humanize ? 'Activada' : 'Desactivada'}
                                            </span>
                                        </div>
                                        <div className="pt-4 border-t border-blue-200/50">
                                            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                                El sistema está procesando activamente la cola. Los logs se actualizan cada vez que el "Runner" ejecuta un ciclo.
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                        </div>
                    </ScrollArea>
                </TabsContent>

            </Tabs>
        </div >
    )
}

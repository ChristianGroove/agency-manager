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
import { cn } from '@/modules/infrastructure/utils/utils'
import { useTranslation } from "@/modules/core/i18n/use-translation"

interface CampaignBuilderProps {
    campaignId: string
    campaignName: string
}

export function CampaignBuilder({ campaignId, campaignName }: CampaignBuilderProps) {
    const { t } = useTranslation()
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
        mode: 'stealth' as 'stealth' | 'growth' | 'turbo',
        humanize: true,
        schedule_window: { start: 9, end: 18 }
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
            let loadedSeqs = seqResult.sequences!
            if (loadedSeqs.length === 0) {
                const created = await createSequence({ name: 'Flujo Principal', campaign_id: campaignId, trigger_type: 'manual' })
                if (created.success) {
                    loadedSeqs = [{...created.sequence, steps: []}] as any[]
                }
            }
            setSequences(loadedSeqs)
            if (loadedSeqs.length > 0 && !activeSequence) {
                setActiveSequence(loadedSeqs[0].id)
            }
        }
        if (audResult.success) {
            setAudiences(audResult.audiences || [])
        }
        if (campResult.success && campResult.campaign) {
            setCampaignStatus(campResult.campaign.status)
            const dbConfig = campResult.campaign.delivery_config as any;
            setDeliveryConfig({
                mode: dbConfig?.mode || deliveryConfig.mode,
                humanize: dbConfig?.humanize ?? deliveryConfig.humanize,
                schedule_window: dbConfig?.schedule_window || deliveryConfig.schedule_window
            })
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
                            {campaignStatus === 'active' ? 'Activo' : (campaignStatus === 'paused' ? 'Pausado' : 'Borrador')}
                        </Badge>
                        {stats && (
                            <div className="flex items-center gap-2 ml-4 text-sm font-medium text-muted-foreground border-l dark:border-zinc-800 pl-4">
                                <span title="Total Inscritos" className="flex items-center gap-1"><Users className="w-4 h-4" /> {stats.stats.total}</span>
                                <span title="En Progreso" className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400"><Activity className="w-4 h-4" /> {stats.stats.active}</span>
                            </div>
                        )}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t("marketing.campaign_builder.settings_desc").replace("Administra parámetros de envío y protección de la campaña", "Constructor de Embudos Automatizados (Drip Campaigns)")}</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleToggleStatus}
                        className={cn("transition-all", campaignStatus === 'active' ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-brand-pink text-white hover:bg-brand-pink/90")}
                    >
                        {campaignStatus === 'active' ? <><div className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" /> {t("marketing.campaign_builder.pause_funnel")}</> : <><Play className="w-4 h-4 mr-2" /> {t("marketing.campaign_builder.activate_funnel")}</>}
                    </Button>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="design" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 px-2 justify-start w-fit rounded-lg mb-4">
                    <TabsTrigger value="design" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-500/20 dark:data-[state=active]:text-blue-400">
                        <GitMerge className="w-4 h-4 mr-2" /> {t("marketing.campaign_builder.design_tab")}
                    </TabsTrigger>
                    <TabsTrigger value="audience" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-500/20 dark:data-[state=active]:text-indigo-400">
                        <Users className="w-4 h-4 mr-2" /> {t("marketing.campaign_builder.audience_tab")}
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="data-[state=active]:bg-brand-pink/10 data-[state=active]:text-brand-pink">
                        <Shield className="w-4 h-4 mr-2" /> {t("marketing.campaign_builder.settings_tab")}
                    </TabsTrigger>
                    {campaignStatus !== 'draft' && (
                        <TabsTrigger value="results" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-500/20 dark:data-[state=active]:text-emerald-400">
                            <Activity className="w-4 h-4 mr-2" /> {t("marketing.campaign_builder.results_tab")}
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* --- DESIGN TAB --- */}
                <TabsContent value="design" className="flex-1 flex gap-6 overflow-hidden mt-0">
                    {/* Full Width Canvas */}
                    <Card className="flex-1 glass-card flex flex-col overflow-hidden relative">
                        {!currentSequence ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground"><Sparkles className="w-12 h-12 mb-4 text-gray-300 dark:text-zinc-700" /><p>{t("marketing.campaign_builder.empty_sequence")}</p></div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                <div className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center shadow-sm z-10">
                                    <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100"><GitMerge className="w-4 h-4 text-brand-pink" />{currentSequence.name}</h3>
                                    <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
                                        <Button size="sm" onClick={openAddStep} className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white dark:border-zinc-700 shadow-sm">
                                            <Plus className="w-3 h-3 mr-2" />{t("marketing.campaign_builder.add_step")}
                                        </Button>
                                        <DialogContent className="dark:bg-zinc-900 dark:border-zinc-800">
                                            <DialogHeader><DialogTitle className="dark:text-white">{t("marketing.campaign_builder.add_step_title")}</DialogTitle></DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <Label className="dark:text-gray-200">{t("marketing.campaign_builder.action_type")}</Label>
                                                <Select value={stepForm.type} onValueChange={(v) => setStepForm({ ...stepForm, type: v })}>
                                                    <SelectTrigger className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700">
                                                        <SelectItem value="whatsapp">{t("marketing.campaign_builder.whatsapp_msg")}</SelectItem>
                                                        <SelectItem value="email">{t("marketing.campaign_builder.email_msg")}</SelectItem>
                                                        <SelectItem value="delay">{t("marketing.campaign_builder.delay_action")}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Label className="dark:text-gray-200">{t("marketing.campaign_builder.internal_name")}</Label>
                                                <Input value={stepForm.name} onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })} className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" placeholder={t("marketing.campaign_builder.name_placeholder")} />
                                                <Label className="dark:text-gray-200">{t("marketing.campaign_builder.configuration")}</Label>
                                                {stepForm.type === 'delay' ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input type="number" value={stepForm.delay} onChange={(e) => setStepForm({ ...stepForm, delay: e.target.value })} className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
                                                        <span className="text-sm text-muted-foreground">{t("marketing.campaign_builder.days")}</span>
                                                    </div>
                                                ) : (
                                                    <Textarea value={stepForm.content} onChange={(e) => setStepForm({ ...stepForm, content: e.target.value })} className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" placeholder={t("marketing.campaign_builder.message_placeholder")} />
                                                )}
                                                <Button onClick={handleSaveStep} className="w-full bg-brand-pink hover:bg-brand-pink/90 text-white">{editingStepId ? t("common.save") : t("marketing.campaign_builder.add_to_funnel")}</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <ScrollArea className="flex-1 p-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-none">
                                    <div className="max-w-4xl space-y-8 pb-20 relative">
                                        {/* Main Vertical Timeline Connector */}
                                        <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-300 dark:bg-zinc-700 -z-10" />
                                        
                                        {/* Start Node */}
                                        <div className="flex gap-6 relative">
                                            <div className="w-16 flex justify-center">
                                                <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-green-500 dark:bg-green-900/40 flex items-center justify-center shadow-md">
                                                    <Play className="w-3 h-3 text-green-600 dark:text-green-400" />
                                                </div>
                                            </div>
                                            <div className="pt-1">
                                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t("marketing.campaign_builder.funnel_start")}</h4>
                                                <p className="text-xs text-muted-foreground mt-1">{t("marketing.campaign_builder.funnel_start_desc")}</p>
                                            </div>
                                        </div>
                                        
                                        {currentSequence.steps?.map((step, idx) => (
                                            <div key={step.id} className="flex gap-6 relative group">
                                                {/* Step Icon */}
                                                <div className="w-16 flex justify-center">
                                                    <div 
                                                        className={cn(
                                                            "w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-md flex items-center justify-center z-10 group-hover:scale-110 transition-transform cursor-pointer",
                                                            step.type === 'delay' && "rounded-full"
                                                        )} 
                                                        onClick={() => openEditStep(step)}
                                                    >
                                                        {step.type === 'email' ? <Mail className="w-5 h-5 text-purple-500" /> : 
                                                         step.type === 'whatsapp' ? <MessageSquare className="w-5 h-5 text-green-500" /> : 
                                                         <Clock className="w-5 h-5 text-amber-500" />}
                                                    </div>
                                                </div>
                                                
                                                {/* Step Card */}
                                                <Card 
                                                    className={cn(
                                                        "flex-1 p-5 bg-white dark:bg-zinc-900/90 border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all relative cursor-pointer group-hover:border-brand-pink/50",
                                                        step.type === 'delay' && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50 border-dashed"
                                                    )} 
                                                    onClick={() => openEditStep(step)}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Badge variant="outline" className={cn("text-[10px] h-5 uppercase dark:border-zinc-700", step.type === 'delay' ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" : "")}>
                                                                    {step.type === 'whatsapp' ? 'WhatsApp' : step.type}
                                                                </Badge>
                                                            </div>
                                                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-base">{step.name}</h4>
                                                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                                {step.type === 'delay' ? `${t("marketing.campaign_builder.wait")} ${step.delay_config?.value || '1'} ${t("marketing.campaign_builder.days")}` : (typeof step.content === 'string' ? step.content : step.content?.body)}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditStep(step)}>
                                                                <Edit2 className="w-4 h-4 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteStep(step.id)}>
                                                                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
                                                            </Button>
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
                            <Card className="p-6 h-full flex flex-col glass-card">
                                <div className="flex justify-between items-center mb-6 shrink-0">
                                    <div>
                                        <h3 className="text-xl font-bold dark:text-gray-100">{t("marketing.campaign_builder.my_audiences")}</h3>
                                        <p className="text-sm text-muted-foreground">{t("marketing.campaign_builder.manage_segments")}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setIsImportOpen(true)} className="dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700"><Upload className="w-4 h-4 mr-2" /> {t("marketing.campaign_builder.import_csv")}</Button>
                                        <Button onClick={() => setIsCreateAudienceOpen(true)} className="bg-brand-pink text-white hover:bg-brand-pink/90"><Plus className="w-4 h-4 mr-2" /> {t("marketing.campaign_builder.new_audience")}</Button>
                                    </div>
                                </div>
                                <ScrollArea className="flex-1 -mr-4 pr-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                                        {audiences.map(aud => (
                                            <Card key={aud.id} className="p-4 relative group hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-blue-500 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-white/20 dark:border-zinc-800/50">
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => handleDeleteAudience(aud.id)}><Trash2 className="w-4 h-4" /></Button>
                                                </div>
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0"><Users className="w-5 h-5" /></div>
                                                    <div className="overflow-hidden">
                                                        <h4 className="font-semibold truncate dark:text-gray-100" title={aud.name}>{aud.name}</h4>
                                                        <Badge variant="secondary" className="text-xs mt-1 dark:bg-zinc-800 dark:text-gray-300">{aud.cached_count} contactos</Badge>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-zinc-950/50 p-2 rounded line-clamp-2 border dark:border-zinc-800 h-10">
                                                    {aud.filter_config?.status ? `${t("marketing.campaign_builder.status")} ${aud.filter_config.status}` : t("marketing.campaign_builder.all_statuses")}
                                                    {aud.filter_config?.has_phone && `, ${t("marketing.campaign_builder.only_whatsapp") || "Solo WhatsApp"}`}
                                                </div>
                                            </Card>
                                        ))}
                                        {audiences.length === 0 && (
                                            <div className="col-span-full py-12 text-center text-muted-foreground bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-dashed dark:border-zinc-800">
                                                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                                <p>{t("marketing.campaign_builder.no_audiences")}</p>
                                                <Button variant="link" onClick={() => setIsCreateAudienceOpen(true)}>{t("marketing.campaign_builder.create_first")}</Button>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </Card>
                        </div>
                    </div>

                    <Dialog open={isCreateAudienceOpen} onOpenChange={setIsCreateAudienceOpen}>
                        <DialogContent className="max-w-2xl dark:bg-zinc-900 dark:border-zinc-800">
                            <DialogHeader>
                                <DialogTitle className="dark:text-white">{t("marketing.campaign_builder.create_smart_audience")}</DialogTitle>
                                <DialogDescription className="dark:text-gray-400">
                                    {t("marketing.campaign_builder.create_smart_audience_desc")}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <div className="grid gap-2">
                                    <Label className="dark:text-gray-200">{t("marketing.campaign_builder.segment_name")}</Label>
                                    <Input value={audienceName} onChange={e => setAudienceName(e.target.value)} placeholder={t("marketing.campaign_builder.segment_placeholder")} className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" />
                                </div>

                                <div className="border rounded-lg p-4 space-y-4 bg-slate-50 dark:bg-zinc-950/50 dark:border-zinc-800">
                                    <h4 className="font-medium text-sm flex items-center gap-2 text-blue-800 dark:text-blue-400"><Filter className="w-4 h-4" /> {t("marketing.campaign_builder.filter_config")}</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="dark:text-gray-200">{t("marketing.campaign_builder.client_status")}</Label>
                                            <Select value={audienceFilters.status} onValueChange={(v) => setAudienceFilters({ ...audienceFilters, status: v })}>
                                                <SelectTrigger className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"><SelectValue placeholder={t("marketing.campaign_builder.any")} /></SelectTrigger>
                                                <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700">
                                                    <SelectItem value="new">{t("marketing.campaign_builder.status_new")}</SelectItem>
                                                    <SelectItem value="contacted">{t("marketing.campaign_builder.status_contacted")}</SelectItem>
                                                    <SelectItem value="qualified">{t("marketing.campaign_builder.status_qualified")}</SelectItem>
                                                    <SelectItem value="closed">{t("marketing.campaign_builder.status_closed")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 flex flex-col justify-end">
                                            <div className="flex items-center gap-3 border dark:border-zinc-700 p-3 rounded-md bg-white dark:bg-zinc-800 shadow-sm">
                                                <Switch checked={audienceFilters.has_phone} onCheckedChange={(c) => setAudienceFilters({ ...audienceFilters, has_phone: c })} />
                                                <Label className="cursor-pointer dark:text-gray-200" onClick={() => setAudienceFilters({ ...audienceFilters, has_phone: !audienceFilters.has_phone })}>{t("marketing.campaign_builder.only_valid_whatsapp")}</Label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-blue-900/50">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-white dark:bg-zinc-800 p-2 rounded-full shadow-sm"><Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                                        <div className="flex flex-col">
                                            <div className="flex items-baseline gap-1">
                                                <span className="font-bold text-xl">{audiencePreviewCount !== null ? audiencePreviewCount : '-'}</span>
                                                <span className="text-sm opacity-80">{t("marketing.campaign_builder.contacts_match")}</span>
                                            </div>
                                            {audiencePreviewCount === null && <span className="text-xs text-blue-600/70 dark:text-blue-400/70">{t("marketing.campaign_builder.calculating")}</span>}
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={handlePreviewAudience} className="bg-white hover:bg-blue-50 text-blue-700 border-blue-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-blue-400"><RefreshCw className="w-4 h-4 mr-2" /> {t("marketing.campaign_builder.recalculate")}</Button>
                                </div>

                                <Button onClick={handleCreateAudience} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20">{t("marketing.campaign_builder.save_audience")}</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Placeholder for CSV Import Dialog - To be implemented next step if verified */}
                    <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                        <DialogContent className="dark:bg-zinc-900 dark:border-zinc-800">
                            <DialogHeader><DialogTitle className="dark:text-white">{t("marketing.campaign_builder.import_contacts")}</DialogTitle></DialogHeader>
                            <div className="py-8 flex flex-col items-center justify-center text-center border-2 border-dashed dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-950/50 relative group hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                                <FileSpreadsheet className="w-12 h-12 text-green-500 mb-4 group-hover:scale-110 transition-transform" />
                                <p className="font-medium text-lg dark:text-gray-100">{t("marketing.campaign_builder.drag_file")}</p>
                                <p className="text-sm text-muted-foreground mb-4">{t("marketing.campaign_builder.csv_format")}</p>
                                <Label htmlFor="csv-upload" className="cursor-pointer">
                                    <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-md px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-sm font-medium dark:text-white">{t("marketing.campaign_builder.select_file")}</div>
                                    <Input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                                </Label>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-xs text-yellow-800 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900/50 flex gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {t("marketing.campaign_builder.import_warning")}
                            </div>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                {/* --- SETTINGS TAB (Smart Guard) --- */}
                <TabsContent value="settings" className="flex-1 mt-0 overflow-hidden">
                    <Card className="h-full flex flex-col overflow-hidden glass-card">
                        <div className="p-6 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold dark:text-gray-100">{t("marketing.campaign_builder.settings_title")}</h3>
                                <p className="text-sm text-muted-foreground">{t("marketing.campaign_builder.settings_desc")}</p>
                            </div>
                            <Button onClick={handleSaveConfig} className="bg-brand-pink text-white hover:bg-brand-pink/90 shadow-sm">{t("common.save")}</Button>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="flex flex-col gap-8 p-6 pb-16 max-w-[1400px]">
                                {/* Top Section: Basic & Advanced Settings in 2 columns */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Audience Selector */}
                                <Card className="p-5 bg-blue-50/40 dark:bg-blue-950/20 backdrop-blur-md border-2 border-blue-200/50 dark:border-blue-900/30 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <div>
                                            <h4 className="font-bold text-base dark:text-gray-100">{t("marketing.campaign_builder.audience_title")}</h4>
                                            <p className="text-xs text-muted-foreground">{t("marketing.campaign_builder.audience_desc")}</p>
                                        </div>
                                    </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-sm dark:text-gray-200">{t("marketing.campaign_builder.audience_tab")}</Label>
                                                <Select value={selectedAudienceId || ''} onValueChange={handleLinkAudience}>
                                                    <SelectTrigger className="bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white h-9">
                                                        <SelectValue placeholder="Seleccionar audiencia..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700">
                                                        {audiences.map(aud => (
                                                            <SelectItem key={aud.id} value={aud.id} className="dark:text-gray-200 dark:focus:bg-zinc-700">
                                                                {aud.name} ({aud.cached_count} contactos)
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-sm dark:text-gray-200">{t("marketing.campaign_builder.schedule")}</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={scheduledFor}
                                                    onChange={(e) => setScheduledFor(e.target.value)}
                                                    className="bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:[color-scheme:dark] h-9"
                                                />
                                                <p className="text-[11px] text-muted-foreground">Deja vacío para iniciar inmediatamente al activar</p>
                                            </div>
                                        </div>
                                        {selectedAudienceId && (
                                            <div className="mt-4 p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-300 text-xs flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                                                Audiencia vinculada. Los leads se inscribirán al activar.
                                            </div>
                                        )}
                                    </Card>

                                    <Card className="p-5 space-y-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-white/20 dark:border-zinc-800/50 shadow-sm rounded-xl">
                                        <h4 className="font-semibold flex items-center gap-2 text-sm dark:text-gray-200"><Settings className="w-4 h-4" /> {t("marketing.campaign_builder.advanced_config")}</h4>
                                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg border dark:border-zinc-800">
                                            <div>
                                                <Label className="text-sm font-semibold dark:text-gray-200">{t("marketing.campaign_builder.humanize")}</Label>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">{t("marketing.campaign_builder.humanize_desc")}</p>
                                            </div>
                                            <Switch checked={deliveryConfig.humanize} onCheckedChange={(v) => setDeliveryConfig({ ...deliveryConfig, humanize: v })} />
                                        </div>

                                        <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg border dark:border-zinc-800">
                                            <div>
                                                <Label className="text-sm font-semibold dark:text-gray-200">{t("marketing.campaign_builder.schedule_window")}</Label>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">{t("marketing.campaign_builder.schedule_window_desc")}</p>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">De</span>
                                                    <Select value={String(deliveryConfig.schedule_window.start)} onValueChange={(v) => setDeliveryConfig({ ...deliveryConfig, schedule_window: { ...deliveryConfig.schedule_window, start: Number(v) } })}>
                                                        <SelectTrigger className="w-[80px] h-8 text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-white">
                                                            {[...Array(24)].map((_, i) => <SelectItem key={i} value={String(i)} className="text-xs dark:focus:bg-zinc-700">{String(i).padStart(2, '0')}:00</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">a</span>
                                                    <Select value={String(deliveryConfig.schedule_window.end)} onValueChange={(v) => setDeliveryConfig({ ...deliveryConfig, schedule_window: { ...deliveryConfig.schedule_window, end: Number(v) } })}>
                                                        <SelectTrigger className="w-[80px] h-8 text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-white">
                                                            {[...Array(24)].map((_, i) => <SelectItem key={i} value={String(i)} className="text-xs dark:focus:bg-zinc-700">{String(i).padStart(2, '0')}:00</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg border dark:border-zinc-800 opacity-70">
                                            <div>
                                                <Label className="text-sm font-semibold dark:text-gray-200">{t("marketing.campaign_builder.circuit_breaker")}</Label>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">{t("marketing.campaign_builder.circuit_breaker_desc")}</p>
                                            </div>
                                            <Clock className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </Card>
                                </div>

                                {/* Bottom Section: Smart Guard Horizontally */}
                                <div className="mt-2">
                                    <div className="flex items-center gap-3 mb-5">
                                        <Shield className="w-8 h-8 text-brand-pink" />
                                        <div>
                                            <h3 className="text-xl font-bold dark:text-gray-100">{t("marketing.campaign_builder.smart_guard")}</h3>
                                            <p className="text-sm text-muted-foreground">{t("marketing.campaign_builder.smart_guard_desc")}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className={cn("p-5 cursor-pointer transition-all flex flex-col gap-3 glass-card border border-white/20 dark:border-zinc-800/50", deliveryConfig.mode === 'stealth' ? "ring-2 ring-green-500 bg-green-50/40 dark:bg-green-900/20" : "hover:ring-2 hover:ring-green-400/50")} onClick={() => setDeliveryConfig({ ...deliveryConfig, mode: 'stealth' })}>
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-lg"><Shield className="w-6 h-6 text-green-700 dark:text-green-400" /></div>
                                                <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-none text-[10px] h-5">{t("marketing.campaign_builder.recommended")}</Badge>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg dark:text-gray-100 mb-1">{t("marketing.campaign_builder.stealth_mode")}</h4>
                                                <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">{t("marketing.campaign_builder.stealth_desc")}</p>
                                            </div>
                                        </div>
                                        
                                        <div className={cn("p-5 cursor-pointer transition-all flex flex-col gap-3 glass-card border border-white/20 dark:border-zinc-800/50", deliveryConfig.mode === 'growth' ? "ring-2 ring-blue-500 bg-blue-50/40 dark:bg-blue-900/20" : "hover:ring-2 hover:ring-blue-400/50")} onClick={() => setDeliveryConfig({ ...deliveryConfig, mode: 'growth' })}>
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg"><Users className="w-6 h-6 text-blue-700 dark:text-blue-400" /></div>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg mb-1 dark:text-gray-100">{t("marketing.campaign_builder.growth")}</h4>
                                                <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">{t("marketing.campaign_builder.growth_desc")}</p>
                                            </div>
                                        </div>
                                        
                                        <div className={cn("p-5 cursor-pointer transition-all flex flex-col gap-3 glass-card border border-white/20 dark:border-zinc-800/50", deliveryConfig.mode === 'turbo' ? "ring-2 ring-red-500 bg-red-50/40 dark:bg-red-900/20" : "hover:ring-2 hover:ring-red-400/50")} onClick={() => setDeliveryConfig({ ...deliveryConfig, mode: 'turbo' })}>
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-lg"><Zap className="w-6 h-6 text-red-700 dark:text-red-400" /></div>
                                                <Badge variant="destructive" className="dark:bg-red-900/80 text-[10px] h-5">{t("marketing.campaign_builder.high_risk")}</Badge>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg dark:text-gray-100 mb-1">{t("marketing.campaign_builder.turbo")}</h4>
                                                <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">{t("marketing.campaign_builder.turbo_desc")}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </Card>
                </TabsContent>

                {/* --- RESULTS TAB (Insights) --- */}
                <TabsContent value="results" className="flex-1 mt-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">

                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-pink/10 rounded-xl"><Activity className="w-8 h-8 text-brand-pink" /></div>
                                <div>
                                    <h3 className="text-2xl font-bold">{t("marketing.campaign_builder.results_title")}</h3>
                                    <p className="text-muted-foreground">{t("marketing.campaign_builder.results_desc")}</p>
                                </div>
                            </div>

                            {/* KPI Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card className="p-5 border-t-4 border-t-blue-500 border-x-0 border-b-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-sm rounded-xl">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{t("marketing.campaign_builder.enrolled")}</p>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.stats?.total || 0}</p>
                                </Card>
                                <Card className="p-5 border-t-4 border-t-yellow-500 border-x-0 border-b-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-sm rounded-xl">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{t("marketing.campaign_builder.in_progress")}</p>
                                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats?.stats?.active || 0}</p>
                                </Card>
                                <Card className="p-5 border-t-4 border-t-green-500 border-x-0 border-b-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-sm rounded-xl">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{t("marketing.campaign_builder.completed")}</p>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.stats?.completed || 0}</p>
                                </Card>
                                <Card className="p-5 border-t-4 border-t-red-500 border-x-0 border-b-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md shadow-sm rounded-xl">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{t("marketing.campaign_builder.failed")}</p>
                                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats?.stats?.failed || 0}</p>
                                </Card>
                            </div>

                            {/* Recent Activity */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <Card className="lg:col-span-2 p-0 overflow-hidden glass-card">
                                    <div className="p-4 border-b bg-slate-50 dark:bg-zinc-800/50 flex justify-between items-center">
                                        <h4 className="font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /> {t("marketing.campaign_builder.recent_activity")}</h4>
                                        <Button variant="ghost" size="sm" onClick={() => loadData()} className="text-xs h-7">{t("marketing.campaign_builder.refresh")}</Button>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {!stats?.recentActivity?.length ? (
                                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                                                <Activity className="w-12 h-12 text-gray-200 mb-2" />
                                                <p>{t("marketing.campaign_builder.no_activity")}</p>
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
                                                            <p className="text-sm font-semibold truncate">{log.lead?.phone || t("marketing.campaign_builder.unknown")} <span className="text-muted-foreground font-normal">({log.lead?.name || 'Lead'})</span></p>
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.last_updated).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                                            {log.last_log?.action === 'message_sent' ? t("marketing.campaign_builder.msg_sent") :
                                                                log.last_log?.error ? `${t("marketing.campaign_builder.error")} ${log.last_log.error}` :
                                                                    `${t("marketing.campaign_builder.status_updated")} ${log.status}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>

                                <Card className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
                                    <h4 className="font-bold mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-blue-500" /> {t("marketing.campaign_builder.engine_status")}</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">{t("marketing.campaign_builder.speed")}</span>
                                            <Badge variant="outline" className="bg-white">{deliveryConfig.mode.toUpperCase()}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">{t("marketing.campaign_builder.humanization")}</span>
                                            <span className={cn("text-xs font-medium", deliveryConfig.humanize ? "text-green-600" : "text-gray-500")}>
                                                {deliveryConfig.humanize ? t("marketing.campaign_builder.activated") : t("marketing.campaign_builder.deactivated")}
                                            </span>
                                        </div>
                                        <div className="pt-4 border-t border-blue-200/50">
                                            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                                {t("marketing.campaign_builder.engine_desc")}
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

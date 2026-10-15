'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCheck, ChevronDown, Layers, Mail, Megaphone, Plus, Send, Smartphone, TrendingUp } from 'lucide-react'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CampaignsList } from './campaigns-list'
import { useMarketingApi, useMarketingExample } from '../marketing-client-api'
import type { MarketingChannel } from '../marketing-preflight-actions'
import type { getMarketingStats } from '../marketing-actions'

const CampaignWorkspaceSheet = dynamic(() => import('./campaign-workspace-sheet').then(module => module.CampaignWorkspaceSheet))
type SelectedCampaign = { id: string; name: string; initialChannel?: 'whatsapp' | 'email' }

export function MarketingDashboard(props: { initialCampaign?: SelectedCampaign } = {}) {
    return <MarketingDashboardContent key={props.initialCampaign?.id ?? 'campaign-list'} {...props} />
}

function MarketingDashboardContent({ initialCampaign }: { initialCampaign?: SelectedCampaign }) {
    const api = useMarketingApi()
    const example = useMarketingExample()
    const router = useRouter()
    const [selected, setSelected] = useState<SelectedCampaign | null>(initialCampaign || null)
    const [channels, setChannels] = useState<MarketingChannel[]>([])
    const [setup, setSetup] = useState({ loaded: false, canManage: false, canExecute: false, canImport: false, executionEnabled: false })
    const [stats, setStats] = useState<Awaited<ReturnType<typeof getMarketingStats>> | null>(null)
    const [error, setError] = useState('')
    const [revision, setRevision] = useState(0)
    useEffect(() => {
        let active = true
        void Promise.all([api.getMarketingStats(), api.getMarketingSetup(), api.getMarketingEmailSenders()]).then(([counts, config, smtp]) => {
            if (!active) return
            setError([('error' in counts ? counts.error : ''), !config.success ? config.error : '', !smtp.success ? smtp.error : ''].filter(Boolean).join(' '))
            setStats('error' in counts ? null : counts)
            setChannels([...(config.success ? config.channels : []), ...(smtp.success ? smtp.channels : [])])
            setSetup({ loaded: true, canManage: config.success && config.canManage, canExecute: config.success && config.canExecute, canImport: config.success && config.canImport, executionEnabled: config.success && config.executionEnabled === true })
        }).catch(() => { if (active) { setStats(null); setError('No se pudieron cargar los canales y el resumen. Reintenta para comprobar su estado.'); setSetup(previous => ({ ...previous, loaded: true })) } })
        return () => { active = false }
    }, [revision, api])
    const refresh = useCallback(() => setRevision(value => value + 1), [])
    const openCampaign = useCallback((id: string, name: string) => setSelected({ id, name }), [])
    const closeCampaign = useCallback((mutated = false) => {
        setSelected(null)
        if (mutated) refresh()
        if (initialCampaign && !example) router.replace('/crm/marketing', { scroll: false })
    }, [initialCampaign, example, router, refresh])
    const whatsappCount = channels.filter(channel => !channel.id.startsWith('smtp:')).length
    const emailCount = channels.length - whatsappCount
    const rate = stats?.deliveryRate
    const cards = [
        { label: 'Campañas', value: stats?.totalCampaigns ?? '—', detail: 'Todos los estados', icon: Layers, color: 'text-blue-600 bg-blue-500/10' },
        { label: 'Mensajes aceptados', value: stats?.totalMessages ?? '—', detail: stats ? `${stats.whatsappAccepted} WhatsApp · ${stats.emailAccepted} email` : 'WhatsApp y email', icon: Send, color: 'text-violet-600 bg-violet-500/10' },
        { label: 'Entregados por WhatsApp', value: stats?.totalDelivered ?? '—', detail: 'Incluye mensajes leídos', icon: CheckCheck, color: 'text-emerald-600 bg-emerald-500/10' },
        { label: 'Entrega de WhatsApp', value: rate == null ? '—' : `${rate}%`, detail: rate == null ? 'Sin aceptaciones de WhatsApp' : 'Sobre aceptados por Meta', icon: TrendingUp, color: 'text-teal-600 bg-teal-500/10' },
    ]
    return <div className="space-y-5 pb-8">
        <SectionHeader title="Campañas masivas" subtitle="Prepara tus mensajes, elige a quién enviar y sigue cada campaña." icon={Megaphone} action={<DropdownMenu>
            <DropdownMenuTrigger asChild><Button disabled={!setup.loaded || !setup.canManage} className="gap-2 rounded-xl"><Plus className="h-4 w-4" />Crear campaña<ChevronDown className="h-3.5 w-3.5 opacity-60" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2 shadow-xl">
                <DropdownMenuItem onSelect={() => setSelected({ id: '', name: '', initialChannel: 'whatsapp' })} className="cursor-pointer items-start gap-3 rounded-xl p-3"><span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600"><Smartphone className="h-4 w-4" /></span><span><span className="block text-sm font-semibold">Campaña de WhatsApp</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Plantilla aprobada, personalización y seguimiento.</span><span className="mt-1.5 block text-[11px] text-muted-foreground">{whatsappCount ? `${whatsappCount} ${whatsappCount === 1 ? 'emisor disponible' : 'emisores disponibles'}` : 'Necesitas conectar un número'}</span></span></DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSelected({ id: '', name: '', initialChannel: 'email' })} className="cursor-pointer items-start gap-3 rounded-xl p-3"><span className="rounded-xl bg-violet-500/10 p-2.5 text-violet-600"><Mail className="h-4 w-4" /></span><span><span className="block text-sm font-semibold">Campaña de email</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Asunto, mensaje y baja automática, desde tu SMTP.</span><span className="mt-1.5 block text-[11px] text-muted-foreground">{emailCount ? `${emailCount} SMTP verificado` : 'Necesitas verificar un SMTP'}</span></span></DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>} />
        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm"><p>{error}</p><Button size="sm" variant="outline" onClick={refresh}>Reintentar carga</Button></div>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(card => <div key={card.label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs"><span className={`mb-3 inline-flex rounded-xl p-2.5 ${card.color}`}><card.icon className="h-4 w-4" /></span><p className="text-2xl font-semibold tabular-nums tracking-tight">{card.value}</p><p className="mt-1 text-xs font-medium">{card.label}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{card.detail}</p></div>)}</div>
        {setup.loaded && !error && (!whatsappCount || !emailCount) && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3"><p className="max-w-xl text-xs leading-relaxed text-muted-foreground">{!whatsappCount && !emailCount ? 'Conecta un emisor para preparar tu primera campaña.' : !whatsappCount ? 'También puedes enviar por WhatsApp al conectar un número.' : 'También puedes enviar emails al verificar el SMTP de tu organización.'}</p><div className="flex flex-wrap gap-3 text-xs font-medium">{!whatsappCount && <Link href="/crm/settings/channels" className="inline-flex items-center gap-1 text-primary">Conectar WhatsApp<ArrowRight className="h-3 w-3" /></Link>}{!emailCount && <Link href="/tools/email-engine" className="inline-flex items-center gap-1 text-primary">Configurar correo<ArrowRight className="h-3 w-3" /></Link>}</div></div>}
        <p className="text-[11px] text-muted-foreground">Email muestra aceptación SMTP. La entrega y lectura solo se confirman para WhatsApp.</p>
        <CampaignsList refresh={revision} channels={channels} canManage={setup.canManage} canExecute={setup.canExecute} onChanged={refresh} onOpen={openCampaign} suspended={!!selected} />
        {process.env.NODE_ENV === 'development' && !example && <Link href="/crm/marketing/examples" className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4">Explorar ejemplos de los flujos<ArrowRight className="h-3 w-3" /></Link>}
        {selected && <CampaignWorkspaceSheet key={selected.id || `new-${selected.initialChannel || 'whatsapp'}`} campaign={selected} channels={setup.loaded ? channels : undefined} canManage={setup.canManage} canExecute={setup.canExecute} canImport={setup.loaded ? setup.canImport : undefined} executionEnabled={setup.loaded ? setup.executionEnabled : undefined} onClose={closeCampaign} />}
    </div>
}

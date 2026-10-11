'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Plus, Megaphone, Mail, MessageSquare, Smartphone, CheckCheck, Send, Layers } from 'lucide-react'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { CampaignsList } from './campaigns-list'
import { getMarketingStats } from '../marketing-actions'
import { getMarketingEmailSenders } from '../marketing-email-actions'
import { getMarketingSetup, MarketingChannel } from '../marketing-preflight-actions'

const CreateCampaignDialog = dynamic(() => import('./create-campaign-dialog').then(module => module.CreateCampaignDialog))
const CampaignWorkspaceSheet = dynamic(() => import('./campaign-workspace-sheet').then(module => module.CampaignWorkspaceSheet))
type SelectedCampaign = { id: string; name: string }

export function MarketingDashboard({ initialCampaign }: { initialCampaign?: SelectedCampaign } = {}) {
    const router = useRouter()
    const [selected, setSelected] = useState<SelectedCampaign | null>(initialCampaign || null)
    const [createOpen, setCreateOpen] = useState(false), [channels, setChannels] = useState<MarketingChannel[]>([])
    const [canManage, setCanManage] = useState(false), [canExecute, setCanExecute] = useState(false)
    const [stats, setStats] = useState<Awaited<ReturnType<typeof getMarketingStats>> | null>(null)
    const [error, setError] = useState(''), [revision, setRevision] = useState(0)
    useEffect(() => { setSelected(initialCampaign || null) }, [initialCampaign?.id])
    useEffect(() => {
        let current = true
        void Promise.all([getMarketingStats(), getMarketingSetup(), getMarketingEmailSenders()]).then(([counts, setup, smtp]) => {
            if (!current) return
            setError(('error' in counts ? counts.error : !setup.success ? setup.error : '') || '')
            setStats('error' in counts ? null : counts)
            if (setup.success) { setChannels([...setup.channels, ...(smtp.success ? smtp.channels : [])]); setCanManage(setup.canManage); setCanExecute(setup.canExecute) }
            else { setChannels([]); setCanManage(false); setCanExecute(false) }
        }).catch(() => { if (current) { setStats(null); setError('No se pudo cargar el resumen de Marketing.') } })
        return () => { current = false }
    }, [revision])
    function closeCampaign() {
        setSelected(null); setRevision(value => value + 1)
        if (initialCampaign) router.replace('/crm/marketing', { scroll: false })
    }
    const summary = [
        { label: 'Campañas', count: stats?.totalCampaigns, icon: Layers },
        { label: 'Mensajes aceptados', count: stats?.totalMessages, icon: Send },
        { label: 'Entregados por WhatsApp', count: stats?.totalDelivered, icon: CheckCheck },
    ]
    return <div className="space-y-5 pb-8">
        <SectionHeader title="Campañas masivas" subtitle="Tu centro de envíos: audiencias, mensajes y seguimiento." icon={Megaphone}
            action={<Button disabled={!canManage} onClick={() => setCreateOpen(true)} className="rounded-xl bg-brand-pink text-white shadow-sm hover:bg-brand-pink/90"><Plus className="mr-2 h-4 w-4" />Nueva campaña</Button>} />
        {error && <p role="alert" className="text-sm text-destructive">{error} <button className="underline" onClick={() => setRevision(v => v + 1)}>Reintentar</button></p>}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Canales</span>
                    <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"><Smartphone className="h-3.5 w-3.5" />WhatsApp</span>
                    <span className="flex items-center gap-1.5 rounded-lg border border-border/50 px-2.5 py-1 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" />Correo <span className="text-[10px]">· pendiente de integración</span></span>
                    <span className="flex items-center gap-1.5 rounded-lg border border-border/50 px-2.5 py-1 text-xs text-muted-foreground"><MessageSquare className="h-3.5 w-3.5" />SMS <span className="text-[10px]">· pendiente de integración</span></span>
                </div>
                <span className="text-[11px] text-muted-foreground">Revisión antes de cada activación</span>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-border/50">
                {summary.map(item => <div key={item.label} className="flex items-center gap-3 px-4 py-4 sm:px-5">
                    <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-primary/5 text-primary sm:flex"><item.icon className="h-4 w-4" /></div>
                    <div><dt className="text-[11px] text-muted-foreground">{item.label}</dt><dd className="mt-1 text-xl font-semibold tracking-tight">{item.count ?? '—'}</dd></div>
                </div>)}
            </dl>
        </div>
        <CampaignsList refresh={revision} channels={channels} canManage={canManage} canExecute={canExecute} onChanged={() => setRevision(v => v + 1)} onOpen={(id, name) => setSelected({ id, name })} suspended={!!selected} />
        {createOpen && <CreateCampaignDialog onClose={() => setCreateOpen(false)} onCreated={id => { setCreateOpen(false); setSelected({ id, name: 'Nueva campaña' }); setRevision(v => v + 1) }} />}
        {selected && <CampaignWorkspaceSheet key={selected.id} campaign={selected} onClose={closeCampaign} />}
    </div>
}

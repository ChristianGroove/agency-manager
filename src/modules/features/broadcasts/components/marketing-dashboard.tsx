'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Plus, Megaphone } from 'lucide-react'
import { SectionHeader } from '@/components/layout/section-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CampaignsList } from './campaigns-list'
import { getMarketingStats } from '../marketing-actions'
import { getMarketingSetup, MarketingChannel } from '../marketing-preflight-actions'
const CreateCampaignDialog = dynamic(() => import('./create-campaign-dialog').then(module => module.CreateCampaignDialog))
export function MarketingDashboard() {
    const router = useRouter()
    const [createOpen, setCreateOpen] = useState(false), [channels, setChannels] = useState<MarketingChannel[]>([])
    const [canManage, setCanManage] = useState(false), [canExecute, setCanExecute] = useState(false)
    const [stats, setStats] = useState<Awaited<ReturnType<typeof getMarketingStats>> | null>(null)
    const [error, setError] = useState(''), [revision, setRevision] = useState(0)
    useEffect(() => {
        let current = true
        void Promise.all([getMarketingStats(), getMarketingSetup()]).then(([counts, setup]) => {
            if (!current) return
            setError(('error' in counts ? counts.error : !setup.success ? setup.error : '') || '')
            setStats('error' in counts ? null : counts)
            if (setup.success) { setChannels(setup.channels); setCanManage(setup.canManage); setCanExecute(setup.canExecute) }
            else { setChannels([]); setCanManage(false); setCanExecute(false) }
        }).catch(() => { if (current) { setStats(null); setError('No se pudo cargar el resumen de Marketing.') } })
        return () => { current = false }
    }, [revision])
    return <div className="space-y-5 pb-8">
        <SectionHeader title="Campañas WhatsApp" subtitle="Prepara mensajes, elige destinatarios y consulta resultados." icon={Megaphone} action={<Button disabled={!canManage} onClick={() => setCreateOpen(true)} className="bg-brand-pink text-white hover:bg-brand-pink/90"><Plus className="w-4 h-4 mr-2" />Nueva campaña</Button>} />
        {error && <p role="alert" className="text-sm text-red-600">{error} <button className="underline" onClick={() => setRevision(v => v + 1)}>Reintentar</button></p>}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Campañas', stats?.totalCampaigns], ['Mensajes aceptados por Meta', stats?.totalMessages], ['Mensajes entregados · incluye leídos', stats?.totalDelivered], ['Tasa de entrega sobre aceptados', stats ? `${stats.deliveryRate}%` : undefined]].map(([label, count]) => <Card key={label} className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-1">{count ?? '—'}</p></Card>)}</div>
        <p className="text-sm text-muted-foreground">Crear o guardar un borrador no envía mensajes. Cada campaña requiere revisión final; sus resultados e historial están en el detalle.</p>
        <CampaignsList channels={channels} canManage={canManage} canExecute={canExecute} onChanged={() => setRevision(v => v + 1)} />
        {createOpen && <CreateCampaignDialog onClose={() => setCreateOpen(false)} onCreated={id => { setCreateOpen(false); router.push(`/crm/marketing/campaigns/${id}`) }} />}
    </div>
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FlaskConical, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MarketingExampleProvider } from '../marketing-client-api'
import { createMarketingExample, marketingScenarios, type MarketingScenario } from '../marketing-examples'
import { MarketingDashboard } from './marketing-dashboard'

function Example({ scenario }: { scenario: MarketingScenario }) {
    const [example] = useState(() => createMarketingExample(scenario))
    return <MarketingExampleProvider api={example.api}><MarketingDashboard initialCampaign={example.initialCampaign} /></MarketingExampleProvider>
}

export function MarketingExamples() {
    const [scenario, setScenario] = useState<MarketingScenario>('ready-whatsapp')
    const [revision, setRevision] = useState(0)
    const current = marketingScenarios.find(item => item.id === scenario)!
    return <div className="space-y-6">
        <div className="space-y-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold"><FlaskConical className="h-4 w-4 text-sky-600" />Laboratorio de campañas · solo desarrollo</div><Link href="/crm/marketing" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3 w-3" />Volver a campañas reales</Link></div>
            <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">Revisa los mismos modales de la aplicación con contactos ficticios. Puedes editar, importar un CSV de ejemplo, revisar, simular la activación y pausar. Los cambios viven solo en esta página y se reinician al cambiar de caso.</p>
            <div className="flex flex-wrap items-center gap-3"><Select value={scenario} onValueChange={value => setScenario(value as MarketingScenario)}><SelectTrigger aria-label="Caso de ejemplo" className="w-full rounded-xl bg-card sm:w-72"><SelectValue /></SelectTrigger><SelectContent>{marketingScenarios.map(item => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" onClick={() => setRevision(value => value + 1)}><RotateCcw className="mr-2 h-3.5 w-3.5" />Reiniciar y abrir</Button><p className="text-xs text-muted-foreground">{current.description}</p></div>
            <details className="text-xs"><summary className="cursor-pointer font-medium">CSV de ejemplo para probar la importación</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><pre className="overflow-x-auto rounded-xl border bg-card p-3">{'telefono,nombre,email\n+570000000001,Ana de ejemplo,ana@example.com\n+570000000002,Luis de ejemplo,luis@example.com'}</pre><pre className="overflow-x-auto rounded-xl border bg-card p-3">{'email,nombre\nana@example.com,Ana de ejemplo\nluis@example.com,Luis de ejemplo'}</pre></div></details>
        </div>
        <Example key={`${scenario}:${revision}`} scenario={scenario} />
    </div>
}

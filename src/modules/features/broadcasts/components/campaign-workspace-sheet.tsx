'use client'

import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { CampaignBuilder } from './campaign-builder'

export function CampaignWorkspaceSheet({ campaign, onClose }: {
    campaign: { id: string; name: string }; onClose: () => void;
}) {
    const [dirty, setDirty] = useState(false)
    const busy = useRef(false)
    function close() {
        if (busy.current) return
        if (dirty && !window.confirm('Hay cambios sin guardar. ¿Descartarlos y cerrar la campaña?')) return
        onClose()
    }
    return <Dialog open onOpenChange={open => { if (!open) close() }}>
        <DialogContent className="flex h-[92dvh] max-h-[980px] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl">
            <DialogHeader className="sr-only">
                <DialogTitle>{campaign.name}</DialogTitle>
                <DialogDescription>Configuración y actividad de la campaña masiva.</DialogDescription>
            </DialogHeader>
            <CampaignBuilder campaignId={campaign.id} campaignName={campaign.name} onClose={close} onDirtyChange={setDirty} onBusyChange={value => { busy.current = value }} />
        </DialogContent>
    </Dialog>
}

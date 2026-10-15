'use client'

import { useCallback, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { CampaignBuilder } from './campaign-builder'
import type { MarketingChannel } from '../marketing-preflight-actions'

export function CampaignWorkspaceSheet({ campaign, channels, canManage, canExecute, onClose, onCreated }: {
    campaign: { id: string; name: string; initialChannel?: 'whatsapp' | 'email' };
    channels?: MarketingChannel[];
    canManage?: boolean;
    canExecute?: boolean;
    onClose: (mutated?: boolean) => void;
    onCreated?: (id: string) => void;
}) {
    const [dirty, setDirty] = useState(false)
    const busy = useRef(false)
    const hasMutated = useRef(false)

    const close = useCallback(() => {
        if (busy.current) return
        if (dirty && !window.confirm('Hay cambios sin guardar. ¿Descartarlos y cerrar la campaña?')) return
        onClose(hasMutated.current)
    }, [dirty, onClose])

    const handleCreated = useCallback((id: string) => {
        hasMutated.current = true
        onCreated?.(id)
    }, [onCreated])

    const isNew = !campaign.id
    const displayName = campaign.name || (campaign.initialChannel === 'email' ? 'Nueva campaña de Email' : 'Nueva campaña de WhatsApp')

    return <Dialog open onOpenChange={open => { if (!open) close() }}>
        <DialogContent className="flex h-[92dvh] max-h-[980px] w-[95vw] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl">
            <DialogHeader className="sr-only">
                <DialogTitle>{displayName}</DialogTitle>
                <DialogDescription>Configuración y actividad de la campaña masiva.</DialogDescription>
            </DialogHeader>
            <CampaignBuilder
                campaignId={campaign.id || null}
                campaignName={campaign.name}
                initialChannel={campaign.initialChannel}
                initialChannels={channels}
                initialCanManage={canManage}
                initialCanExecute={canExecute}
                onClose={close}
                onCreated={handleCreated}
                onDirtyChange={setDirty}
                onBusyChange={value => { busy.current = value }}
                onMutated={() => { hasMutated.current = true }}
            />
        </DialogContent>
    </Dialog>
}

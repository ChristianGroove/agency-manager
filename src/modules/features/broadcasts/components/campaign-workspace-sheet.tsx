'use client'

import { useCallback, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './campaign-dialog'
import { CampaignDiscardDialog } from './campaign-discard-dialog'
import { CampaignBuilder } from './campaign-builder'
import type { MarketingChannel } from '../marketing-preflight-actions'

export function CampaignWorkspaceSheet({ campaign, channels, canManage, canExecute, canImport, executionEnabled, onClose, onCreated }: {
    campaign: { id: string; name: string; initialChannel?: 'whatsapp' | 'email' };
    channels?: MarketingChannel[];
    canManage?: boolean;
    canExecute?: boolean;
    canImport?: boolean;
    executionEnabled?: boolean;
    onClose: (mutated?: boolean) => void;
    onCreated?: (id: string) => void;
}) {
    const [dirty, setDirty] = useState(false)
    const [discardOpen, setDiscardOpen] = useState(false)
    const busy = useRef(false)
    const hasMutated = useRef(false)

    const close = useCallback(() => {
        if (busy.current) return
        if (dirty) { setDiscardOpen(true); return }
        onClose(hasMutated.current)
    }, [dirty, onClose])

    const handleCreated = useCallback((id: string) => {
        hasMutated.current = true
        onCreated?.(id)
    }, [onCreated])

    const displayName = campaign.name || (campaign.initialChannel === 'email' ? 'Nueva campaña de Email' : 'Nueva campaña de WhatsApp')

    return <><Dialog open onOpenChange={open => { if (!open) close() }}>
        <DialogContent onInteractOutside={event => event.preventDefault()} className="flex h-[92dvh] max-h-[1040px] w-[calc(100%-1rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl sm:w-[95vw] sm:p-0">
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
                initialCanImport={canImport}
                initialExecutionEnabled={executionEnabled}
                onClose={close}
                onCreated={handleCreated}
                onDirtyChange={setDirty}
                onBusyChange={value => { busy.current = value }}
                onMutated={() => { hasMutated.current = true }}
            />
        </DialogContent>
    </Dialog><CampaignDiscardDialog open={discardOpen} onCancel={() => setDiscardOpen(false)} onDiscard={() => { setDiscardOpen(false); onClose(hasMutated.current) }} /></>
}

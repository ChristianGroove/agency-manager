"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Building2, Check, MessageCircle, Smartphone } from 'lucide-react'
import { MetaEmbeddedSignup } from './meta-embedded-signup'
import { useTranslation } from '@/modules/core/i18n/use-translation'
import type { WhatsAppSignupMode } from './embedded-signup-flow'

type CurrentNumberUse = 'new' | 'cloud' | 'app'

interface WhatsAppConnectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId?: string | null
}

export function WhatsAppConnectModal({ open, onOpenChange, organizationId }: WhatsAppConnectModalProps) {
    const { t } = useTranslation()
    const [currentUse, setCurrentUse] = useState<CurrentNumberUse | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)
    const mode: WhatsAppSignupMode | null = currentUse === null ? null : currentUse === 'app' ? 'coexistence' : 'cloud'
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen && isConnecting) return
        if (!nextOpen) setCurrentUse(null)
        onOpenChange(nextOpen)
    }
    const choices = [
        { id: 'new', icon: MessageCircle, title: t('meta.connect_modal.choices.new.title'), description: t('meta.connect_modal.choices.new.description') },
        { id: 'app', icon: Smartphone, title: t('meta.connect_modal.choices.app.title'), description: t('meta.connect_modal.choices.app.description') },
        { id: 'cloud', icon: Building2, title: t('meta.connect_modal.choices.cloud.title'), description: t('meta.connect_modal.choices.cloud.description') },
    ] as const

    return <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-xl">{t('meta.connect_modal.title')}</DialogTitle>
                <DialogDescription>{t('meta.connect_modal.description')}</DialogDescription>
            </DialogHeader>
            <fieldset className="space-y-3" disabled={isConnecting}>
                <legend className="mb-3 text-sm font-medium">{t('meta.connect_modal.question')}</legend>
                {choices.map(choice => {
                    const selected = currentUse === choice.id
                    const Icon = choice.icon
                    return <label key={choice.id} className={`flex cursor-pointer gap-4 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-primary ${selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                        <input type="radio" name="whatsapp-current-use" value={choice.id} checked={selected}
                            onChange={() => setCurrentUse(choice.id)} className="sr-only"
                            aria-label={choice.title} aria-describedby={`whatsapp-choice-${choice.id}`} />
                        <span className="rounded-lg bg-background p-2 self-start border"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-medium">{choice.title}</span>
                            <span id={`whatsapp-choice-${choice.id}`} className="block text-sm text-muted-foreground mt-1">{choice.description}</span>
                        </span>
                        {selected && <Check className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />}
                    </label>
                })}
            </fieldset>
            {mode ? <>
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    {currentUse === 'app' ? t('meta.connect_modal.guidance.app') : t('meta.connect_modal.guidance.cloud')}
                </div>
                <MetaEmbeddedSignup key={mode} mode={mode} organizationId={organizationId}
                    onBusyChange={setIsConnecting}
                    onSuccess={() => { setCurrentUse(null); onOpenChange(false) }} />
            </> : <p className="text-sm text-muted-foreground">{t('meta.connect_modal.select_prompt')}</p>}
        </DialogContent>
    </Dialog>
}

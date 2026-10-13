"use client"

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { usePet } from '@/modules/core/pet/pet-provider'
import { PetHelpTrigger } from '@/modules/core/pet/pet-help-trigger'

const LazyAssistantModal = dynamic(
    () => import('@/modules/features/caa/components/assistant-modal').then(mod => mod.AssistantModal),
    { ssr: false, loading: () => null }
)

export function FabController() {
    const pet = usePet()
    const [isHelpOpen, setIsHelpOpen] = useState(false)

    return <>
        {!isHelpOpen && (pet?.enabled
            ? <PetHelpTrigger onOpenHelp={() => setIsHelpOpen(true)} />
            : <button type="button" aria-label="Abrir ayuda" onClick={() => setIsHelpOpen(true)}
                className="fixed right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </button>)}
        {isHelpOpen && <LazyAssistantModal open onOpenChange={setIsHelpOpen} />}
    </>
}

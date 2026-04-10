"use client"

import { useState, useEffect } from "react"
import { UnifiedFloatingFab } from "./unified-floating-fab"
import MetaControlSheet from "@/modules/infrastructure/meta/components/MetaControlSheet"
import { useAssistant } from "@/hooks/use-assistant"
import dynamic from "next/dynamic"

// LAZY LOAD: The massive Assistant UI (animations, chat history) won't parse in JS 
// until requested explicitly to save memory footprint.
const LazyAssistantOverlay = dynamic(
    () => import("@/components/assistant/AssistantOverlay").then(mod => mod.AssistantOverlay),
    {
        ssr: false,
        loading: () => null
    }
)

const LazyAssistantModal = dynamic(
    () => import("@\/modules\/features\/caa/components/assistant-modal").then(mod => mod.AssistantModal),
    {
        ssr: false,
        loading: () => null
    }
)

export function FabController({ orgSlug }: { orgSlug?: string }) {
    const isInternalOrg = orgSlug === 'pixy-agency'

    const [isMetaOpen, setIsMetaOpen] = useState(false)
    const [isHelpOpen, setIsHelpOpen] = useState(false)
    const [hasAttemptedAssistant, setHasAttemptedAssistant] = useState(false)

    return (
        <>
            <UnifiedFloatingFab
                onOpenMeta={() => setIsMetaOpen(true)}
                onOpenHelp={() => setIsHelpOpen(true)}
                onOpenAssistant={() => setHasAttemptedAssistant(true)}
                orgSlug={orgSlug}
            />

            {/* Controlled Components */}
            {isInternalOrg && <MetaControlSheet open={isMetaOpen} onOpenChange={setIsMetaOpen} />}
            <LazyAssistantModal open={isHelpOpen} onOpenChange={setIsHelpOpen} />

            {/* New Pixy Assistant - Deferred Mount - Hook only runs when attempted */}
            {isInternalOrg && hasAttemptedAssistant && (
                <AssistantWrapper />
            )}
        </>
    )
}

/**
 * Internal wrapper to isolate the useAssistant hook and avoid global overhead.
 */
function AssistantWrapper() {
    const { messages, status, isOpen, setIsOpen, submitMessage, toggleVoice } = useAssistant()
    
    // Automatically open on first mount when wrapper is triggered
    useEffect(() => {
        setIsOpen(true)
    }, [])

    return (
        <LazyAssistantOverlay
            messages={messages}
            status={status}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            submitMessage={submitMessage}
            toggleVoice={toggleVoice}
        />
    )
}

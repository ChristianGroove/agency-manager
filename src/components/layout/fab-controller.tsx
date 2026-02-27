"use client"

import { useState } from "react"
import { UnifiedFloatingFab } from "./unified-floating-fab"
import MetaControlSheet from "@/components/meta/MetaControlSheet"
import { AssistantModal } from "@/modules/core/caa/components/assistant-modal"
import { useAssistant } from "@/hooks/use-assistant"
import dynamic from "next/dynamic"

// LAZY LOAD: The massive Assistant UI (animations, chat history) won't parse in JS 
// until requested explicitly to save memory footprint.
const LazyAssistantOverlay = dynamic(
    () => import("@/components/assistant/AssistantOverlay").then(mod => mod.AssistantOverlay),
    {
        ssr: false,
        loading: () => null // Invisible during background load
    }
)

export function FabController({ orgSlug }: { orgSlug?: string }) {
    const isInternalOrg = orgSlug === 'pixy-agency'

    const [isMetaOpen, setIsMetaOpen] = useState(false)
    const [isHelpOpen, setIsHelpOpen] = useState(false)
    const [hasAttemptedAssistant, setHasAttemptedAssistant] = useState(false)


    // Lifted Assistant State
    const { messages, status, isOpen: isAssistantOpen, setIsOpen: setIsAssistantOpen, submitMessage, toggleVoice } = useAssistant()

    return (
        <>
            <UnifiedFloatingFab
                onOpenMeta={() => setIsMetaOpen(true)}
                onOpenHelp={() => setIsHelpOpen(true)}
                onOpenAssistant={() => {
                    setHasAttemptedAssistant(true)
                    setIsAssistantOpen(true)
                }}
                orgSlug={orgSlug}
            />

            {/* Controlled Components */}
            {isInternalOrg && <MetaControlSheet open={isMetaOpen} onOpenChange={setIsMetaOpen} />}
            <AssistantModal open={isHelpOpen} onOpenChange={setIsHelpOpen} />

            {/* New Pixy Assistant - Deferred Mount */}
            {isInternalOrg && hasAttemptedAssistant && (
                <LazyAssistantOverlay
                    messages={messages}
                    status={status}
                    isOpen={isAssistantOpen}
                    setIsOpen={setIsAssistantOpen}
                    submitMessage={submitMessage}
                    toggleVoice={toggleVoice}
                />
            )}
        </>
    )
}

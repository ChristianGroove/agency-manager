"use client"

import { useState } from "react"
import { UnifiedFloatingFab } from "./unified-floating-fab"
import MetaControlSheet from "@/components/meta/MetaControlSheet"
import { AssistantModal } from "@/modules/core/caa/components/assistant-modal"
import { useAssistant } from "@/hooks/use-assistant"
import { AssistantOverlay } from "@/components/assistant/AssistantOverlay"

export function FabController() {
    const [isMetaOpen, setIsMetaOpen] = useState(false)
    const [isHelpOpen, setIsHelpOpen] = useState(false)

    // Lifted Assistant State
    const { messages, status, isOpen: isAssistantOpen, setIsOpen: setIsAssistantOpen, submitMessage, toggleVoice } = useAssistant()

    return (
        <>
            <UnifiedFloatingFab
                onOpenMeta={() => setIsMetaOpen(true)}
                onOpenHelp={() => setIsHelpOpen(true)}
                onOpenAssistant={() => setIsAssistantOpen(true)}
            />

            {/* Controlled Components */}
            <MetaControlSheet open={isMetaOpen} onOpenChange={setIsMetaOpen} />
            <AssistantModal open={isHelpOpen} onOpenChange={setIsHelpOpen} />

            {/* New Pixy Assistant */}
            <AssistantOverlay
                messages={messages}
                status={status}
                isOpen={isAssistantOpen}
                setIsOpen={setIsAssistantOpen}
                submitMessage={submitMessage}
                toggleVoice={toggleVoice}
            />
        </>
    )
}

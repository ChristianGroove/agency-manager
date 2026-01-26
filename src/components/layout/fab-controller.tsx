"use client"

import { useState } from "react"
import { UnifiedFloatingFab } from "./unified-floating-fab"
import MetaControlSheet from "@/components/meta/MetaControlSheet"
import { AssistantModal } from "@/modules/core/caa/components/assistant-modal"

export function FabController() {
    const [isMetaOpen, setIsMetaOpen] = useState(false)
    const [isHelpOpen, setIsHelpOpen] = useState(false)

    return (
        <>
            <UnifiedFloatingFab
                onOpenMeta={() => setIsMetaOpen(true)}
                onOpenHelp={() => setIsHelpOpen(true)}
            />

            {/* Controlled Components */}
            <MetaControlSheet open={isMetaOpen} onOpenChange={setIsMetaOpen} />
            <AssistantModal open={isHelpOpen} onOpenChange={setIsHelpOpen} />
        </>
    )
}

"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { FloatingAssistant } from "./floating-assistant"
import { AssistantModal } from "./assistant-modal"

// Main Contextual Action Assistant - combines floating button + modal
export function ContextualActionAssistant() {
    const [isOpen, setIsOpen] = useState(false)

    // Keyboard shortcut to open (Cmd+K or Ctrl+K)
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setIsOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    // Check for public routes
    const pathname = usePathname()
    // Hide on: Client Portal (/portal) or Shared Links (/share)
    const isPublicRoute = pathname?.startsWith('/portal') || pathname?.startsWith('/share')

    if (isPublicRoute) return null

    return (
        <>
            <FloatingAssistant onOpen={() => setIsOpen(true)} />
            <AssistantModal open={isOpen} onOpenChange={setIsOpen} />
        </>
    )
}

// Re-export components for external use
export { AssistantModal } from "./assistant-modal"
export { FloatingAssistant } from "./floating-assistant"

// Phase 2: Polish Components
export { EmptyStateHelpCard } from "./empty-state-help-card"
export { OnboardingChecklist } from "./onboarding-checklist"
export { ContextualTooltip, InlineTooltip } from "./contextual-tooltip"

// Phase 3: Innovation
export { AIChatPanel } from "./ai-chat-panel"

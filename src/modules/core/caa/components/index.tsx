"use client"

import { useState, useEffect } from "react"
import { FloatingAssistant } from "./floating-assistant"
import { AssistantModal } from "./assistant-modal"

export function ContextualActionAssistant() {
    const [isOpen, setIsOpen] = useState(false)

    // Keyboard shortcut to open (Cmd+K or Ctrl+K usually conflicts, let's try Ctrl+Space or just generic)
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

    return (
        <>
            <FloatingAssistant onOpen={() => setIsOpen(true)} />
            <AssistantModal open={isOpen} onOpenChange={setIsOpen} />
        </>
    )
}

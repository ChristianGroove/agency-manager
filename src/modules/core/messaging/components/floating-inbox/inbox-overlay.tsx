"use client"

import { useGlobalInbox } from "../../context/global-inbox-context"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

// Lazy load the heavy InboxLayout
const InboxLayout = dynamic(() => import("../inbox-layout").then(mod => mod.InboxLayout), {
    loading: () => (
        <div className="flex items-center justify-center h-full w-full bg-background/50 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    )
})

export function InboxOverlay() {
    const { isOpen, closeInbox, activeConversationId } = useGlobalInbox()

    if (!isOpen) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeInbox}
                        className="fixed inset-0 bg-background/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full h-full max-w-[1600px] bg-background border shadow-2xl rounded-2xl overflow-hidden flex flex-col pointer-events-auto"
                    >
                        {/* Close Button Header */}
                        <div className="absolute top-4 right-4 z-50">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={closeInbox}
                                className="h-8 w-8 rounded-full bg-background/80 backdrop-blur shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Inbox Layout */}
                        <div className="flex-1 overflow-hidden">
                            {/* Pass active ID to auto-open the chat */}
                            <InboxLayout initialConversationId={activeConversationId} />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

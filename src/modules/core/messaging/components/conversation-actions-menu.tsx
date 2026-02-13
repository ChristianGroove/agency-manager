"use client"

import { useState } from "react"
import { MoreVertical, Archive, Trash2, CheckCircle, ArchiveRestore, Clock, Lightbulb } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { archiveConversation, deleteConversation, markAsRead, unarchiveConversation, snoozeConversation } from "../conversation-actions"
import { toast } from "sonner"
import { addHours, addDays, nextMonday, setHours, setMinutes, startOfHour } from "date-fns"
import { SaveAsFAQModal } from "./save-as-faq-modal"

interface ConversationActionsMenuProps {
    conversationId: string
    isArchived?: boolean
    onActionComplete?: () => void
}

export function ConversationActionsMenu({
    conversationId,
    isArchived = false,
    onActionComplete
}: ConversationActionsMenuProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isFAQModalOpen, setIsFAQModalOpen] = useState(false)

    const handleAction = async (action: () => Promise<any>, successMessage: string) => {
        setIsLoading(true)
        try {
            const result = await action()
            if (result.success) {
                toast.success("Success", {
                    description: successMessage
                })
                onActionComplete?.()
            } else {
                toast.error("Error", {
                    description: result.error || "Action failed"
                })
            }
        } catch (error) {
            toast.error("Error", {
                description: "An unexpected error occurred"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSnooze = (date: Date) => {
        handleAction(
            () => snoozeConversation(conversationId, date),
            `Snoozed until ${date.toLocaleString()}`
        )
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isLoading}
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => handleAction(
                            () => markAsRead(conversationId),
                            "Marked as read"
                        )}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as read
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* AI: Save as FAQ */}
                    <DropdownMenuItem onClick={() => setIsFAQModalOpen(true)}>
                        <Lightbulb className="mr-2 h-4 w-4 text-yellow-500" />
                        Guardar como FAQ
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* FAQ Modal */}
            <SaveAsFAQModal
                open={isFAQModalOpen}
                onOpenChange={setIsFAQModalOpen}
                conversationId={conversationId}
            />
        </>
    )
}

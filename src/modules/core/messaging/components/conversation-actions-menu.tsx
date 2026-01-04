"use client"

import { useState } from "react"
import { MoreVertical, Archive, Trash2, CheckCircle, ArchiveRestore, Clock } from "lucide-react"
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

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Clock className="mr-2 h-4 w-4" />
                        Snooze
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => handleSnooze(addHours(new Date(), 4))}>
                            Later Today (4 hours)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSnooze(setMinutes(setHours(addDays(new Date(), 1), 9), 0))}>
                            Tomorrow (9:00 AM)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSnooze(setMinutes(setHours(nextMonday(new Date()), 9), 0))}>
                            Next Week (Mon 9:00 AM)
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                {isArchived ? (
                    <DropdownMenuItem
                        onClick={() => handleAction(
                            () => unarchiveConversation(conversationId),
                            "Conversation unarchived"
                        )}
                    >
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        Unarchive
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem
                        onClick={() => handleAction(
                            () => archiveConversation(conversationId),
                            "Conversation archived"
                        )}
                    >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => {
                        if (confirm("Are you sure? This will permanently delete the conversation and all messages.")) {
                            handleAction(
                                () => deleteConversation(conversationId),
                                "Conversation deleted"
                            )
                        }
                    }}
                    className="text-destructive focus:text-destructive"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

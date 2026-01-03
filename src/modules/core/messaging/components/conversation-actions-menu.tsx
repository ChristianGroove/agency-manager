"use client"

import { useState } from "react"
import { MoreVertical, Archive, Trash2, CheckCircle, ArchiveRestore } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { archiveConversation, deleteConversation, markAsRead, unarchiveConversation } from "../conversation-actions"
import { useToast } from "@/hooks/use-toast"

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
    const { toast } = useToast()

    const handleAction = async (action: () => Promise<any>, successMessage: string) => {
        setIsLoading(true)
        try {
            const result = await action()
            if (result.success) {
                toast({
                    title: "Success",
                    description: successMessage
                })
                onActionComplete?.()
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Action failed",
                    variant: "destructive"
                })
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
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

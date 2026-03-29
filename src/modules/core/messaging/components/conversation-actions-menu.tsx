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

    const handleAction = async (action: () => Promise<any>, successMessage: string, isOptimistic: boolean = false) => {
        if (isOptimistic) {
            onActionComplete?.() // Vanish immediately
        } else {
            setIsLoading(true)
        }

        try {
            const result = await action()
            if (result.success) {
                if (!isOptimistic) {
                    toast.success("Success", { description: successMessage })
                    onActionComplete?.()
                }
            } else {
                toast.error("Error", { description: result.error || "Action failed" })
            }
        } catch (error) {
            toast.error("Error", { description: "An unexpected error occurred" })
        } finally {
            setIsLoading(false)
        }
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
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                        onClick={() => handleAction(
                            () => markAsRead(conversationId),
                            "Marked as read"
                        )}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Marcar como leído
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setIsFAQModalOpen(true)}>
                        <Lightbulb className="mr-2 h-4 w-4 text-yellow-500" />
                        Guardar como FAQ
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56">
                            <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600"
                                onClick={() => {
                                    if (window.confirm("¿Eliminar solo esta conversación?")) {
                                        handleAction(
                                            () => deleteConversation(conversationId, false),
                                            "Conversación eliminada",
                                            true
                                        )
                                    }
                                }}
                            >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Solo esta conversación
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600 font-semibold"
                                onClick={() => {
                                    if (window.confirm("¡ATENCIÓN! Esto eliminará el chat Y EL LEAD permanentemente. ¿Continuar?")) {
                                        handleAction(
                                            () => deleteConversation(conversationId, true),
                                            "Chat y Lead eliminados",
                                            true
                                        )
                                    }
                                }}
                            >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Todo el contacto (Lead)
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>

            <SaveAsFAQModal
                open={isFAQModalOpen}
                onOpenChange={setIsFAQModalOpen}
                conversationId={conversationId}
            />
        </>
    )
}

"use client"

import { useState } from "react"
import { useDraggable, useDroppable, DndContext, DragEndEvent } from "@dnd-kit/core"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { assignConversation } from "../conversation-management-actions"
import { User, Circle } from "lucide-react"
import { toast } from "sonner"

interface Agent {
    agent_id: string
    status: string
    current_load: number
    max_capacity: number
    users: {
        email: string
        raw_user_meta_data: any
    }
}

interface QuickAssignPanelProps {
    conversationId: string
    currentAssignee?: string | null
    agents: Agent[]
    onAssigned?: () => void
}

export function QuickAssignPanel({ conversationId, currentAssignee, agents, onAssigned }: QuickAssignPanelProps) {
    const [assigning, setAssigning] = useState(false)

    const handleAssign = async (agentId: string | null) => {
        setAssigning(true)

        const result = await assignConversation(conversationId, agentId)

        if (result.success) {
            toast.success(agentId ? 'Conversation assigned' : 'Assignment removed')
            onAssigned?.()
        } else {
            toast.error(result.error || 'Failed to assign')
        }

        setAssigning(false)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-green-500'
            case 'away': return 'text-yellow-500'
            case 'busy': return 'text-orange-500'
            default: return 'text-gray-400'
        }
    }

    const getLoadPercentage = (agent: Agent) => {
        return (agent.current_load / agent.max_capacity) * 100
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Quick Assign</h3>
                {currentAssignee && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAssign(null)}
                        disabled={assigning}
                    >
                        Unassign
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {agents
                    .filter(a => a.status === 'online' || a.agent_id === currentAssignee)
                    .map(agent => {
                        const name = agent.users?.raw_user_meta_data?.name || agent.users?.email || 'Unknown'
                        const initials = name.substring(0, 2).toUpperCase()
                        const loadPercentage = getLoadPercentage(agent)
                        const isAssigned = agent.agent_id === currentAssignee

                        return (
                            <Button
                                key={agent.agent_id}
                                variant={isAssigned ? "default" : "outline"}
                                className="h-auto py-3 px-3 justify-start"
                                onClick={() => handleAssign(agent.agent_id)}
                                disabled={assigning}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <div className="relative">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="text-xs">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <Circle
                                            className={`h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5 fill-current ${getStatusColor(agent.status)} border-2 border-white rounded-full`}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="text-xs font-medium truncate">{name}</div>
                                        <div className="flex items-center gap-1">
                                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                                <div
                                                    className={`h-1 rounded-full transition-all ${loadPercentage >= 90 ? 'bg-red-500' :
                                                            loadPercentage >= 70 ? 'bg-yellow-500' :
                                                                'bg-green-500'
                                                        }`}
                                                    style={{ width: `${Math.min(loadPercentage, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">
                                                {agent.current_load}/{agent.max_capacity}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Button>
                        )
                    })}
            </div>

            {agents.filter(a => a.status === 'online').length === 0 && (
                <Card className="p-4 text-center">
                    <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No agents online</p>
                </Card>
            )}
        </div>
    )
}

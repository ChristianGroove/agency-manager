import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { assignConversation } from "../conversation-management-actions"
import { User, Circle, ChevronDown, Check, Users } from "lucide-react"
import { toast } from "sonner"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

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
    const [open, setOpen] = useState(false)
    const [assigning, setAssigning] = useState(false)

    const handleAssign = async (agentId: string | null) => {
        setAssigning(true)
        const result = await assignConversation(conversationId, agentId)

        if (result.success) {
            toast.success(agentId ? 'Assigned' : 'Unassigned')
            onAssigned?.()
            setOpen(false)
        } else {
            toast.error(result.error || 'Failed to assign')
        }
        setAssigning(false)
    }

    const currentAgent = agents.find(a => a.agent_id === currentAssignee)
    const currentName = currentAgent?.users?.raw_user_meta_data?.name || currentAgent?.users?.email || 'Unassigned'
    const currentInitials = currentName.substring(0, 2).toUpperCase()

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-500' // Using bg for circle
            case 'away': return 'bg-yellow-500'
            case 'busy': return 'bg-orange-500'
            default: return 'bg-gray-400'
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" role="combobox" aria-expanded={open} className="w-full justify-between px-0 hover:bg-transparent h-auto group">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            {currentAssignee ? (
                                <Avatar className="h-8 w-8 border border-border">
                                    <AvatarFallback className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800">
                                        {currentInitials}
                                    </AvatarFallback>
                                </Avatar>
                            ) : (
                                <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                    <User className="h-4 w-4 text-muted-foreground/50" />
                                </div>
                            )}
                            {currentAgent && (
                                <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background", getStatusColor(currentAgent.status))} />
                            )}
                        </div>
                        <div className="text-left">
                            <div className="text-[10px] uppercase font-semibold text-muted-foreground">Assigned to</div>
                            <div className="text-sm font-medium leading-none mt-0.5 group-hover:underline decoration-muted-foreground/50 underline-offset-2">
                                {currentAssignee ? currentName : "No one (Click to assign)"}
                            </div>
                        </div>
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search agent..." disabled={assigning} />
                    <CommandList>
                        <CommandEmpty>No agent found.</CommandEmpty>
                        <CommandGroup heading="Agents">
                            {currentAssignee && (
                                <CommandItem onSelect={() => handleAssign(null)} className="text-red-500">
                                    <User className="mr-2 h-4 w-4" />
                                    Unassign
                                    <Check className={cn("ml-auto h-4 w-4", !currentAssignee ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                            )}
                            {agents
                                .map(agent => {
                                    const name = agent.users?.raw_user_meta_data?.name || agent.users?.email || 'Unknown'
                                    const loadPercentage = (agent.current_load / agent.max_capacity) * 100
                                    return (
                                        <CommandItem
                                            key={agent.agent_id}
                                            value={name}
                                            onSelect={() => handleAssign(agent.agent_id)}
                                            className="flex flex-col items-start gap-1 py-2"
                                        >
                                            <div className="flex items-center w-full">
                                                <div className={cn("h-2 w-2 rounded-full mr-2", getStatusColor(agent.status))} />
                                                <span className="flex-1 truncate">{name}</span>
                                                {agent.agent_id === currentAssignee && (
                                                    <Check className="ml-auto h-4 w-4 opacity-50" />
                                                )}
                                            </div>
                                            {/* Load Bar */}
                                            <div className="w-full pl-4 pr-1 flex items-center gap-2">
                                                <div className="h-1 flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className={cn("h-full transition-all",
                                                        loadPercentage > 90 ? "bg-red-500" :
                                                            loadPercentage > 60 ? "bg-amber-500" : "bg-green-500"
                                                    )} style={{ width: `${Math.min(loadPercentage, 100)}%` }} />
                                                </div>
                                                <span className="text-[10px] text-muted-foreground tabular-nums">{agent.current_load}/{agent.max_capacity}</span>
                                            </div>
                                        </CommandItem>
                                    )
                                })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

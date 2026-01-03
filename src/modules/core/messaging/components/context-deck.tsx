"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { User, Phone, Mail, MapPin, ExternalLink, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database } from "@/types/supabase"
import Link from "next/link"
import { QuickAssignPanel } from "./quick-assign-panel"
import { getAgentsWorkload } from "../assignment-actions"

interface ContextDeckProps {
    conversationId: string
}

type Lead = Database['public']['Tables']['leads']['Row']

export function ContextDeck({ conversationId }: ContextDeckProps) {
    const [lead, setLead] = useState<Lead | null>(null)
    const [conversation, setConversation] = useState<any>(null)
    const [agents, setAgents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchContext = async () => {
            setLoading(true)
            // 1. Get Conversation to get Lead ID and assignment
            const { data: conv } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .single()

            if (conv) {
                setConversation(conv)

                if (conv.lead_id) {
                    // 2. Get Lead
                    const { data: leadData } = await supabase
                        .from('leads')
                        .select('*')
                        .eq('id', conv.lead_id)
                        .single()

                    if (leadData) setLead(leadData)
                }
            } else {
                setLead(null)
                setConversation(null)
            }

            // 3. Load agents for assignment
            const agentsResult = await getAgentsWorkload()
            if (agentsResult.success) {
                setAgents(agentsResult.data)
            }

            setLoading(false)
        }

        fetchContext()

        // Subscribe to conversation updates
        const channel = supabase
            .channel(`conversation-${conversationId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversations',
                filter: `id=eq.${conversationId}`
            }, (payload) => {
                setConversation(payload.new)
            })
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [conversationId])

    if (loading) {
        return <div className="p-8 text-center text-sm text-muted-foreground">Loading context...</div>
    }

    if (!lead) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="font-semibold">Unknown Contact</h3>
                    <p className="text-sm text-muted-foreground">No CRM Record linked</p>
                </div>
                <Button variant="outline" size="sm">Create Lead</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
            {/* Header / Profile */}
            <div className="p-6 flex flex-col items-center text-center border-b">
                <Avatar className="h-20 w-20 mb-4">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name || 'Unknown'}`} />
                    <AvatarFallback>{(lead.name || 'UN').slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-bold">{lead.name || 'Unknown Contact'}</h2>
                <Badge variant="secondary" className="mt-2 capitalize">
                    {lead.status}
                </Badge>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                <TabsList className="w-full grid grid-cols-2 mx-6 mt-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="flex-1 p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Contact Info</h4>

                        <div className="flex items-center gap-3 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.phone || "No phone"}</span>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.email || "No email"}</span>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>Unknown Location</span>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Deal Info</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <span className="text-xs text-muted-foreground block">Value</span>
                                <span className="font-semibold text-lg">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: lead.currency || 'USD' }).format(lead.value || 0)}
                                </span>
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <span className="text-xs text-muted-foreground block">Priority</span>
                                <span className="font-semibold capitalize">{lead.priority}</span>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Actions Tab */}
                <TabsContent value="actions" className="flex-1 p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-6">
                        {/* Quick Assign */}
                        <div>
                            <QuickAssignPanel
                                conversationId={conversationId}
                                currentAssignee={conversation?.assigned_to}
                                agents={agents}
                                onAssigned={() => {
                                    // Refresh conversation data
                                    supabase
                                        .from('conversations')
                                        .select('*')
                                        .eq('id', conversationId)
                                        .single()
                                        .then(({ data }) => {
                                            if (data) setConversation(data)
                                        })
                                }}
                            />
                        </div>

                        <Separator />

                        {/* CRM Actions */}
                        <div>
                            <h4 className="text-sm font-semibold mb-3">CRM Actions</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/crm?lead=${lead.id}`}>
                                        <User className="h-4 w-4 mr-2" />
                                        View Lead
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/automation">
                                        <Users className="h-4 w-4 mr-2" />
                                        Workflows
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

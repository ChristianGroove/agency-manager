"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import {
    User, Phone, Mail, MapPin, ExternalLink,
    CalendarClock, Archive, CheckCircle2,
    MoreHorizontal, Tag, DollarSign, AlertCircle, Briefcase
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Database } from "@/types/supabase"
import Link from "next/link"
import { QuickAssignPanel } from "./quick-assign-panel"
import { getAgentsWorkload } from "../assignment-actions"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

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
            const { data: conv } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .single()

            if (conv) {
                setConversation(conv)
                if (conv.lead_id) {
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

            const agentsResult = await getAgentsWorkload()
            if (agentsResult.success) {
                setAgents(agentsResult.data)
            }
            setLoading(false)
        }

        fetchContext()

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
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="h-6 w-6 border-2 border-brand-pink border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground animate-pulse">Cargando contexto...</p>
            </div>
        )
    }

    if (!lead) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-5 bg-muted/5">
                <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center shadow-inner">
                    <User className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">Contacto Desconocido</h3>
                    <p className="text-sm text-muted-foreground max-w-[180px] mx-auto">Esta conversación no está vinculada a un Lead en el CRM.</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-full px-6">Crear Lead</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-background/50 dark:bg-zinc-950/50 backdrop-blur-xl border-l border-border/50">
            {/* 1. Compact Header */}
            <div className="p-4 border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Avatar className="h-12 w-12 shadow-sm ring-2 ring-background dark:ring-zinc-900">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.title || 'Unknown'}`} />
                            <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold">
                                {(lead.title || 'UN').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold truncate leading-tight">{lead.title || 'Unknown Contact'}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-0">
                                {lead.company || "Particular"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal border-zinc-200 dark:border-zinc-800 text-zinc-500">
                                {lead.status}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* 2. Sleek Action Bar */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                    <ActionBtn icon={CheckCircle2} label="Done" onClick={() => { }} color="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20" />
                    <ActionBtn icon={CalendarClock} label="Snooze" onClick={() => { }} color="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20" />
                    <ActionBtn icon={Archive} label="Archive" onClick={() => { }} color="text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" />
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-full rounded-lg border border-transparent hover:border-border hover:bg-muted/50">
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>More Options</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">

                    {/* 3. Unified Deal & Assignment Card */}
                    <Card className="shadow-none border border-border/60 bg-gradient-to-b from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-900/50">
                        <CardContent className="p-0 divide-y divide-border/40">
                            {/* Deal Value */}
                            <div className="p-4 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Deal Value</div>
                                    <div className="text-xl font-bold font-mono tracking-tight flex items-baseline gap-1">
                                        <span className="text-muted-foreground text-sm">$</span>
                                        {lead.value?.toLocaleString() || '0'}
                                    </div>
                                </div>
                                <Badge variant="outline" className={cn(
                                    "uppercase text-[10px] font-bold tracking-wide border-0 px-2 py-1",
                                    lead.priority === 'urgent' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                        lead.priority === 'high' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                            "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                )}>
                                    {lead.priority || 'Normal'}
                                </Badge>
                            </div>

                            {/* Assignment Row */}
                            <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/30">
                                <QuickAssignPanel
                                    conversationId={conversationId}
                                    currentAssignee={conversation?.assigned_to}
                                    agents={agents}
                                    onAssigned={() => {
                                        supabase.from('conversations').select('*').eq('id', conversationId).single().then(({ data }) => {
                                            if (data) setConversation(data)
                                        })
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Compact Contact Info */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Details</h4>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-muted" asChild>
                                <Link href={`/crm?lead=${lead.id}`}><ExternalLink className="h-3 w-3 text-muted-foreground" /></Link>
                            </Button>
                        </div>

                        <div className="space-y-1">
                            <ContactItem icon={Phone} label="Mobile" value={lead.phone} />
                            <ContactItem icon={Mail} label="Email" value={lead.email} />
                            <ContactItem icon={MapPin} label="Location" value="Unknown Location" />
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {(lead.tags as string[] || ['lead']).map(tag => (
                                <Badge key={tag} variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-transparent hover:border-border transition-colors px-2 py-0.5 text-[11px] font-normal">
                                    <Tag className="h-3 w-3 mr-1 opacity-50" />
                                    {tag}
                                </Badge>
                            ))}
                            <Button variant="outline" size="sm" className="h-5 rounded-full px-2 text-[10px] border-dashed text-muted-foreground hover:text-foreground">
                                + Add
                            </Button>
                        </div>
                    </div>

                </div>
            </ScrollArea>
        </div>
    )
}

function ActionBtn({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        onClick={onClick}
                        className={cn("h-9 w-full rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all flex items-center justify-center", color)}
                    >
                        <Icon className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

function ContactItem({ icon: Icon, label, value }: { icon: any, label: string, value?: string }) {
    if (!value) return null
    return (
        <div className="group flex items-center gap-3 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={() => {
            navigator.clipboard.writeText(value)
            // toast.success("Copied") - Ideally add toast here
        }}>
            <Icon className="h-4 w-4 text-muted-foreground opacity-70 group-hover:opacity-100 group-hover:text-foreground transition-all" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-foreground/90 group-hover:text-foreground">{value}</p>
            </div>
            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground transition-opacity bg-background/80 px-1.5 py-0.5 rounded shadow-sm">
                Copy
            </span>
        </div>
    )
}




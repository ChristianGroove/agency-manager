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
        <div className="flex flex-col h-full bg-background dark:bg-zinc-900/50 backdrop-blur-xl">
            {/* Header: Profile & Status */}
            <div className="p-6 pb-2 text-center relative z-10">
                <div className="relative inline-block">
                    <Avatar className="h-24 w-24 mx-auto mb-3 shadow-xl ring-4 ring-background dark:ring-zinc-900">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.title || 'Unknown'}`} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-brand-pink to-purple-600 text-white border-0">
                            {(lead.title || 'UN').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-1 h-5 w-5 rounded-full bg-green-500 border-4 border-background dark:border-zinc-900" title="Online" />
                </div>

                <h2 className="text-xl font-bold truncate mt-2 px-4">{lead.title || 'Unknown Contact'}</h2>
                <div className="flex justify-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 border-muted-foreground/20">
                        {lead.company || "Particular"}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">
                        {lead.status}
                    </Badge>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-5 space-y-6">

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        <ActionBtn icon={CheckCircle2} label="Resolver" color="text-green-500 bg-green-500/10 hover:bg-green-500/20" />
                        <ActionBtn icon={CalendarClock} label="Snooze" color="text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" />
                        <ActionBtn icon={Archive} label="Archivar" color="text-slate-500 bg-slate-500/10 hover:bg-slate-500/20" />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-[4.5rem] w-full rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-muted/50 border border-transparent hover:border-border transition-all">
                                        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground font-medium">Más</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Más Opciones</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    {/* CRM Context Card */}
                    <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-900/50 dark:border dark:border-white/5 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                                <Link href={`/crm?lead=${lead.id}`}><ExternalLink className="h-3 w-3" /></Link>
                            </Button>
                        </div>
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Briefcase className="h-3 w-3 text-brand-pink" />
                                Deal Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: lead.currency || 'USD', maximumFractionDigits: 0 }).format(lead.value || 0)}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-medium mt-0.5 ml-1">Valor Estimado</div>
                                </div>
                                <div className="text-right">
                                    <Badge variant={(lead.priority === 'high' || lead.priority === 'urgent') ? 'destructive' : 'default'} className="uppercase text-[10px]">
                                        {lead.priority}
                                    </Badge>
                                </div>
                            </div>

                            {/* Assignee */}
                            <div className="pt-3 border-t border-dashed border-gray-200 dark:border-white/10">
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

                    {/* Contact Details */}
                    <div className="space-y-3 bg-muted/20 rounded-2xl p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Contacto</h4>

                        <div className="flex items-center gap-3 p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-lg transition-colors group cursor-copy">
                            <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                                <Phone className="h-4 w-4" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{lead.phone || "Sin teléfono"}</p>
                                <p className="text-[10px] text-muted-foreground">Móvil</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-lg transition-colors group cursor-copy">
                            <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">{lead.email || "Sin email"}</p>
                                <p className="text-[10px] text-muted-foreground">Correo</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-lg transition-colors group">
                            <div className="h-8 w-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                                <MapPin className="h-4 w-4" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium truncate">Unknown Location</p>
                                <p className="text-[10px] text-muted-foreground">Ubicación</p>
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Etiquetas</h4>
                        <div className="flex flex-wrap gap-2">
                            {(lead.tags as string[] || ['prospecto', 'nuevo']).map(tag => (
                                <Badge key={tag} variant="secondary" className="bg-white dark:bg-white/10 border hover:bg-gray-100 dark:hover:bg-white/20 pl-1 pr-2 py-1 gap-1 text-[11px] font-normal">
                                    <Tag className="h-3 w-3 opacity-50" />
                                    {tag}
                                </Badge>
                            ))}
                            <Button variant="ghost" size="sm" className="h-6 w-6 rounded-full p-0 border border-dashed">
                                <span className="text-xs">+</span>
                            </Button>
                        </div>
                    </div>

                </div>
            </ScrollArea>
        </div>
    )
}

function ActionBtn({ icon: Icon, label, color }: { icon: any, label: string, color: string }) {
    return (
        <Button
            variant="ghost"
            className={cn("h-[4.5rem] w-full rounded-2xl flex flex-col items-center justify-center gap-2 border border-transparent transition-all group", color)}
        >
            <Icon className="h-5 w-5 opacity-90 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium opacity-90">{label}</span>
        </Button>
    )
}




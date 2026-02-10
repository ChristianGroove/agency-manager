"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { QuoteDesignerSheet } from "../../crm/components/quote-designer-sheet"
import {
    User, Phone, Mail, MapPin, ExternalLink,
    CalendarClock, Archive, CheckCircle2,
    MoreHorizontal, Tag, DollarSign, Palette,
    LayoutDashboard, MessageSquare, ShoppingBag
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Database } from "@/types/supabase"
import Link from "next/link"
import { QuickAssignPanel } from "./quick-assign-panel"
import { DealBuilder } from "../../crm/components/deal-builder"
import { getAgentsWorkload } from "../assignment-actions"
import { archiveConversation, snoozeConversation, completeConversation } from "../conversation-actions"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { RepliesTab } from "./replies-tab"
import { SavedRepliesSheet } from "./saved-replies-sheet"

interface ContextDeckProps {
    conversationId: string
}

type Lead = Database['public']['Tables']['leads']['Row']
type TabType = 'management' | 'replies' | 'sales'

export function ContextDeck({ conversationId }: ContextDeckProps) {
    const [lead, setLead] = useState<Lead | null>(null)
    const [conversation, setConversation] = useState<any>(null)
    const [agents, setAgents] = useState<any[]>([])
    const [lastMessage, setLastMessage] = useState<string | undefined>(undefined)
    const [loading, setLoading] = useState(true)

    // Tabs State
    const [activeTab, setActiveTab] = useState<TabType>('management')

    const [isQuoteDesignerOpen, setIsQuoteDesignerOpen] = useState(false)
    const [isRepliesSheetOpen, setIsRepliesSheetOpen] = useState(false)

    const fetchContext = useCallback(async () => {
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
            } else {
                setLead(null)
            }

            const agentsResult = await getAgentsWorkload()
            if (agentsResult.success) {
                setAgents(agentsResult.data)
            }
        }

        // Fetch Last Incoming Message for AI context
        const { data: messages } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conversationId)
            .eq('direction', 'inbound')
            .order('created_at', { ascending: false })
            .limit(1)

        if (messages && messages.length > 0) {
            // Handle both text and json content
            const lastMsg = messages[0]
            let text = ''
            if (typeof lastMsg.content === 'string') text = lastMsg.content
            else if (typeof lastMsg.content === 'object' && (lastMsg.content as any)?.text) text = (lastMsg.content as any).text
            setLastMessage(text)
        } else {
            setLastMessage(undefined)
        }

        setLoading(false)
    }, [conversationId])

    // Initial Fetch
    useEffect(() => {
        fetchContext()
    }, [fetchContext])

    // Real-time Subscription
    useEffect(() => {
        if (!conversationId) return

        const channel = supabase
            .channel(`context-deck-${conversationId}`)
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

    // Lead Initials
    const leadInitials = (lead.title || 'UN').slice(0, 2).toUpperCase()

    return (
        <div className="flex flex-col h-full bg-background/60 dark:bg-zinc-950/60 backdrop-blur-xl border-l border-white/10 dark:border-white/5 shadow-2xl z-20">
            {/* 1. Header & Actions (Always Visible) */}
            <div className="p-4 border-b border-border/40 bg-background/40 backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                        <Avatar className="h-12 w-12 shadow-lg ring-2 ring-white/20 dark:ring-white/10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.title || 'Unknown'}`} />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-700 dark:text-indigo-300 font-bold">
                                {leadInitials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background shadow-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold truncate leading-tight tracking-tight">{lead.title || 'Contacto Desconocido'}</h2>
                        <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-0 shadow-sm">
                                {lead.company || "Particular"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-medium border-zinc-200 dark:border-zinc-800 text-zinc-500">
                                {lead.status === 'new' ? 'Nuevo' : lead.status}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Sleek Action Bar */}
                <div className="grid grid-cols-4 gap-2">
                    <ActionBtn
                        icon={CheckCircle2}
                        label="Resolver"
                        onClick={async () => {
                            const res = await completeConversation(conversationId)
                            if (res.success) toast.success("Conversación resuelta")
                            else toast.error("Error al resolver")
                        }}
                        color="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                    />
                    <ActionBtn
                        icon={CalendarClock}
                        label="Posponer"
                        onClick={() => {
                            const tomorrow = new Date()
                            tomorrow.setDate(tomorrow.getDate() + 1)
                            snoozeConversation(conversationId, tomorrow).then(res => {
                                if (res.success) toast.success("Pospuesto hasta mañana")
                            })
                        }}
                        color="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    />
                    <ActionBtn
                        icon={Archive}
                        label="Archivar"
                        onClick={async () => {
                            const res = await archiveConversation(conversationId)
                            if (res.success) toast.success("Conversación archivada")
                            else toast.error("Error al archivar")
                        }}
                        color="text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    />
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-full rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all">
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Más Opciones</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* 2. Top Tabs Navigation */}
            <div className="px-2 pt-2 border-b border-border/20">
                <div className="flex items-center gap-1 p-1">
                    <TabNavItem
                        active={activeTab === 'management'}
                        onClick={() => setActiveTab('management')}
                        label="Gestión"
                        icon={LayoutDashboard}
                    />
                    <TabNavItem
                        active={activeTab === 'replies'}
                        onClick={() => setActiveTab('replies')}
                        label="Respuestas"
                        icon={MessageSquare}
                    />
                    <TabNavItem
                        active={activeTab === 'sales'}
                        onClick={() => setActiveTab('sales')}
                        label="Cotizador"
                        icon={ShoppingBag}
                    />
                </div>
            </div>

            {/* 3. Tab Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-background/30 relative">

                {/* TAB 1: GESTIÓN */}
                {activeTab === 'management' && (
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-6 animate-in fade-in duration-300 slide-in-from-left-2">
                            {/* Assignment Panel */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Asignación</h4>
                                <div className="bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-white/20 dark:border-white/5 p-1 shadow-sm">
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
                            </div>

                            <Separator className="opacity-50" />

                            {/* Contact Info */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detalles de Contacto</h4>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted" asChild>
                                        <Link href={`/crm?lead=${lead.id}`}><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></Link>
                                    </Button>
                                </div>

                                <div className="space-y-1.5">
                                    <ContactItem icon={Phone} label="Móvil" value={lead.phone} />
                                    <ContactItem icon={Mail} label="Email" value={lead.email} />
                                    <ContactItem icon={MapPin} label="Ubicación" value="Ubicación Desconocida" />
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            {/* Tags */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Etiquetas</h4>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-white/20 dark:border-white/5">
                                    {(lead.tags as string[] || ['lead']).map(tag => (
                                        <Badge key={tag} variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-transparent hover:border-border transition-colors px-2 py-0.5 text-[11px] font-normal shadow-sm">
                                            <Tag className="h-3 w-3 mr-1 opacity-50" />
                                            {tag}
                                        </Badge>
                                    ))}
                                    <Button variant="outline" size="sm" className="h-5 rounded-full px-2 text-[10px] border-dashed text-muted-foreground hover:text-foreground">
                                        + Agregar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                )}

                {/* TAB 2: RESPUESTAS */}
                {activeTab === 'replies' && (
                    <div className="h-full flex flex-col animate-in fade-in duration-300 slide-in-from-right-2">
                        <RepliesTab
                            conversationId={conversationId}
                            lastIncomingMessage={lastMessage}
                            onManageReplies={() => setIsRepliesSheetOpen(true)}
                        />
                    </div>
                )}

                {/* TAB 3: COTIZADOR */}
                {/* TAB 3: COTIZADOR */}
                {activeTab === 'sales' && (
                    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-2">
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-4">
                                {/* Deal Value Hero */}
                                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <DollarSign className="h-10 w-10 text-indigo-200 dark:text-indigo-900 -rotate-12" />
                                    </div>
                                    <div className="relative z-10 flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                            <DollarSign className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-indigo-600/70 dark:text-indigo-400/70 font-bold">Valor Potencial</div>
                                            <div className="text-2xl font-bold text-indigo-950 dark:text-indigo-100 font-mono tracking-tight">
                                                ${lead.value?.toLocaleString() || '0'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 relative z-10">
                                        <Badge variant="outline" className={cn(
                                            "uppercase text-[10px] font-bold tracking-wide border-0 px-2 py-0.5",
                                            lead.priority === 'urgent' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                lead.priority === 'high' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                                    "bg-white/50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                        )}>
                                            {lead.priority === 'urgent' ? 'Urgente' : lead.priority === 'high' ? 'Alta' : 'Normal'}
                                        </Badge>
                                    </div>
                                </div>

                                <Separator />

                                {/* Deal Builder within ScrollArea */}
                                <DealBuilder
                                    leadId={lead.id}
                                    conversationId={conversationId}
                                    variant="sidebar"
                                    onCartChange={() => {
                                        fetchContext()
                                    }}
                                    className="pb-2"
                                />
                            </div>
                        </ScrollArea>

                        {/* Fixed Bottom Footer for Quote Designer */}
                        <div className="border-t border-border/40 bg-background/50 backdrop-blur-sm p-2 transition-all">
                            <Button
                                variant="outline"
                                className="w-full gap-2 border-dashed border-pink-300 dark:border-pink-800 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 bg-white/50 dark:bg-zinc-900/50 h-9"
                                onClick={() => setIsQuoteDesignerOpen(true)}
                            >
                                <Palette className="h-4 w-4" />
                                <span className="text-sm font-medium">Quote Designer</span>
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden Sheets */}
            <QuoteDesignerSheet
                open={isQuoteDesignerOpen}
                onOpenChange={setIsQuoteDesignerOpen}
                organizationId={conversation?.organization_id}
            />
            <SavedRepliesSheet
                open={isRepliesSheetOpen}
                onOpenChange={setIsRepliesSheetOpen}
            />
        </div>
    )
}

function TabNavItem({ active, onClick, label, icon: Icon }: { active: boolean, onClick: () => void, label: string, icon: any }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-t-lg transition-all border-b-2",
                active
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-900/10"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
        >
            <Icon className="h-4 w-4" />
            <span className="text-xs">{label}</span>
        </button>
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
        <div className="group flex items-center gap-3 p-2 rounded-lg bg-white/50 dark:bg-zinc-900/50 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer shadow-sm" onClick={() => {
            navigator.clipboard.writeText(value)
            toast.success("Copiado al portapapeles")
        }}>
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-foreground/90">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-600 font-medium transition-opacity">
                Copiar
            </span>
        </div>
    )
}

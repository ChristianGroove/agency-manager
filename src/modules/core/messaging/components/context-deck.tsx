"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { QuoteDesignerSheet } from "../../crm/components/quote-designer-sheet"
import {
    User, Phone, Mail, MapPin, ExternalLink,
    CalendarClock, Archive, CheckCircle2,
    MoreHorizontal, Tag, DollarSign, Palette,
    Copy, Send, KeyRound
} from "lucide-react"
import { TagsPicker } from "../../crm/components/tags/tags-picker"
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
import { useTranslation } from "@/lib/i18n/use-translation"
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
    const { t } = useTranslation()
    const [lead, setLead] = useState<Lead | null>(null)
    const [conversation, setConversation] = useState<any>(null)
    const [agents, setAgents] = useState<any[]>([])
    const [lastMessage, setLastMessage] = useState<string | undefined>(undefined)
    const [loading, setLoading] = useState(true)
    const [spaceCategory, setSpaceCategory] = useState<string | null>(null)
    const [activeModules, setActiveModules] = useState<string[]>([])

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
            let contactData: any = null

            if (conv.lead_id) {
                const { data: leadData } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('id', conv.lead_id)
                    .single()
                if (leadData) contactData = leadData
            }

            // Si también hay client_id, cargar datos del cliente para address/portal_short_token
            if (conv.client_id) {
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('id', conv.client_id)
                    .single()

                if (clientData) {
                    if (contactData) {
                        // Merge: lead base + client enrichment (address, portal token)
                        contactData = {
                            ...contactData,
                            address: clientData.address || contactData.address,
                            portal_short_token: clientData.portal_short_token,
                        }
                    } else {
                        // Solo client, mapear a lead shape
                        contactData = {
                            ...clientData,
                            title: clientData.name,
                            company: clientData.company_name,
                            status: 'client'
                        }
                    }
                }
            }

            setLead(contactData as any)

            const agentsResult = await getAgentsWorkload()
            if (agentsResult.success) {
                setAgents(agentsResult.data)
            }

            // Detect space type for conditional UI (portal token visibility)
            if (conv.organization_id) {
                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('active_app_id')
                    .eq('id', conv.organization_id)
                    .single()

                if (orgData?.active_app_id) {
                    const { data: appData } = await supabase
                        .from('saas_apps')
                        .select('space_category')
                        .eq('id', orgData.active_app_id)
                        .single()

                    setSpaceCategory(appData?.space_category || null)
                }

                try {
                    const { getActiveModules } = await import('@/modules/core/saas/actions')
                    const modules = await getActiveModules(conv.organization_id)
                    setActiveModules(modules)
                } catch (err) {
                    console.warn('Could not load active modules', err)
                }
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

    const contextChannelCounter = useRef(0)
    useEffect(() => {
        if (!conversationId) return

        contextChannelCounter.current += 1
        const channel = supabase
            .channel(`context-deck-${conversationId}-${contextChannelCounter.current}`)
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
            supabase.removeChannel(channel)
        }
    }, [conversationId])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="h-6 w-6 border-2 border-brand-pink border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground animate-pulse">{t('crm.inbox.context.loading')}</p>
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
                    <h3 className="font-semibold text-foreground">{t('crm.inbox.context.unknown_contact')}</h3>
                    <p className="text-sm text-muted-foreground max-w-[180px] mx-auto">{t('crm.inbox.context.no_lead_desc')}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-full px-6">{t('crm.inbox.context.create_lead')}</Button>
            </div>
        )
    }

    // Lead Initials
    const leadInitials = (lead.title || 'UN').slice(0, 2).toUpperCase()

    return (
        <div className="flex flex-col h-full bg-background/60 dark:bg-zinc-950/60 backdrop-blur-xl border-l border-white/10 dark:border-white/5 shadow-2xl z-20">
            {/* 1. Pill-Style Tabs Navigation */}
            <div className="px-4 py-3 border-b border-border/40 shrink-0">
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                    <button
                        onClick={() => setActiveTab('management')}
                        className={cn(
                            "flex-1 flex items-center justify-center py-1.5 text-xs font-semibold rounded-md transition-all",
                            activeTab === 'management'
                                ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('crm.inbox.context.tabs.management')}
                    </button>
                    <button
                        onClick={() => setActiveTab('replies')}
                        className={cn(
                            "flex-1 flex items-center justify-center py-1.5 text-xs font-semibold rounded-md transition-all",
                            activeTab === 'replies'
                                ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t('crm.inbox.context.tabs.replies')}
                    </button>
                    {activeModules.includes('module_catalog') && (
                        <button
                            onClick={() => setActiveTab('sales')}
                            className={cn(
                                "flex-1 flex items-center justify-center py-1.5 text-xs font-semibold rounded-md transition-all",
                                activeTab === 'sales'
                                    ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t('crm.inbox.context.tabs.sales')}
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Tab Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-background/30 relative">

                {/* TAB 1: GESTIÓN */}
                {activeTab === 'management' && (
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-6 animate-in fade-in duration-300 slide-in-from-left-2">

                            {/* Original Header Content Moved Here */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className="relative">
                                    <Avatar className="h-14 w-14 shadow-lg ring-2 ring-white/20 dark:ring-white/10">
                                        <AvatarImage src={(lead as any).avatar_url} className="object-cover" />
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-700 dark:text-indigo-300 font-bold text-lg">
                                            {leadInitials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-background shadow-sm" />
                                </div>
                                <div className="flex-1 min-w-0 py-1">
                                    <h2 className="text-lg font-bold truncate leading-tight tracking-tight">{lead.name || lead.title || t('crm.inbox.context.unknown_contact')}</h2>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <Badge variant="secondary" className="text-[10px] h-5 px-2 font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-0 shadow-sm">
                                            {lead.company || t('crm.inbox.context.particular')}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] h-5 px-2 font-medium border-zinc-200 dark:border-zinc-800 text-zinc-500">
                                            {lead.status === 'new' ? t('crm.inbox.context.new_badge') : lead.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            {/* Tags - Now using the unified TagsPicker */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                                    {t('crm.inbox.context.sections.tags') || 'Etiquetas'}
                                </h4>
                                <TagsPicker leadId={lead.id} organizationId={conversation?.organization_id} />
                            </div>

                            <Separator className="opacity-50" />

                            {/* Contact Info - Reordered to middle */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('crm.inbox.context.sections.contact_details')}</h4>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted" asChild>
                                        <Link href={`/crm?lead=${lead.id}`}><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></Link>
                                    </Button>
                                </div>

                                <div className="space-y-1.5">
                                    <ContactItem
                                        icon={conversation?.channel === 'instagram' ? User : Phone}
                                        label={conversation?.channel === 'instagram' ? 'Instagram ID' : conversation?.channel === 'messenger' ? 'Messenger ID' : t('crm.inbox.context.contact_fields.mobile')}
                                        value={lead.phone}
                                        t={t}
                                    />
                                    <ContactItem icon={Mail} label={t('crm.inbox.context.contact_fields.email')} value={lead.email} t={t} />
                                    <ContactItem
                                        icon={MapPin}
                                        label={t('crm.inbox.context.contact_fields.location')}
                                        value={(lead as any).address || t('crm.inbox.context.contact_fields.unknown_location')}
                                        t={t}
                                    />

                                    {/* Portal Token — Solo visible en Space Resto */}
                                    {spaceCategory === 'resto' && (lead as any).portal_short_token && (
                                        <PortalTokenItem
                                            token={(lead as any).portal_short_token}
                                            t={t}
                                        />
                                    )}
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            {/* Assignment Panel - Reordered to bottom */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{t('crm.inbox.context.sections.assignment')}</h4>
                                <div className="bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-white/20 dark:border-white/5 p-1 shadow-sm">
                                    <QuickAssignPanel
                                        conversationId={conversationId}
                                        channel={conversation?.channel}
                                        connectionId={conversation?.connection_id}
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
                {activeTab === 'sales' && (
                    <div className="flex flex-col h-full animate-in fade-in duration-300 slide-in-from-right-2">
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-4">
                                {/* Deal Value Hero */}
                                {/* Deal Value Hero - Simplified */}
                                <div className="px-1 py-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                            <DollarSign className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t('crm.inbox.context.sections.potential_value')}</div>
                                            <div className="text-2xl font-bold text-foreground font-mono tracking-tight">
                                                ${lead.value?.toLocaleString() || '0'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Deal Builder within ScrollArea */}
                                <DealBuilder
                                    leadId={lead.id}
                                    conversationId={conversationId}
                                    variant="sidebar"
                                    spaceCategory={spaceCategory}
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
                                className="w-full gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 bg-background/50 h-9"
                                onClick={() => setIsQuoteDesignerOpen(true)}
                            >
                                <Palette className="h-4 w-4" />
                                <span className="text-sm font-medium">{t('crm.inbox.context.quote_designer')}</span>
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
                spaceCategory={spaceCategory}
            />
            <SavedRepliesSheet
                open={isRepliesSheetOpen}
                onOpenChange={setIsRepliesSheetOpen}
            />
        </div>
    )
}

function ContactItem({ icon: Icon, label, value, t }: { icon: any, label: string, value?: string, t: any }) {
    if (!value) return null
    return (
        <div className="group flex items-center gap-3 p-1.5 rounded-md hover:bg-muted/50 transition-all cursor-pointer" onClick={() => {
            navigator.clipboard.writeText(value)
            toast.success(t('crm.inbox.context.actions.copied'))
        }}>
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-foreground/90">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-600 font-medium transition-opacity">
                {t('crm.inbox.context.actions.copy')}
            </span>
        </div>
    )
}

function PortalTokenItem({ token, t }: { token: string, t: any }) {
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/portal/${token}`

    const handleSendToChat = (e: React.MouseEvent) => {
        e.stopPropagation()
        // Dispatch event para que el inbox input lo recoja
        window.dispatchEvent(new CustomEvent('inbox-prefill-message', {
            detail: portalUrl
        }))
        toast.success('Enlace precargado en el chat')
    }

    return (
        <div className="group flex items-center gap-3 p-1.5 rounded-md hover:bg-muted/50 transition-all">
            <KeyRound className="h-4 w-4 text-muted-foreground group-hover:text-violet-500 transition-colors" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-foreground/90">Token de Portal</p>
                <p className="text-xs text-muted-foreground font-mono">{token}</p>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => {
                        navigator.clipboard.writeText(portalUrl)
                        toast.success(t('crm.inbox.context.actions.copied'))
                    }}
                    className="p-1 rounded hover:bg-muted transition-colors"
                    title="Copiar enlace"
                >
                    <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-indigo-500" />
                </button>
                <button
                    onClick={handleSendToChat}
                    className="p-1 rounded hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                    title="Enviar al chat"
                >
                    <Send className="h-3.5 w-3.5 text-muted-foreground hover:text-violet-500" />
                </button>
            </div>
        </div>
    )
}

"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { extractMetadata, COLORS, ICONS } from "../template-utils"
import { MessageSquare, Star, Heart, ThumbsUp, Zap, AlertCircle, CheckCircle, Clock, Search, FileText, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SmartRepliesPanel } from "./smart-replies-panel"
import { getTemplates, MessageTemplate } from "../actions/templates"
import { cn } from "@/modules/infrastructure/utils/utils"
import { useInboxContext } from "../context/inbox-context"


interface RepliesTabProps {
    conversationId: string
    lastIncomingMessage?: string
    onManageReplies: () => void
}

export function RepliesTab({ conversationId, lastIncomingMessage, onManageReplies }: RepliesTabProps) {
    const { t } = useTranslation()
    const { templates: globalTemplates, refreshTemplates, isTemplatesLoading } = useInboxContext()
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        if (globalTemplates.length === 0) {
            refreshTemplates()
        }
    }, [globalTemplates.length, refreshTemplates])


    // Las plantillas ahora se cargan una vez en el Layout global

    const filteredTemplates = useMemo(() => {
        return globalTemplates.filter((t: MessageTemplate) => {
            const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.content.toLowerCase().includes(searchQuery.toLowerCase())
            // Filter out 'UTILITY' category as requested
            const isNotUtility = t.category !== 'UTILITY'
            return matchesSearch && isNotUtility
        })
    }, [globalTemplates, searchQuery])

    const handleSelectTemplate = (content: string) => {
        const event = new CustomEvent('insert-smart-reply', { detail: content })
        window.dispatchEvent(event)
    }

    return (
        <div className="flex flex-col h-full min-h-0 space-y-4">
            {/* Search */}
            <div className="px-4 pt-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Buscar respuesta..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm bg-muted/40 border-transparent focus:bg-background focus:border-input transition-all"
                    />
                </div>
            </div>

            {/* Content Area */}
            <ScrollArea className="flex-1 px-4">
                <div className="space-y-4 pb-4">
                    {/* Saved Templates List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('crm.inbox.context.replies.saved_templates')}</h4>
                            <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] text-muted-foreground hover:text-foreground" onClick={onManageReplies}>
                                {t('crm.inbox.context.replies.manage')}
                            </Button>
                        </div>

                        {globalTemplates.length === 0 && isTemplatesLoading ? (
                            <div className="text-center py-8 text-muted-foreground text-xs animate-pulse italic">Cargando plantillas...</div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed border-border/40 rounded-xl bg-muted/10">
                                <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                                <p className="text-xs text-muted-foreground mb-2">No se encontraron plantillas</p>
                                <Button variant="outline" size="sm" className="h-7 text-xs border-dashed border-border/50" onClick={onManageReplies}>
                                    <Plus className="h-3 w-3 mr-1" /> Crear Nueva
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {filteredTemplates.map((template: MessageTemplate) => {
                                    const meta = extractMetadata(template.components)
                                    const colorDef = COLORS.find(c => c.id === (meta.color || 'gray')) || COLORS[0]
                                    const IconComponent = ICONS.find(i => i.id === (meta.icon || 'MessageSquare'))?.icon || MessageSquare

                                    return (
                                        <button
                                            key={template.id}
                                            onClick={() => handleSelectTemplate(template.content)}
                                            className={cn(
                                                "text-left group relative p-3 pl-5 rounded-xl transition-all overflow-hidden",
                                                "bg-white/40 dark:bg-white/5 border border-black/5 dark:border-white/5",
                                                "hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-white dark:hover:bg-white/10"
                                            )}
                                        >
                                            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", colorDef.class.split(' ').find(c => c.startsWith('border-l-'))?.replace('border-l-', 'bg-') || 'bg-gray-400')} />

                                            <div className="flex items-center gap-2 mb-1">
                                                <IconComponent className={cn("h-3.5 w-3.5 opacity-60", colorDef.text)} />
                                                <span className="font-medium text-xs text-foreground/90 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                                                    {template.name}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed opacity-90 pl-6">
                                                {template.content}
                                            </p>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Smart Replies at Bottom */}
            <div className="border-t border-border/40 bg-background/50 backdrop-blur-sm p-1">
                <SmartRepliesPanel
                    conversationId={conversationId}
                    lastIncomingMessage={lastIncomingMessage}
                    onSelectReply={() => { }}
                />
            </div>
        </div>
    )
}



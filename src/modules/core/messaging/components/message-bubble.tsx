"use client"

import { cn } from "@/lib/utils"
import { Check, CheckCheck, FileIcon, Volume2, Play } from "lucide-react"
import { AudioTranscriber } from "./audio-transcriber"
import { memo } from "react"

interface MessageContent {
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'note'
    text?: string
    url?: string
    caption?: string
    mimeType?: string
    filename?: string
}

interface MessageBubbleProps {
    content: MessageContent;
    direction: 'inbound' | 'outbound';
    timestamp: string;
    status?: 'sent' | 'delivered' | 'read' | 'failed';
    messageId?: string;
    metadata?: any;
}

import { useTranslation } from "@/lib/i18n/use-translation"

export const MessageBubble = memo(function MessageBubble({ content, direction, timestamp, status, messageId, metadata }: MessageBubbleProps) {
    const { t } = useTranslation()
    const isOutbound = direction === 'outbound'

    return (
        <div
            className={cn(
                "flex w-full mb-1",
                isOutbound ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "relative max-w-[80%] md:max-w-[65%] shadow-sm text-sm overflow-hidden",
                isOutbound
                    ? "bg-emerald-100 dark:bg-emerald-900 text-foreground rounded-2xl rounded-tr-none px-3 py-2"
                    : "bg-white dark:bg-zinc-800 text-foreground rounded-2xl rounded-tl-none px-3 py-2"
            )}>
                {/* Content Renderer */}
                <div className="mb-1">
                    {renderContent(content, isOutbound, messageId, metadata, t)}
                </div>

                {/* Footer: Timestamp & Status */}
                <div className={cn("flex items-center gap-1 select-none", isOutbound ? "justify-end" : "justify-end")}>
                    <span className="text-[10px] text-muted-foreground/80">
                        {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOutbound && (
                        <span className={cn(
                            "text-muted-foreground",
                            status === 'read' && "text-blue-500",
                            status === 'delivered' && "text-muted-foreground"
                        )}>
                            {status === 'read' ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
})

function renderContent(content: any, isOutbound: boolean, messageId?: string, metadata?: any, t?: any) {
    // Normalize content properties
    const url = content.url || content.mediaUrl || content.link;
    const text = content.text || content.caption || content.body;

    switch (content.type) {
        // ... (other cases)
        case 'note':
            return (
                <div className="flex flex-col gap-1 -mx-1 -my-1 p-2 bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                    <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-wider flex items-center gap-1">
                        📝 {t ? t('crm.inbox.chat.messages.internal_note') : 'Internal Note'}
                    </span>
                    <p className="whitespace-pre-wrap leading-relaxed text-[15px] italic text-yellow-900 dark:text-yellow-100">{text}</p>
                </div>
            )

        case 'text':
        default:
            return <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{text || (content as any).raw?.text?.body || (content as any).raw?.body || <span className="text-xs italic opacity-50">{t ? t('crm.inbox.chat.messages.no_visible_text') : 'Message with no visible text'}</span>}</p>
    }
}

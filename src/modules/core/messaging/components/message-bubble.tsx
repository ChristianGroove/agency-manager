"use client"

import { cn } from "@/lib/utils"
import { Check, CheckCheck, FileIcon, Volume2, Play } from "lucide-react"
import { AudioTranscriber } from "./audio-transcriber"
import { RestoOrderWidget } from "./resto-order-widget"
import { memo } from "react"

interface MessageContent {
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'note' | 'sticker' | 'system'
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
    const isSystem = content?.type === 'system'

    if (isSystem) {
        return (
            <div className="flex w-full justify-center my-4 px-4">
                <div className="bg-zinc-100 dark:bg-zinc-800/50 text-[11px] text-muted-foreground font-medium px-4 py-1.5 rounded-full border border-black/5 dark:border-white/5 uppercase tracking-wider text-center max-w-[85%]">
                    {content.text}
                </div>
            </div>
        )
    }

    return (
        <div
            className={cn(
                "flex w-full mb-1",
                isOutbound ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "relative max-w-[80%] md:max-w-[65%] shadow-sm text-sm overflow-hidden",
                content?.type === 'sticker' ? "bg-transparent shadow-none" : (
                    isOutbound
                        ? "bg-emerald-100 dark:bg-emerald-900 text-foreground rounded-2xl rounded-tr-none px-3 py-2"
                        : "bg-white dark:bg-zinc-800 text-foreground rounded-2xl rounded-tl-none px-3 py-2"
                )
            )}>
                {/* Content Renderer */}
                <div className="mb-1">
                    {renderContent({ content, isOutbound, messageId, metadata, t, status })}
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

function renderContent({ content, isOutbound, messageId, metadata, t, status }: {
    content: any,
    isOutbound: boolean,
    messageId?: string,
    metadata?: any,
    t?: any,
    status?: string
}) {
    // Normalizar propiedades del contenido
    const url = content.url || content.mediaUrl || content.link;
    const text = content.text || content.caption || content.body;

    // Inyección del Widget B2C
    if (metadata?.type === 'resto_order') {
        return <RestoOrderWidget messageId={messageId} orderData={metadata} isOutbound={isOutbound} status={status} />
    }

    switch (content.type) {
        case 'image':
            return (
                <div className="rounded-lg overflow-hidden my-1">
                    {/* Use standard img for now, optimize with Next/Image if valid domain */}
                    <img
                        src={url}
                        alt="Shared Image"
                        className="max-h-[300px] w-auto h-auto object-cover rounded-sm cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => window.open(url, '_blank')}
                    />
                    {text && <p className="mt-1 whitespace-pre-wrap">{text}</p>}
                </div>
            )

        case 'sticker':
            return (
                <div className="my-1 flex justify-center">
                    <img
                        src={url}
                        alt="Sticker"
                        className="w-32 h-32 md:w-40 md:h-40 object-contain bg-transparent select-none drop-shadow-sm"
                        draggable="false"
                        loading="lazy"
                    />
                </div>
            )

        case 'video':
            return (
                <div className="rounded-lg overflow-hidden my-1 max-w-sm">
                    <video
                        src={url}
                        controls
                        className="max-h-[300px] w-full bg-black rounded-sm"
                    />
                    {text && <p className="mt-1 whitespace-pre-wrap">{text}</p>}
                </div>
            )

        case 'audio':
            return (
                <div className="min-w-[200px] py-1">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                            <Volume2 className="h-4 w-4 text-blue-500" />
                        </div>
                        {/* Basic Audio Player */}
                        <audio controls src={url} className="h-8 w-[200px]" />
                    </div>
                    {/* AI Transcription */}
                    <AudioTranscriber
                        audioUrl={url}
                        messageId={messageId}
                        cachedTranscription={metadata?.transcription}
                        cachedAnalysis={metadata?.voice_analysis}
                    />
                </div>
            )

        case 'document':
            return (
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 bg-black/5 dark:bg-white/5 rounded-lg border hover:bg-black/10 transition-colors my-1">
                    <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center shrink-0">
                        <FileIcon className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-medium truncate text-xs">{content.filename || text || "Document"}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{content.mimeType?.split('/')[1] || 'FILE'}</span>
                    </div>
                </a>
            )

        case 'interactive_buttons':
        case 'interactive':
            const buttons = content.buttons || [];
            const header = content.header || metadata?.header;
            const footer = content.footer || metadata?.footer;

            return (
                <div className="flex flex-col gap-2 py-1">
                    {header && (
                        <div className="mb-1">
                            {header.type === 'text' ? (
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 h-fit leading-none mb-1">
                                    {header.text}
                                </span>
                            ) : header.mediaUrl ? (
                                <img src={header.mediaUrl} alt="Header" className="rounded-md max-h-40 w-full object-cover mb-2" />
                            ) : null}
                        </div>
                    )}

                    <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{text}</p>

                    {footer && (
                        <p className="text-[10px] text-muted-foreground italic mt-0.5">{footer}</p>
                    )}

                    {buttons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                            {buttons.map((btn: any) => (
                                <button
                                    key={btn.id}
                                    className="flex-1 min-w-[100px] py-1.5 px-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-xs font-medium text-center"
                                    onClick={() => console.log('Button clicked:', btn.id)} // Actions handled by webhook in backend
                                    disabled={true} // For now, buttons in chat history are just for preview
                                >
                                    {btn.title || btn.text || btn.displayText}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )

        // Note is now handled at the top level, but keep for safety/fallback if logic changes
        case 'note':
            return (
                <div className="flex flex-col gap-1 -mx-1 -my-1 p-2.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider">
                        {t ? t('crm.inbox.chat.note') : 'Note'}
                    </span>
                    <p className="whitespace-pre-wrap leading-relaxed text-[15px] italic text-zinc-600 dark:text-zinc-400">{text}</p>
                </div>
            )

        case 'system':
            return null; // Handled at early return in MessageBubble

        case 'text':
        default:
            return <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{text || (content as any).raw?.text?.body || (content as any).raw?.body || <span className="text-xs italic opacity-50">{t ? t('crm.inbox.layout.no_visible_text') : 'Message with no visible text'}</span>}</p>
    }
}

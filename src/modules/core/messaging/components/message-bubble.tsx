"use client"

import { cn } from "@/lib/utils"
import { Check, CheckCheck, FileIcon, Volume2, Play } from "lucide-react"

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
}

export function MessageBubble({ content, direction, timestamp, status }: MessageBubbleProps) {
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
                    {renderContent(content, isOutbound)}
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
}

function renderContent(content: any, isOutbound: boolean) {
    // Normalize content properties
    const url = content.url || content.mediaUrl || content.link;
    const text = content.text || content.caption || content.body;

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
                <div className="flex items-center gap-2 min-w-[200px] py-1">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Volume2 className="h-4 w-4 text-blue-500" />
                    </div>
                    {/* Basic Audio Player */}
                    <audio controls src={url} className="h-8 w-[200px]" />
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

        case 'note':
            return (
                <div className="flex flex-col gap-1 -mx-1 -my-1 p-2 bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                    <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-wider flex items-center gap-1">
                        📝 Internal Note
                    </span>
                    <p className="whitespace-pre-wrap leading-relaxed text-[15px] italic text-yellow-900 dark:text-yellow-100">{text}</p>
                </div>
            )

        case 'text':
        default:
            return <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{text}</p>
    }
}

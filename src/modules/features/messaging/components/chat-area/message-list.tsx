import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
import { Message } from "@/modules/features/messaging/hooks/use-chat-logic"
import { MessageBubble } from "../message-bubble"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { ForwardedRef, forwardRef } from "react"

interface MessageListProps {
    messages: Message[]
    loadingOlder: boolean
    hasMoreMessages: boolean
    onLoadOlder: () => void
}

export const MessageList = forwardRef((
    { messages, loadingOlder, hasMoreMessages, onLoadOlder }: MessageListProps,
    ref: ForwardedRef<VirtuosoHandle>
) => {
    const { t } = useTranslation()

    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                <p className="text-sm">{t('crm.inbox.chat.no_messages')}</p>
            </div>
        )
    }

    return (
        <Virtuoso
            ref={ref}
            className="scrollbar-thin"
            style={{ height: '100%' }}
            totalCount={messages.length}
            data={messages}
            firstItemIndex={1000000 - messages.length}
            initialTopMostItemIndex={1000000 - 1}
            computeItemKey={(index, item) => item.id}
            alignToBottom
            followOutput="auto"
            atBottomThreshold={50}
            startReached={() => {
                if (hasMoreMessages && !loadingOlder) onLoadOlder()
            }}
            components={{
                Header: () => loadingOlder ? (
                    <div className="flex justify-center py-3">
                        <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    </div>
                ) : hasMoreMessages ? (
                    <div className="flex justify-center py-2">
                        <span className="text-[10px] text-muted-foreground/50">Scroll para cargar más</span>
                    </div>
                ) : null
            }}
            itemContent={(index: number, msg: Message) => {
                const localIndex = messages.indexOf(msg)
                const currentDate = msg?.created_at ? new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : ''
                const prevMsg = localIndex > 0 ? messages[localIndex - 1] : null
                const prevDate = prevMsg?.created_at ? new Date(prevMsg.created_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : null
                const showDateSeparator = currentDate !== prevDate && currentDate !== ''

                let content: any = msg.content
                if (typeof content !== 'object' || content === null) {
                    content = { type: 'text', text: String(content) }
                } else if (!content.type && content.text) {
                    content = { type: 'text', text: content.text }
                }

                if (content.mediaUrl && !content.url) {
                    content.url = content.mediaUrl
                }

                return (
                    <div className="px-2 md:px-8 py-1 max-w-[1400px] mx-auto w-full">
                        {showDateSeparator && (
                            <div className="flex justify-center my-4 opacity-100">
                                <div className="bg-black/5 dark:bg-white/5 text-muted-foreground text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-medium">
                                    {currentDate}
                                </div>
                            </div>
                        )}
                        <MessageBubble
                            content={content}
                            direction={msg.direction as 'inbound' | 'outbound'}
                            timestamp={msg.created_at}
                            status={msg.status as any}
                            messageId={msg.id}
                            metadata={msg.metadata}
                        />
                    </div>
                )
            }}
        />
    )
})

MessageList.displayName = "MessageList"

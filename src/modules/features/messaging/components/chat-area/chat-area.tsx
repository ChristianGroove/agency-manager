"use client"

import { useRef, useState, useEffect } from "react"
import { VirtuosoHandle } from "react-virtuoso"
import { useChatLogic } from "@/modules/features/messaging/hooks/use-chat-logic"
import { useChatActions } from "@/modules/features/messaging/hooks/use-chat-actions"
import { ChatHeader } from "./chat-header"
import { MessageList } from "./message-list"
import { ChatInput } from "./chat-input"
import { SavedRepliesSheet } from "../saved-replies-sheet"
import { TemplatePickerSheet } from "../template-picker-sheet"
import { LeadStageStepper } from "./lead-stage-stepper"

interface ChatAreaProps {
    conversationId: string
    isContextOpen: boolean
    onToggleContext: () => void
}

export function ChatArea({ conversationId, isContextOpen, onToggleContext }: ChatAreaProps) {
    const virtuosoRef = useRef<VirtuosoHandle>(null)
    const [inputValue, setInputValue] = useState("")
    
    // UI Modal State
    const [isRepliesSheetOpen, setIsRepliesSheetOpen] = useState(false)
    const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false)

    // Logic Hooks
    const logic = useChatLogic(conversationId)
    const actions = useChatActions({
        conversationId,
        conversation: logic.conversation,
        setMessages: logic.setMessages,
        onScrollToBottom: (index) => {
            requestAnimationFrame(() => {
                virtuosoRef.current?.scrollToIndex({
                    index: index !== undefined ? index : logic.messages.length - 1,
                    align: 'end',
                    behavior: 'smooth'
                })
            })
        }
    })

    // Listen for Smart Reply insertions
    useEffect(() => {
        const handleInsertSmartReply = (event: CustomEvent<string>) => {
            setInputValue(event.detail)
            setTimeout(() => {
                const textarea = document.querySelector('textarea')
                if (textarea) {
                    textarea.focus()
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
                }
            }, 50)
        }
        window.addEventListener('insert-smart-reply' as any, handleInsertSmartReply as any)
        window.addEventListener('inbox-prefill-message' as any, handleInsertSmartReply as any)
        return () => {
            window.removeEventListener('insert-smart-reply' as any, handleInsertSmartReply as any)
            window.removeEventListener('inbox-prefill-message' as any, handleInsertSmartReply as any)
        }
    }, [])

    // Listen for product card preparation
    useEffect(() => {
        const handlePrepareProduct = (event: CustomEvent<any>) => {
            actions.setPendingProduct(event.detail)
            setTimeout(() => {
                const textarea = document.querySelector('textarea')
                if (textarea) textarea.focus()
            }, 50)
        }
        window.addEventListener('inbox-prepare-product' as any, handlePrepareProduct as any)
        return () => window.removeEventListener('inbox-prepare-product' as any, handlePrepareProduct as any)
    }, [actions])

    return (
        <div className="flex flex-col h-full bg-[#efeae2] dark:bg-zinc-950/30 overflow-hidden relative">
            <SavedRepliesSheet
                open={isRepliesSheetOpen}
                onOpenChange={setIsRepliesSheetOpen}
                onSelect={(content) => setInputValue(content)}
            />

            <TemplatePickerSheet
                open={isTemplatePickerOpen}
                onOpenChange={setIsTemplatePickerOpen}
                conversationId={conversationId}
                onSent={() => logic.fetchMessages()}
            />

            <ChatHeader
                conversation={logic.conversation}
                conversationId={conversationId}
                isContextOpen={isContextOpen}
                onToggleContext={onToggleContext}
                callStatus={logic.callStatus}
                incomingCall={logic.incomingCall}
                setIncomingCall={logic.setIncomingCall}
                setIsTemplatePickerOpen={setIsTemplatePickerOpen}
                onSendInteractiveCall={() => actions.handleSend({
                    inputValue: "",
                    setInputValue: () => {},
                    contentOverride: "¿Podemos hablar por llamada?",
                    type: "interactive_call_request" as any
                })}
            />

            <div className="flex-1 min-h-0 bg-background/50 relative">
                <div
                    className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:invert dark:opacity-[0.05]"
                    style={{
                        backgroundImage: "url('/inbox-pattern.svg')",
                        backgroundSize: "auto 100%",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center"
                    }}
                />

                {/* Tactical Lead Stage Stepper - Top Center Positioning */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
                    {logic.conversation?.leads && (
                        <LeadStageStepper 
                            leadId={logic.conversation.leads.id}
                            leadStatus={logic.conversation.leads.status}
                        />
                    )}
                </div>
                
                <MessageList
                    ref={virtuosoRef}
                    messages={logic.messages}
                    loadingOlder={logic.loadingOlder}
                    hasMoreMessages={logic.hasMoreMessages}
                    onLoadOlder={logic.loadOlderMessages}
                />
            </div>

            <ChatInput
                inputValue={inputValue}
                setInputValue={(val) => {
                    setInputValue(val)
                    if (val === '/') { setIsRepliesSheetOpen(true); setInputValue(''); }
                }}
                sending={actions.sending}
                uploading={actions.uploading}
                isInternal={actions.isInternal}
                setIsInternal={actions.setIsInternal}
                isRefining={actions.isRefining}
                pendingAttachment={actions.pendingAttachment}
                setPendingAttachment={actions.setPendingAttachment}
                pendingProduct={actions.pendingProduct}
                setPendingProduct={actions.setPendingProduct}
                onSend={(override, type, url) => actions.handleSend({ inputValue, setInputValue, contentOverride: override, type, mediaUrl: url })}
                onSendLocation={() => actions.handleSend({ inputValue, setInputValue, type: 'location', location: { latitude: 0, longitude: 0 } })} // Location handled inside action normally or via helper
                onAudioSend={actions.handleAudioSend}
                onFileSelect={actions.handleFileSelect}
                onRefine={() => actions.handleRefine(inputValue, setInputValue)}
                onTemplatePickerOpen={() => setIsTemplatePickerOpen(true)}
            />
        </div>
    )
}

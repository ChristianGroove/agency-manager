import { useState } from "react"
import { supabase } from "@/modules/core/database/supabase"
import { MessageContentType } from "@/types/messaging"
import { sendMessage, sendProductCardMessage } from "../actions/messages"
import { MESSAGING_STORAGE_BUCKET } from "../constants"
import { refineDraftContent } from "../ai/smart-replies"
import { Message, Conversation } from "./use-chat-logic"
import { toast } from "sonner"
import { useTranslation } from "@/modules/core/i18n/use-translation"

export function useChatActions(params: {
    conversationId: string,
    conversation: Conversation | null,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    onScrollToBottom: (index?: number) => void
}) {
    const { conversationId, conversation, setMessages, onScrollToBottom } = params
    const { t } = useTranslation()

    // Sending State
    const [sending, setSending] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isInternal, setIsInternal] = useState(false)
    const [isRefining, setIsRefining] = useState(false)
    const [pendingAttachment, setPendingAttachment] = useState<{ url: string, type: MessageContentType, name: string } | null>(null)
    const [pendingProduct, setPendingProduct] = useState<any | null>(null)

    const handleSend = async (params: {
        inputValue: string,
        setInputValue: (val: string) => void,
        contentOverride?: string,
        type?: MessageContentType,
        mediaUrl?: string,
        location?: { latitude: number, longitude: number, address?: string },
        extraContent?: any
    }) => {
        const { inputValue, setInputValue, contentOverride, type = 'text', mediaUrl, location, extraContent } = params
        
        let finalType = type
        let finalMediaUrl = mediaUrl

        if (contentOverride === undefined && !mediaUrl && !location && pendingAttachment) {
            finalType = pendingAttachment.type
            finalMediaUrl = pendingAttachment.url
        }

        const textContent = contentOverride !== undefined ? contentOverride : inputValue.trim()
        if (!textContent && !finalMediaUrl && !location && !sending && !pendingProduct) return

        if (!finalMediaUrl && !location) {
            setInputValue("")
        }

        if (finalMediaUrl === pendingAttachment?.url) {
            setPendingAttachment(null)
            setInputValue("")
        }

        const currentPendingProduct = pendingProduct
        if (currentPendingProduct) {
            setPendingProduct(null)
            setInputValue("")
        }

        setSending(true)

        let messageContent: any
        let isInteractiveProduct = false

        if (currentPendingProduct) {
            isInteractiveProduct = true
            const parts = [`*${currentPendingProduct.name.toUpperCase()}*`]
            if (currentPendingProduct.description) parts.push(`\n${currentPendingProduct.description}`)
            
            const features = currentPendingProduct.metadata?.portal_card?.features || []
            if (Array.isArray(features) && features.length > 0) {
                const featureList = features.map((f: string) => f?.trim() ? `âœ… ${f.trim()}` : '').filter(Boolean).join('\n')
                if (featureList) parts.push(`\n*CARACTERÃSTICAS*\n${featureList}`)
            }
            parts.push(`\n*Precio:* $${currentPendingProduct.base_price?.toLocaleString() || 'N/A'}`)
            if (textContent && textContent.trim()) parts.push(`\n---\n_${textContent.trim()}_`)

            const bodyContent = parts.join('\n')
            if (currentPendingProduct.image_url) {
                messageContent = { type: 'image', mediaUrl: currentPendingProduct.image_url, caption: bodyContent }
            } else {
                messageContent = { type: 'text', text: bodyContent }
            }
        } else if (isInternal) {
            messageContent = { type: 'note', text: textContent, url: finalMediaUrl, originalType: finalType }
        } else {
            if (finalType === 'text') {
                messageContent = { type: 'text', text: textContent }
            } else if (finalType === 'location' && location) {
                messageContent = { type: 'location', latitude: location.latitude, longitude: location.longitude, address: location.address || 'Ubicación' }
            } else {
                messageContent = { type: finalType, mediaUrl: finalMediaUrl, url: finalMediaUrl, caption: textContent, filename: finalType === 'document' ? (pendingAttachment?.name || textContent) : undefined, ...(extraContent || {}) }
            }
        }

        const optimisticId = crypto.randomUUID()
        const optimisticMsg: Message = {
            id: optimisticId,
            conversation_id: conversationId,
            direction: 'outbound',
            channel: conversation?.channel || 'whatsapp',
            content: messageContent,
            status: 'sent',
            external_id: null,
            sender: 'Agent',
            metadata: {},
            created_at: new Date().toISOString()
        }

        setMessages(prev => [...prev, optimisticMsg])
        onScrollToBottom()

        try {
            let result;
            if (isInteractiveProduct) {
                result = await sendProductCardMessage(conversationId, currentPendingProduct, 'Agent', optimisticId, textContent)
            } else {
                result = await sendMessage(conversationId, messageContent, 'Agent', optimisticId)
            }

            if (!result.success) {
                setMessages(prev => prev.filter(m => m.id !== optimisticId))
                toast.error(t('crm.inbox.chat.actions.chat_error'), { description: (result as any).error || t('crm.inbox.layout.unknown') })
            } else {
                // If the human agent sent a message, instantly remove the bot icon locally
                window.dispatchEvent(new CustomEvent('pixy:conversation-bot-disabled', { detail: { conversationId } }))
            }
        } catch (error) {
            console.error("Failed to send", error)
            setMessages(prev => prev.filter(m => m.id !== optimisticId))
        } finally {
            setSending(false)
        }
    }

    const handleAudioSend = async (blob: Blob, duration: number, mimeType: string) => {
        setUploading(true)
        try {
            const isWhatsApp = conversation?.channel === 'whatsapp' || (conversation as any)?.integration_connections?.provider_key?.includes('whatsapp');
            let finalBlob = blob;
            let ext = 'webm';
            let mime = 'audio/webm';

            if (isWhatsApp) {
                const { convertWebmToOgg } = await import("@/modules/infrastructure/audio/services/webm-to-ogg")
                finalBlob = await convertWebmToOgg(blob)
                ext = 'ogg'; mime = 'audio/ogg';
            } else {
                try {
                    const { convertWebmToWav } = await import("@/modules/infrastructure/audio/services/webm-to-wav")
                    finalBlob = await convertWebmToWav(blob)
                    ext = 'wav'; mime = 'audio/wav';
                } catch (wavErr) {
                    if (mimeType.includes('mp4')) { ext = 'm4a'; mime = 'audio/mp4'; }
                    else if (mimeType.includes('webm')) { ext = 'webm'; mime = 'audio/webm'; }
                }
            }
            
            const orgId = conversation?.organization_id
            const fileName = `${conversationId}/audio/${Date.now()}.${ext}`
            const { error: uploadError } = await supabase.storage.from(MESSAGING_STORAGE_BUCKET).upload(fileName, finalBlob, { contentType: mime })
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from(MESSAGING_STORAGE_BUCKET).getPublicUrl(fileName)
            await handleSend({ inputValue: "", setInputValue: () => {}, type: 'audio', mediaUrl: publicUrl })
        } catch (error: any) {
            toast.error("Error al enviar audio: " + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleFileSelect = async (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            toast.error(t('crm.inbox.chat.actions.file_too_large'))
            return
        }
        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop() || 'png'
            const fileName = `${conversationId}/${Math.random().toString(36).substring(2)}.${fileExt}`
            const { error: uploadError } = await supabase.storage.from(MESSAGING_STORAGE_BUCKET).upload(fileName, file)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from(MESSAGING_STORAGE_BUCKET).getPublicUrl(fileName)
            let type: MessageContentType = 'document'
            if (file.type.startsWith('image/')) type = 'image'
            else if (file.type.startsWith('video/')) type = 'video'
            else if (file.type.startsWith('audio/')) type = 'audio'

            setPendingAttachment({ url: publicUrl, type, name: file.name })
        } catch (error) {
            toast.error(t('crm.inbox.chat.actions.upload_failed'))
        } finally {
            setUploading(false)
        }
    }

    const handleRefine = async (inputValue: string, setInputValue: (val: string) => void) => {
        if (!inputValue || inputValue.length < 5) return
        setIsRefining(true)
        try {
            const result = await refineDraftContent(inputValue)
            if (result.success && result.refined) {
                setInputValue(result.refined)
                toast.success(t('crm.inbox.chat.actions.refine_ai_success'), { icon: "âœ¨" })
            } else {
                toast.error(t('crm.inbox.chat.actions.refine_ai_error'))
            }
        } catch (error) {
            toast.error(t('crm.inbox.chat.actions.ai_error'))
        } finally {
            setIsRefining(false)
        }
    }

    return {
        sending,
        uploading,
        isInternal,
        setIsInternal,
        isRefining,
        pendingAttachment,
        setPendingAttachment,
        pendingProduct,
        setPendingProduct,
        handleSend,
        handleAudioSend,
        handleFileSelect,
        handleRefine
    }
}

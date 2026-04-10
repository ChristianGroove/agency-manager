import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Smile, Paperclip, FileText, Image, MapPin, Mic, Send, X, Package, Wand2 } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { useRef, useEffect, useState } from "react"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { EmojiStickerPicker } from "../emoji-sticker-picker"
import { AudioRecorder } from "../audio-recorder"

interface ChatInputProps {
    inputValue: string
    setInputValue: (val: string) => void
    sending: boolean
    uploading: boolean
    isInternal: boolean
    setIsInternal: (val: boolean) => void
    isRefining: boolean
    pendingAttachment: any
    setPendingAttachment: (val: any) => void
    pendingProduct: any
    setPendingProduct: (val: any) => void
    onSend: (override?: string, type?: any, mediaUrl?: string) => void
    onSendLocation: () => void
    onAudioSend: (blob: Blob, duration: number, mimeType: string) => void
    onFileSelect: (file: File) => void
    onRefine: () => void
    onTemplatePickerOpen: () => void
}

export function ChatInput({
    inputValue,
    setInputValue,
    sending,
    uploading,
    isInternal,
    setIsInternal,
    isRefining,
    pendingAttachment,
    setPendingAttachment,
    pendingProduct,
    setPendingProduct,
    onSend,
    onSendLocation,
    onAudioSend,
    onFileSelect,
    onRefine,
    onTemplatePickerOpen
}: ChatInputProps) {
    const { t } = useTranslation()
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [isRecordingAudio, setIsRecordingAudio] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            const newHeight = Math.min(textareaRef.current.scrollHeight, 120)
            textareaRef.current.style.height = `${newHeight}px`
        }
    }, [inputValue])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
        }
    }

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile()
                if (file) {
                    onFileSelect(new File([file], `pasted-${Date.now()}.png`, { type: file.type }))
                    e.preventDefault()
                    break
                }
            }
        }
    }

    return (
        <div className={cn("p-3 bg-white dark:bg-zinc-900 border-t relative z-20 min-h-[80px] flex", isRecordingAudio ? "items-center" : "items-end gap-2")}>
            {isRecordingAudio ? (
                <AudioRecorder onSend={(b, d, m) => { onAudioSend(b, d, m); setIsRecordingAudio(false); }} onCancel={() => setIsRecordingAudio(false)} />
            ) : (
                <>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 flex justify-center">
                        <Button variant="ghost" size="sm" onClick={() => setIsInternal(!isInternal)} className={cn("rounded-full shadow-sm border h-7 text-xs font-semibold px-4 transition-all", isInternal ? "bg-zinc-900 text-white transform scale-105" : "bg-white/80 text-muted-foreground")}>
                            {isInternal ? t('crm.inbox.chat.note_mode') : t('crm.inbox.chat.note')}
                        </Button>
                    </div>

                    {showEmojiPicker && (
                        <EmojiStickerPicker onClose={() => setShowEmojiPicker(false)} onEmojiClick={(e) => setInputValue(inputValue + e.emoji)} onStickerSelect={(url) => { onSend('Sticker', 'sticker', url); setShowEmojiPicker(false); }} />
                    )}

                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                            <Smile className="h-6 w-6" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground" disabled={uploading}>
                                    <Paperclip className={cn("h-5 w-5", uploading && "animate-pulse")} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-zinc-900 border shadow-xl mb-2">
                                <DropdownMenuItem className="gap-3" onClick={() => fileInputRef.current?.click()}><FileText className="h-4 w-4 text-orange-500" /><span>Documento</span></DropdownMenuItem>
                                <DropdownMenuItem className="gap-3" onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = "image/*,video/*"; fileInputRef.current.click(); } }}><Image className="h-4 w-4 text-blue-500" /><span>Fotos y videos</span></DropdownMenuItem>
                                <DropdownMenuItem className="gap-3" onClick={onSendLocation}><MapPin className="h-4 w-4 text-green-500" /><span>Ubicación</span></DropdownMenuItem>
                                <DropdownMenuItem className="gap-3" onClick={() => setIsRecordingAudio(true)}><Mic className="h-4 w-4 text-red-500" /><span>Voz</span></DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} />

                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground" onClick={onTemplatePickerOpen}>
                            <FileText className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex-1 relative">
                        {pendingAttachment && (
                            <div className="absolute -top-24 left-0 bg-white dark:bg-zinc-800 p-2 rounded-xl shadow-lg border flex items-center gap-3 z-30">
                                <div className="h-16 w-16 bg-zinc-100 rounded-lg overflow-hidden flex items-center justify-center border">
                                    {pendingAttachment.type === 'image' ? <img src={pendingAttachment.url} className="h-full w-full object-cover" /> : <FileText className="h-8 w-8 text-muted-foreground" />}
                                </div>
                                <span className="text-[11px] font-medium truncate max-w-[150px]">{pendingAttachment.name}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingAttachment(null)}><X className="h-3 w-3" /></Button>
                            </div>
                        )}

                        {pendingProduct && (
                            <div className="absolute -top-32 left-0 right-0 max-w-sm bg-white dark:bg-zinc-800 p-2 rounded-xl shadow-lg border flex items-start gap-4 z-30 mx-auto">
                                <div className="h-20 w-20 bg-zinc-100 rounded-lg overflow-hidden flex items-center justify-center border shrink-0">
                                    {pendingProduct.image_url ? <img src={pendingProduct.image_url} className="h-full w-full object-cover" /> : <Package className="h-8 w-8 text-muted-foreground" />}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <div className="flex justify-between"><span className="text-xs font-semibold truncate">{pendingProduct.name}</span><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setPendingProduct(null)}><X className="h-3 w-3" /></Button></div>
                                    <span className="text-[10px] text-muted-foreground line-clamp-2">{pendingProduct.description}</span>
                                    <Badge variant="secondary" className="mt-auto self-start text-[9px]">${pendingProduct.base_price?.toLocaleString()}</Badge>
                                </div>
                            </div>
                        )}

                        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center px-4 py-2 focus-within:bg-zinc-50 transition-all">
                            <Textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder={t('crm.inbox.chat.input_placeholder')}
                                className="min-h-[24px] max-h-[120px] w-full border-none shadow-none focus-visible:ring-0 p-0 bg-transparent resize-none leading-relaxed"
                                rows={1}
                            />
                            {inputValue.length > 5 && (
                                <Button variant="ghost" size="icon" onClick={onRefine} disabled={isRefining} className="h-6 w-6 ml-2 text-purple-600 animate-in zoom-in">
                                    <Wand2 className={cn("h-4 w-4", isRefining && "animate-spin")} />
                                </Button>
                            )}
                        </div>
                    </div>

                    <Button
                        size="icon"
                        className={cn("h-10 w-10 shrink-0 rounded-full shadow-md transition-all", (inputValue.trim() || uploading || pendingAttachment || pendingProduct) ? "bg-emerald-600 text-white scale-105" : "bg-zinc-100 text-muted-foreground")}
                        onClick={() => onSend()}
                        disabled={sending || (!inputValue.trim() && !uploading && !pendingAttachment && !pendingProduct)}
                    >
                        <Send className="h-5 w-5 ml-0.5" />
                    </Button>
                </>
            )}
        </div>
    )
}

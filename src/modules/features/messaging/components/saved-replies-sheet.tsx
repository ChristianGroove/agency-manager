"use client"

import { useEffect, useState, useRef } from "react"
import { MessageTemplate, getTemplates, createTemplate, updateTemplate, deleteTemplate, TemplateComponent } from "../actions/templates"
import { extractMetadata, COLORS, ICONS } from "../template-utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Star, Trash2, Edit2, Save, X, Smile, Reply, ArrowLeft, Zap, MessageSquare, FileText, Check } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"
import { Label } from "@/components/ui/label"
import { refineDraftContent } from "../actions/ai"
import dynamic from "next/dynamic"
import { useTranslation } from "@/modules/core/i18n/use-translation"

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface SavedRepliesSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect?: (content: string) => void
}

export function SavedRepliesSheet({ open, onOpenChange, onSelect }: SavedRepliesSheetProps) {
    const { t } = useTranslation()
    const [replies, setReplies] = useState<MessageTemplate[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [editingReply, setEditingReply] = useState<Partial<MessageTemplate> | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isRefining, setIsRefining] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const emojiPickerRef = useRef<HTMLDivElement>(null)

    // Click outside to close emoji picker
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    // UI Metadata State
    const [uiMeta, setUiMeta] = useState({ color: 'gray', icon: 'MessageSquare' })

    useEffect(() => {
        if (open) {
            refreshReplies()
        }
    }, [open])

    // Load metadata when editing starts
    useEffect(() => {
        if (editingReply && editingReply.components) {
            const meta = extractMetadata(editingReply.components)
            setUiMeta({
                color: meta.color || 'gray',
                icon: meta.icon || 'MessageSquare'
            })
        } else {
            // Reset to defaults for new items
            setUiMeta({ color: 'gray', icon: 'MessageSquare' })
        }
    }, [editingReply])

    const refreshReplies = () => {
        setIsLoading(true)
        getTemplates().then(data => {
            setReplies(data)
            setIsLoading(false)
        })
    }

    const handleEmojiClick = (emojiData: any) => {
        setEditingReply(prev => ({
            ...prev,
            content: (prev?.content || "") + emojiData.emoji
        }))
    }

    const handleRefine = async () => {
        if (!editingReply?.content || editingReply.content.length < 5) {
            toast.error(t('crm.inbox.chat.templates.refine_min_chars'))
            return
        }

        setIsRefining(true)
        try {
            const result = await refineDraftContent(editingReply.content)
            if (result.success && result.refined) {
                setEditingReply(prev => ({ ...prev, content: result.refined }))
                toast.success(t('crm.inbox.chat.templates.refined'))
            } else {
                toast.error(t('crm.inbox.chat.templates.save_error') + ": " + result.error)
            }
        } catch (error) {
            toast.error(t('crm.inbox.chat.actions.ai_error'))
        } finally {
            setIsRefining(false)
        }
    }

    const handleSave = async () => {
        if (!editingReply?.name || !editingReply?.content) {
            toast.error(t('crm.inbox.chat.templates.save_error'))
            return
        }

        const components: TemplateComponent[] = [
            { type: 'BODY', format: 'TEXT', text: editingReply.content || '' },
            {
                type: 'UI_METADATA',
                format: 'JSON',
                text: JSON.stringify(uiMeta)
            }
        ]

        try {
            if (editingReply.id) {
                await updateTemplate(editingReply.id, {
                    name: editingReply.name,
                    category: editingReply.category || 'MARKETING',
                    components
                })
            } else {
                await createTemplate({
                    name: editingReply.name!,
                    category: editingReply.category || 'MARKETING',
                    language: 'es',
                    components
                })
            }

            toast.success(t('crm.inbox.chat.templates.save_success'))
            refreshReplies()
            setEditingReply(null)
            setIsCreating(false)
        } catch (error) {
            toast.error(t('crm.inbox.chat.templates.save_error'))
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm(t('crm.inbox.chat.templates.delete_confirm'))) {
            await deleteTemplate(id)
            refreshReplies()
            toast.success(t('crm.inbox.chat.templates.delete_success'))
            if (editingReply?.id === id) {
                setEditingReply(null)
                setIsCreating(false)
            }
        }
    }

    const filteredReplies = replies.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // View Mode
    const isEditorOpen = isCreating || !!editingReply

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">

                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            {isEditorOpen ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="-ml-2 text-gray-500 hover:text-gray-900"
                                    onClick={() => { setEditingReply(null); setIsCreating(false); }}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            ) : (
                                <div className="p-2 bg-brand-pink/10 rounded-lg text-brand-pink">
                                    <FileText className="h-5 w-5" />
                                </div>
                            )}

                            <div>
                                <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                                    {isEditorOpen ? (editingReply?.id ? t('crm.inbox.chat.templates.edit') : t('crm.inbox.chat.templates.new')) : t('crm.inbox.chat.templates.title')}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {isEditorOpen ? t('crm.inbox.chat.templates.configure') : t('crm.inbox.chat.templates.manage')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative">
                        {isEditorOpen ? (
                            // EDITOR VIEW
                            <ScrollArea className="h-full p-6">
                                <div className="space-y-6 max-w-lg mx-auto pb-20">
                                    {/* Name Input */}
                                    <div className="space-y-2">
                                        <Label>{t('crm.inbox.chat.templates.name')}</Label>
                                        <Input
                                            placeholder={t('crm.inbox.chat.templates.name_placeholder')}
                                            className="h-12 text-lg font-medium"
                                            value={editingReply?.name || ""}
                                            onChange={e => setEditingReply(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>

                                    {/* Appearance Section */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('crm.inbox.chat.templates.color')}</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {COLORS.map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => setUiMeta(prev => ({ ...prev, color: c.id }))}
                                                        className={cn(
                                                            "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                                                            c.bg,
                                                            uiMeta.color === c.id ? "border-indigo-600 scale-110 shadow-sm" : "border-transparent hover:scale-105"
                                                        )}
                                                        title={c.label}
                                                    >
                                                        {uiMeta.color === c.id && <Check className="h-4 w-4 text-indigo-700" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('crm.inbox.chat.templates.icon')}</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {ICONS.map(i => {
                                                    const IconC = i.icon
                                                    return (
                                                        <button
                                                            key={i.id}
                                                            onClick={() => setUiMeta(prev => ({ ...prev, icon: i.id }))}
                                                            className={cn(
                                                                "w-9 h-9 rounded-lg border transition-all flex items-center justify-center",
                                                                uiMeta.icon === i.id ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-gray-100 text-gray-400 hover:bg-gray-50"
                                                            )}
                                                            title={i.label}
                                                        >
                                                            <IconC className="h-5 w-5" />
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-2">
                                        <Label>{t('crm.inbox.chat.templates.content')}</Label>
                                        <div className="relative border rounded-xl bg-gray-50/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                                            <Textarea
                                                placeholder={t('crm.inbox.chat.templates.content_placeholder')}
                                                className="min-h-[150px] resize-none text-base leading-relaxed p-4 bg-transparent border-none focus-visible:ring-0"
                                                value={editingReply?.content || ""}
                                                onChange={e => setEditingReply(prev => ({ ...prev, content: e.target.value }))}
                                                disabled={isRefining}
                                            />
                                            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                                                <div className="relative" ref={emojiPickerRef}>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-amber-500 hover:bg-amber-50"
                                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                    >
                                                        <Smile className="h-5 w-5" />
                                                    </Button>
                                                    {showEmojiPicker && (
                                                        <div className="absolute bottom-10 left-0 z-50 shadow-xl rounded-xl border border-gray-100">
                                                            <EmojiPicker
                                                                onEmojiClick={handleEmojiClick}
                                                                lazyLoadEmojis={true}
                                                                searchDisabled={false}
                                                                width={300}
                                                                height={350}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                    onClick={handleRefine}
                                                    disabled={isRefining}
                                                >
                                                    {isRefining ? t('crm.inbox.chat.templates.polishing') : t('crm.inbox.chat.templates.ai_improve')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delete Zone */}
                                    {editingReply?.id && (
                                        <div className="pt-6 border-t flex justify-center">
                                            <Button
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(editingReply.id!)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                {t('crm.inbox.chat.templates.delete_confirm')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        ) : (
                            // LIST VIEW
                            <div className="flex flex-col h-full">
                                {/* Search Bar */}
                                <div className="px-6 pb-4 bg-white/50 backdrop-blur-sm z-10">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('common.search')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-xl"
                                        />
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 px-6 pb-6">
                                    <div className="grid gap-3 pb-20">
                                        {/* Create New Button (Inline) */}
                                        <button
                                            onClick={() => { setIsCreating(true); setEditingReply({}); }}
                                            className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group w-full text-left"
                                        >
                                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-50 group-hover:bg-indigo-100 text-gray-400 group-hover:text-indigo-600 transition-colors">
                                                <Plus className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm text-gray-900 group-hover:text-indigo-700">{t('crm.inbox.chat.templates.create_new')}</h4>
                                                <p className="text-xs text-muted-foreground">{t('crm.inbox.chat.templates.add_library')}</p>
                                            </div>
                                        </button>

                                        {filteredReplies.map(reply => {
                                            const meta = extractMetadata(reply.components || [])
                                            const colorDef = COLORS.find(c => c.id === (meta.color || 'gray')) || COLORS[0]
                                            const IconDef = ICONS.find(i => i.id === (meta.icon || 'MessageSquare')) || ICONS[0]
                                            const IconC = IconDef.icon

                                            return (
                                                <div
                                                    key={reply.id}
                                                    onClick={() => isEditorOpen ? null : onSelect?.(reply.content)}
                                                    className={cn(
                                                        "group relative flex flex-col gap-3 p-4 rounded-xl border bg-white hover:shadow-lg transition-all cursor-pointer",
                                                        colorDef.class.replace('border-l-4', 'border-l-[6px]'), // Emphasize the color strip
                                                        "border-gray-100 hover:border-indigo-200"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("p-2 rounded-lg h-9 w-9 flex items-center justify-center", colorDef.bg)}>
                                                                <IconC className={cn("h-5 w-5", colorDef.text)} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-semibold text-sm text-gray-900">{reply.name}</h4>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                                    {reply.content}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={(e) => { e.stopPropagation(); setEditingReply(reply); }}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>

                    {/* Footer - Only visible in Editor mode usually, or global actions */}
                    {isEditorOpen && (
                        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-end z-20 gap-3">
                            <Button variant="ghost" onClick={() => { setEditingReply(null); setIsCreating(false); }}>
                                {t('common.cancel')}
                            </Button>
                            <Button onClick={handleSave} className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-lg shadow-gray-200">
                                <Save className="mr-2 h-4 w-4" />
                                {t('common.save')}
                            </Button>
                        </div>
                    )}

                </div>
            </SheetContent>
        </Sheet>
    )
}

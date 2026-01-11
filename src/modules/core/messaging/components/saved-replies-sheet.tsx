"use client"

import { useEffect, useState } from "react"
import { MessageTemplate, getTemplates, createTemplate, updateTemplate, deleteTemplate } from "../template-actions"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Star, Trash2, Edit2, Save, X, Smile, Reply, ArrowLeft, Zap, MessageSquare, FileText } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
// import dynamic from "next/dynamic" // Emoji picker removed for now as icon is not in schema
import { Label } from "@/components/ui/label"
import { refineDraftContent } from "../ai/actions"

// const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface SavedRepliesSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect?: (content: string) => void
}

export function SavedRepliesSheet({ open, onOpenChange, onSelect }: SavedRepliesSheetProps) {
    const [replies, setReplies] = useState<MessageTemplate[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [editingReply, setEditingReply] = useState<Partial<MessageTemplate> | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isRefining, setIsRefining] = useState(false)

    useEffect(() => {
        if (open) {
            refreshReplies()
        }
    }, [open])

    const refreshReplies = () => {
        setIsLoading(true)
        getTemplates().then(data => {
            setReplies(data)
            setIsLoading(false)
        })
    }

    const handleRefine = async () => {
        if (!editingReply?.content || editingReply.content.length < 5) {
            toast.error("Enter at least a few words first.")
            return
        }

        setIsRefining(true)
        try {
            const result = await refineDraftContent(editingReply.content)
            if (result.success && result.refined) {
                setEditingReply(prev => ({ ...prev, content: result.refined }))
                toast.success("Polished by AI! ✨")
            } else {
                toast.error("Could not refine: " + result.error)
            }
        } catch (error) {
            toast.error("AI Error")
        } finally {
            setIsRefining(false)
        }
    }

    const handleSave = async () => {
        if (!editingReply?.name || !editingReply?.content) {
            toast.error("Please fill in name and content")
            return
        }

        try {
            if (editingReply.id) {
                await updateTemplate(editingReply.id, {
                    name: editingReply.name,
                    category: editingReply.category || 'MARKETING',
                    components: [{ type: 'BODY', format: 'TEXT', text: editingReply.content || '' }]
                })
            } else {
                await createTemplate({
                    name: editingReply.name!,
                    category: editingReply.category || 'MARKETING',
                    language: 'es',
                    components: [{ type: 'BODY', format: 'TEXT', text: editingReply.content! }]
                })
            }

            toast.success("Saved successfully!")
            refreshReplies()
            setEditingReply(null)
            setIsCreating(false)
        } catch (error) {
            toast.error("Failed to save")
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this template?")) {
            await deleteTemplate(id)
            refreshReplies()
            toast.success("Deleted")
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
                <SheetHeader className="hidden">
                    <SheetTitle>Message Templates</SheetTitle>
                    <SheetDescription>Manage saved replies</SheetDescription>
                </SheetHeader>

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
                                    {isEditorOpen ? (editingReply?.id ? 'Edit Template' : 'New Template') : 'Message Templates'}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {isEditorOpen ? 'Configure content and category.' : 'Manage your quick replies.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative">
                        {isEditorOpen ? (
                            // EDITOR VIEW
                            <ScrollArea className="h-full p-6">
                                <div className="space-y-6 max-w-lg mx-auto">
                                    {/* Name Input */}
                                    <div className="space-y-2">
                                        <Label>Name (Title)</Label>
                                        <Input
                                            placeholder="e.g. Welcome Message"
                                            className="h-12 text-lg font-medium"
                                            value={editingReply?.name || ""}
                                            onChange={e => setEditingReply(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-2">
                                        <Label>Message Content</Label>
                                        <div className="relative">
                                            <Textarea
                                                placeholder="Type your message here..."
                                                className="min-h-[200px] resize-none text-base leading-relaxed p-4 bg-gray-50/30 focus:bg-white transition-colors"
                                                value={editingReply?.content || ""}
                                                onChange={e => setEditingReply(prev => ({ ...prev, content: e.target.value }))}
                                                disabled={isRefining}
                                            />
                                            <div className="absolute bottom-2 right-2 flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    onClick={handleRefine}
                                                    disabled={isRefining}
                                                >
                                                    {isRefining ? 'Polishing...' : 'AI Improve ✨'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delete Zone */}
                                    {editingReply?.id && (
                                        <div className="pt-8 border-t flex justify-center">
                                            <Button
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => handleDelete(editingReply.id!)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Template
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
                                            placeholder="Search templates..."
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
                                                <h4 className="font-semibold text-sm text-gray-900 group-hover:text-indigo-700">Create New Template</h4>
                                                <p className="text-xs text-muted-foreground">Add to your library.</p>
                                            </div>
                                        </button>

                                        {filteredReplies.map(reply => (
                                            <div
                                                key={reply.id}
                                                onClick={() => isEditorOpen ? null : onSelect?.(reply.content)}
                                                className="group relative flex flex-col gap-3 p-4 rounded-xl border bg-white border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl bg-gray-50 p-2 rounded-lg h-10 w-10 flex items-center justify-center border border-gray-100">
                                                            📄
                                                        </span>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-semibold text-sm text-gray-900">{reply.name}</h4>
                                                            </div>
                                                            <div className="flex gap-2 mt-0.5">
                                                                <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md">
                                                                    {reply.category || 'MARKETING'}
                                                                </span>
                                                            </div>
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
                                                <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50">
                                                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                                        {reply.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>

                    {/* Footer - Only visible in Editor mode usually, or global actions */}
                    {isEditorOpen && (
                        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-end z-20 gap-3">
                            <Button variant="ghost" onClick={() => { setEditingReply(null); setIsCreating(false); }}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-lg shadow-gray-200">
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Cambios
                            </Button>
                        </div>
                    )}

                    <div className="absolute top-1/2 left-0 -translate-x-full">
                        {/* Close X outside if needed, but Sheet handles overlay click */}
                    </div>

                </div>
            </SheetContent>
        </Sheet>
    )
}

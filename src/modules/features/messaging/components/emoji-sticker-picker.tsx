"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { X, Upload, Trash2, Loader2, ImagePlus } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { convertToWhatsAppSticker } from "@/modules/infrastructure/meta/services/sticker-converter"
import { uploadSticker, getStickersGallery, deleteSticker } from "../sticker-actions"
import { toast } from "sonner"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { useTheme } from "next-themes"

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface EmojiStickerPickerProps {
    onClose: () => void
    onEmojiClick: (emojiData: any) => void
    onStickerSelect: (url: string) => void
}

export function EmojiStickerPicker({ onClose, onEmojiClick, onStickerSelect }: EmojiStickerPickerProps) {
    const { t } = useTranslation()
    const { theme, systemTheme } = useTheme()
    const currentTheme = theme === 'system' ? systemTheme : theme

    const [activeTab, setActiveTab] = useState('emoji')
    const [stickers, setStickers] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [deletingUrl, setDeletingUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load stickers when tab switches to 'sticker' for the first time
    useEffect(() => {
        if (activeTab === 'sticker' && stickers.length === 0) {
            loadStickers()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])

    const loadStickers = async () => {
        setIsLoading(true)
        try {
            const { urls, error } = await getStickersGallery()
            if (error) throw new Error(error)
            setStickers(urls)
        } catch (error: any) {
            console.error("Failed to load stickers:", error)
            toast.error("Error al cargar la galería de stickers")
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            // 1. Client-side conversion to strict 512x512 WebP (<100KB)
            const stickerBlob = await convertToWhatsAppSticker(file)

            // 2. Upload to Supabase using Server Action
            const formData = new FormData()
            formData.append("file", stickerBlob)

            const { url, error } = await uploadSticker(formData)

            if (error || !url) throw new Error(error || "Upload failed")

            // 3. Update Gallery
            setStickers(prev => [url, ...prev])
            toast.success("Sticker añadido a la galería")

        } catch (error: any) {
            console.error("Sticker conversion/upload failed:", error)
            toast.error("Error al procesar el sticker. Intenta con otra imagen.")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDelete = async (e: React.MouseEvent, url: string) => {
        e.stopPropagation() // prevent sending sticker
        setDeletingUrl(url)
        try {
            const { error } = await deleteSticker(url)
            if (error) throw new Error(error)
            setStickers(prev => prev.filter(s => s !== url))
            toast.success("Sticker eliminado")
        } catch (err) {
            console.error(err)
            toast.error("Error al eliminar el sticker")
        } finally {
            setDeletingUrl(null)
        }
    }

    return (
        <div className="absolute bottom-16 left-2 z-50 shadow-2xl border border-gray-100 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 w-[350px] min-h-[460px] animate-in slide-in-from-bottom-2 fade-in duration-200">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between p-2 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-gray-100/50 dark:bg-zinc-800/50 rounded-lg">
                        <TabsTrigger value="emoji" className="rounded-md text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm">
                            {t('crm.inbox.chat.emojis') || 'Emojis'}
                        </TabsTrigger>
                        <TabsTrigger value="sticker" className="rounded-md text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-sm">
                            {t('crm.inbox.chat.stickers') || 'Stickers'}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <Button size="icon" variant="ghost" className="h-8 w-8 ml-2 text-gray-400 hover:text-gray-900 shrink-0 rounded-full" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Content Area */}
            <div className="h-[400px] w-full relative">

                {/* Emoji Tab */}
                <div className={cn("absolute inset-0 transition-opacity duration-200", activeTab === 'emoji' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
                    <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        width="100%"
                        height="400px"
                        searchDisabled={true}
                        skinTonesDisabled={true}
                        theme={(currentTheme === 'dark' ? 'dark' : 'light') as any}
                        style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}
                    />
                </div>

                {/* Sticker Tab */}
                <div className={cn("absolute inset-0 bg-white dark:bg-zinc-900 transition-opacity duration-200 flex flex-col", activeTab === 'sticker' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>

                    {/* Add New Sticker Button (Sticky Top) */}
                    <div className="p-3 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button
                            variant="outline"
                            className="w-full border-dashed border-gray-300 dark:border-zinc-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-zinc-800 transition-all text-xs h-10"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin text-indigo-500" /> Convirtiendo...</>
                            ) : (
                                <><ImagePlus className="h-4 w-4 mr-2 text-indigo-500" /> Crear Sticker (Auto-Convertir)</>
                            )}
                        </Button>
                    </div>

                    {/* Stickers Grid */}
                    <div className="flex-1 overflow-y-auto p-3">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
                            </div>
                        ) : stickers.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
                                <div className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-full">
                                    <ImagePlus className="h-6 w-6 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Sin Stickers</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sube cualquier imagen JPG/PNG. Se convertirá automáticamente a Sticker.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-3">
                                {stickers.map((url, idx) => (
                                    <div
                                        key={idx}
                                        className="relative aspect-square rounded-xl bg-gray-50 dark:bg-zinc-800 border-2 border-transparent hover:border-indigo-400 dark:hover:border-zinc-500 cursor-pointer group transition-all p-1 flex items-center justify-center overflow-hidden"
                                        onClick={() => onStickerSelect(url)}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={url}
                                            alt="Sticker"
                                            className="w-full h-full object-contain pointer-events-none drop-shadow-sm group-hover:scale-110 transition-transform duration-200"
                                        />

                                        {/* Discreet Delete Button (Visible only on hover) */}
                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 rounded-full bg-white/90 dark:bg-zinc-900/90 shadow-sm border border-gray-100 dark:border-zinc-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 dark:hover:bg-red-950 dark:hover:text-red-400"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(t('common.confirm_delete') || "¿Eliminar sticker?")) {
                                                        handleDelete(e, url);
                                                    }
                                                }}
                                                disabled={deletingUrl === url}
                                            >
                                                {deletingUrl === url ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <X className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

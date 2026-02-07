"use client"

import { useState, useRef } from "react"
import { Loader2, Upload, X, FileText, Video, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface MediaUploadProps {
    value?: string | null
    onChange: (url: string, type?: string, name?: string) => void
    onUpload: (formData: FormData) => Promise<{ success: boolean; url: string; type: string; name: string }>
    disabled?: boolean
    label?: string
    className?: string
    compact?: boolean
    acceptedTypes?: string[] // e.g. ['image/*', 'video/*']
    maxSizeMB?: number
}

export function MediaUpload({
    value,
    onChange,
    onUpload,
    disabled,
    label = "Subir Archivo",
    className,
    compact = false,
    acceptedTypes = ['image/*', 'video/*', 'application/pdf'],
    maxSizeMB = 10
}: MediaUploadProps) {
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Helper to determine type from URL if not provided (basic check)
    const getFileType = (url: string) => {
        const ext = url.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
        if (['mp4', 'webm', 'ogg', 'mov'].includes(ext || '')) return 'video';
        if (['pdf'].includes(ext || '')) return 'pdf';
        return 'unknown';
    }

    const fileType = value ? getFileType(value) : null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Client-side validation
        if (file.size > maxSizeMB * 1024 * 1024) {
            toast.error(`El archivo excede el límite de ${maxSizeMB}MB`)
            return
        }

        setIsUploading(true)
        const formData = new FormData()
        formData.append("file", file)

        try {
            const result = await onUpload(formData)
            if (result.success && result.url) {
                onChange(result.url, result.type, result.name)
                toast.success("Archivo subido correctamente")
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Error al subir el archivo")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const handleRemove = () => {
        onChange("", "", "")
    }

    return (
        <div className={cn("w-full space-y-2", className)}>
            <div
                className={cn(
                    "relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-all",
                    disabled ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50" : "cursor-pointer hover:bg-slate-50/50 border-slate-300 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30",
                    compact ? "p-2 min-h-[80px]" : "p-4 min-h-[140px]"
                )}
                onClick={() => !disabled && !value && fileInputRef.current?.click()}
            >
                {/* Preview State */}
                {value ? (
                    <div className="relative w-full h-full flex items-center justify-center group">
                        {fileType === 'image' && (
                            <div className={cn("relative w-full flex items-center justify-center", compact ? "h-16" : "h-32")}>
                                <img
                                    src={value}
                                    alt="Preview"
                                    className="h-full w-full object-contain rounded-md"
                                />
                            </div>
                        )}

                        {fileType === 'video' && (
                            <div className="flex flex-col items-center justify-center text-slate-500">
                                <Video className={cn(compact ? "h-6 w-6" : "h-10 w-10", "text-blue-500")} />
                                {!compact && <span className="text-xs mt-2 text-center break-all px-2 max-w-full truncate">{value.split('/').pop()}</span>}
                            </div>
                        )}

                        {fileType === 'pdf' && (
                            <div className="flex flex-col items-center justify-center text-slate-500">
                                <FileText className={cn(compact ? "h-6 w-6" : "h-10 w-10", "text-red-500")} />
                                {!compact && <span className="text-xs mt-2 text-center px-2 max-w-full truncate">Documento PDF</span>}
                            </div>
                        )}

                        {fileType === 'unknown' && (
                            <div className="flex flex-col items-center justify-center text-slate-500">
                                <FileText className={cn(compact ? "h-6 w-6" : "h-10 w-10", "text-slate-400")} />
                                {!compact && <span className="text-xs mt-2 text-center px-2 max-w-full truncate">Archivo</span>}
                            </div>
                        )}

                        {/* Remove Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleRemove()
                            }}
                            disabled={disabled}
                            className="absolute -top-3 -right-3 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-1 rounded-full shadow-sm hover:bg-red-200 dark:hover:bg-red-900 transition-colors z-10"
                            type="button"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ) : (
                    /* Upload State */
                    <div className="flex flex-col items-center justify-center space-y-2 text-center">
                        {isUploading ? (
                            <Loader2 className={cn("animate-spin text-purple-600", compact ? "h-5 w-5" : "h-8 w-8")} />
                        ) : (
                            <>
                                <div className={cn("bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center", compact ? "p-2" : "p-3")}>
                                    <Upload className={cn("text-purple-600 dark:text-purple-400", compact ? "h-4 w-4" : "h-5 w-5")} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className={cn("font-medium text-slate-700 dark:text-slate-300", compact ? "text-xs" : "text-sm")}>
                                        {label}
                                    </p>
                                    {!compact && (
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                            Click para explorar
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={acceptedTypes.join(',')}
                onChange={handleFileChange}
                disabled={disabled || isUploading}
            />
        </div>
    )
}

"use client"

import { useState, useRef } from "react"
import { Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { uploadBrandingAsset, deleteBrandingAsset } from "@/modules/core/branding/actions"

interface ImageUploadProps {
    value?: string | null
    onChange: (url: string) => void
    disabled?: boolean
    label?: string
    className?: string
    bucket?: string
    compact?: boolean
}

export function ImageUpload({
    value,
    onChange,
    disabled,
    label = "Subir Imagen",
    className,
    bucket = "public-assets",
    compact = false
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append("file", file)
        formData.append("bucket", bucket)

        try {
            const result = await uploadBrandingAsset(formData)
            if (result.success && result.url) {
                onChange(result.url)
                toast.success("Imagen subida correctamente")
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Error al subir la imagen")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const handleRemove = async (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()

        const previousUrl = value

        // 1. Inmediato cambio visual sin demoras
        onChange("")
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }

        // 2. Eliminación física en segundo plano en Supabase Storage para evitar basura
        if (previousUrl) {
            try {
                const res = await deleteBrandingAsset(previousUrl)
                if (res.success) {
                    toast.success("Imagen eliminada de almacenamiento")
                }
            } catch (error) {
                console.warn("[ImageUpload] Error al eliminar imagen de storage:", error)
            }
        }
    }

    return (
        <div className={`space-y-4 w-full ${className}`}>
            <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl border-gray-200 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors relative group ${compact ? 'p-2 min-h-[100px]' : 'p-4 min-h-[150px]'}`}>

                {value ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className={`relative w-full ${compact ? 'h-20' : 'h-32'}`}>
                            <img
                                src={value}
                                alt="Previsualización de imagen"
                                className="h-full w-full object-contain rounded-lg"
                            />
                        </div>
                        <button
                            onClick={handleRemove}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-90 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-20 cursor-pointer"
                            type="button"
                            title="Eliminar imagen definitivamente"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ) : (
                    <div
                        className="flex flex-col items-center justify-center cursor-pointer space-y-2 w-full h-full py-2"
                        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                    >
                        {isUploading ? (
                            <div className="flex flex-col items-center justify-center space-y-2">
                                <Loader2 className={`text-primary animate-spin ${compact ? 'h-5 w-5' : 'h-8 w-8'}`} />
                                <span className="text-xs text-gray-500 animate-pulse">Subiendo archivo...</span>
                            </div>
                        ) : (
                            <>
                                <div className={`bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-gray-100 dark:border-zinc-700 ${compact ? 'p-2' : 'p-3'}`}>
                                    <Upload className={`text-primary ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
                                </div>
                                <div className="text-center">
                                    <p className={`font-semibold text-gray-700 dark:text-zinc-300 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</p>
                                    {!compact && <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, SVG hasta 5MB</p>}
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
                accept="image/*"
                onChange={handleFileChange}
                disabled={disabled || isUploading}
            />
        </div>
    )
}

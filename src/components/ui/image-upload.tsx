"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { uploadBrandingAsset } from "@/modules/core/branding/actions"

interface ImageUploadProps {
    value?: string | null
    onChange: (url: string) => void
    disabled?: boolean
    label?: string
    className?: string
    bucket?: string
}

export function ImageUpload({
    value,
    onChange,
    disabled,
    label = "Subir Imagen",
    className,
    bucket = "branding"
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
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const handleRemove = () => {
        onChange("")
    }

    return (
        <div className={`space-y-4 w-full ${className}`}>
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors min-h-[160px] relative group">

                {value ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="relative h-32 w-full">
                            <img
                                src={value}
                                alt="Upload preview"
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleRemove()
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            type="button"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <div
                        className="flex flex-col items-center justify-center cursor-pointer space-y-2 p-4 w-full h-full"
                        onClick={() => !disabled && fileInputRef.current?.click()}
                    >
                        {isUploading ? (
                            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                        ) : (
                            <>
                                <div className="p-3 bg-white rounded-full shadow-sm">
                                    <Upload className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-700">{label}</p>
                                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG hasta 5MB</p>
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

            {/* Helper URL Input (Optional fallback) */}
            {/* <div className="text-xs text-gray-400 text-center truncate px-4">
                {value || "Sin imagen seleccionada"}
            </div> */}
        </div>
    )
}

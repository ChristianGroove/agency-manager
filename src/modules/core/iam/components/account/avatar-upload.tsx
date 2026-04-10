"use client"

import { useState, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { uploadAvatar } from "@/modules/core/auth/actions"
import { useRouter } from "next/navigation"

interface AvatarUploadProps {
    currentUrl?: string | null
    fullName?: string | null
    userId: string
    align?: "center" | "left"
    layout?: "vertical" | "horizontal"
    showLabel?: boolean
}

export function AvatarUpload({ currentUrl, fullName, userId, align = "center", layout = "vertical", showLabel = true }: AvatarUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentUrl || null)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 1. Optimistic UI
        const objectUrl = URL.createObjectURL(file)
        setPreview(objectUrl)
        setIsUploading(true)

        // 2. Prepare Form Data
        const formData = new FormData()
        formData.append("file", file)

        try {
            // 3. Upload via Server Action
            const result = await uploadAvatar(formData)
            if (result.success) {
                toast.success("Avatar actualizado correctamente")
                router.refresh() // Refresh to update Sidebar
            }
        } catch (error: any) {
            toast.error(error.message || "Error al subir imagen")
            setPreview(currentUrl || null) // Revert on error
        } finally {
            setIsUploading(false)
        }
    }

    const initials = fullName
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "ME"

    if (layout === "horizontal") {
        return (
            <div className="flex items-center gap-5">
                <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                    <Avatar className="h-16 w-16 border-2 border-gray-100 shadow-sm transition-opacity group-hover:opacity-90">
                        <AvatarImage src={preview || ""} className="object-cover" />
                        <AvatarFallback className="text-lg bg-indigo-50 text-indigo-600 font-bold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
                    </div>

                    {/* Loading Overlay */}
                    {isUploading && (
                        <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-start gap-1">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    {showLabel && (
                        <p className="text-[10px] text-muted-foreground">
                            Clic para cambiar<br />Máx. 5MB
                        </p>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={`flex flex-col gap-4 ${align === "center" ? "items-center text-center" : "items-start text-left"}`}>
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar className={`border-4 border-white shadow-lg group-hover:opacity-90 transition-opacity ${align === "center" ? "h-32 w-32" : "h-24 w-24"}`}>
                    <AvatarImage src={preview || ""} className="object-cover" />
                    <AvatarFallback className="text-2xl bg-indigo-100 text-indigo-600">
                        {initials}
                    </AvatarFallback>
                </Avatar>

                {/* Hover Overlay */}
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                </div>

                {/* Loading Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                )}
            </div>

            <div className={align === "center" ? "text-center" : "text-left"}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    Cambiar Foto
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground mt-2">
                    Máximo 5MB. PNG, JPG, GIF.
                </p>
            </div>
        </div>
    )
}

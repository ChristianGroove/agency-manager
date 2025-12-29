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
}

export function AvatarUpload({ currentUrl, fullName, userId, align = "center" }: AvatarUploadProps) {
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

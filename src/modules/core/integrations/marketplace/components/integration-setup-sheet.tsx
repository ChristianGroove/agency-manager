"use client"

import { IntegrationProvider, InstalledIntegration } from "../types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Check, Crown, Loader2, Shield } from "lucide-react"
import { installIntegration } from "../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"

interface IntegrationSetupSheetProps {
    provider: IntegrationProvider | null
    existingConnection?: InstalledIntegration
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function IntegrationSetupSheet({
    provider,
    existingConnection,
    isOpen,
    onOpenChange
}: IntegrationSetupSheetProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [credentials, setCredentials] = useState<Record<string, string>>({})
    const [connectionName, setConnectionName] = useState("")

    // Reset state when provider changes
    useEffect(() => {
        if (isOpen && provider) {
            setCredentials(existingConnection?.credentials || {})
            setConnectionName(existingConnection?.connection_name || provider.name)
        }
    }, [isOpen, provider, existingConnection])

    if (!provider) return null

    const schema = provider.config_schema
    const requiredFields = schema?.required || []
    const properties = schema?.properties || {}

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const result = await installIntegration({
                providerKey: provider.key,
                connectionName,
                credentials
            })

            if (result.success) {
                toast.success("Integración conectada", {
                    description: `${provider.name} se ha configurado correctamente`
                })
                onOpenChange(false)
                router.refresh()
            } else {
                toast.error("Error al conectar", {
                    description: result.error
                })
            }
        } catch (error: any) {
            toast.error("Error", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    const isFormValid = requiredFields.every(field => credentials[field]?.trim())

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-xl w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <SheetHeader className="hidden">
                    <SheetTitle>{provider.name}</SheetTitle>
                    <SheetDescription>{provider.description}</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner">
                                {provider.is_premium ? (
                                    <Crown className="h-5 w-5 text-amber-500" />
                                ) : (
                                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                    {provider.name}
                                    {provider.is_premium && (
                                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-2 h-5">
                                            Premium
                                        </Badge>
                                    )}
                                </h2>
                                <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                                    {provider.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-8">
                        <div className="space-y-6 max-w-lg mx-auto">
                            {/* Already Connected Banner */}
                            {existingConnection && (
                                <div className="rounded-2xl border border-green-500/20 bg-green-50/50 p-5 backdrop-blur-sm">
                                    <h4 className="flex items-center gap-2 font-bold text-green-700 mb-1">
                                        <Check className="h-4 w-4 bg-green-500 text-white rounded-full p-0.5" />
                                        Conexión Activa
                                    </h4>
                                    <p className="text-sm text-green-700/80 pl-6">
                                        Configurada actualmente como <span className="font-semibold">{existingConnection.connection_name}</span>.
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Connection Name */}
                                <div className="space-y-3">
                                    <Label htmlFor="connectionName" className="text-base font-semibold text-gray-900">
                                        Nombre para esta conexión
                                    </Label>
                                    <Input
                                        id="connectionName"
                                        value={connectionName}
                                        onChange={(e) => setConnectionName(e.target.value)}
                                        placeholder="Ej: Mi WhatsApp Principal"
                                        className="h-12 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-xl"
                                    />
                                    <p className="text-xs text-muted-foreground px-1">
                                        Usa un nombre que te ayude a identificarla fácilmente.
                                    </p>
                                </div>

                                {/* Dynamic Credential Fields */}
                                {Object.entries(properties).map(([key, field]) => (
                                    <div key={key} className="space-y-3">
                                        <Label htmlFor={key} className="text-base font-semibold text-gray-900 flex items-center justify-between">
                                            <span>
                                                {field.title}
                                                {requiredFields.includes(key) && (
                                                    <span className="text-brand-pink ml-1">*</span>
                                                )}
                                            </span>
                                            {field.description && (
                                                <span className="text-xs font-normal text-muted-foreground">{field.description}</span>
                                            )}
                                        </Label>

                                        {(field as any).enum ? (
                                            <select
                                                id={key}
                                                value={credentials[key] || field.default || ''}
                                                onChange={(e) => setCredentials({ ...credentials, [key]: e.target.value })}
                                                className="h-12 w-full bg-gray-50/50 border border-gray-200 focus:bg-white transition-all rounded-xl px-3 text-sm"
                                            >
                                                <option value="" disabled>Selecciona una opción</option>
                                                {(field as any).enum.map((option: string) => (
                                                    <option key={option} value={option}>
                                                        {option === 'daily' ? 'Diario (00:00 UTC)' :
                                                            option === 'weekly' ? 'Semanal (Lunes)' :
                                                                option === 'manual_only' ? 'Solo Manual' :
                                                                    option}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <Input
                                                id={key}
                                                type={key.toLowerCase().includes('secret') || key.toLowerCase().includes('token') || key.toLowerCase().includes('key') ? 'password' : 'text'}
                                                value={credentials[key] || ''}
                                                onChange={(e) => setCredentials({ ...credentials, [key]: e.target.value })}
                                                placeholder={`Ingresa ${field.title}`}
                                                required={requiredFields.includes(key)}
                                                className="h-12 bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-xl font-mono text-sm"
                                            />
                                        )}
                                    </div>
                                ))}

                                {/* Security Note */}
                                <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 mt-8">
                                    <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm text-gray-500">
                                        <Shield className="h-4 w-4" />
                                    </div>
                                    <div className="text-xs text-muted-foreground pt-1">
                                        <p className="font-semibold text-gray-900 mb-0.5">Seguridad Encriptada</p>
                                        <p>Tus credenciales se cifran antes de guardarse en base de datos. Nadie las puede ver.</p>
                                    </div>
                                </div>

                                {/* Documentation Link */}
                                {provider.documentation_url && (
                                    <div className="text-center pt-2">
                                        <a
                                            href={provider.documentation_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-medium text-brand-pink hover:text-brand-pink/80 hover:underline transition-colors block py-2"
                                        >
                                            Leer guía de configuración oficial →
                                        </a>
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-6 border-t border-gray-100 flex items-center justify-between z-20">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl px-6"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit} // Using onClick instead of type="submit" because form is inside div now, wait. Need to wrap inputs/button or just call function.
                            disabled={!isFormValid || isLoading}
                            className="bg-brand-pink text-white hover:bg-brand-pink/90 shadow-xl shadow-gray-900/10 px-8 rounded-xl h-11 font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Conectando...
                                </>
                            ) : existingConnection ? (
                                'Guardar Cambios'
                            ) : (
                                'Conectar Ahora'
                            )}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

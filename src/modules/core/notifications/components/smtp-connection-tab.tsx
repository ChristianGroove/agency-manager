"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Globe, Mail, Lock, Server, Trash2, Plug, Play, Loader2 } from "lucide-react"
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert" 
import { saveSmtpConfig, deleteSmtpConfig, SmtpConfigFull } from "@/modules/core/notifications/actions/smtp-actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface SmtpConnectionTabProps {
    organizationId: string
    initialConfig?: SmtpConfigFull | null
}

const PROVIDERS = {
    gmail: {
        name: "Gmail / G-Suite",
        host: "smtp.gmail.com",
        port: 465,
        icon: Mail,
        help: "Usa tu correo completo y una 'Contraseña de Aplicación' (App Password) si tienes 2FA activado."
    },
    outlook: {
        name: "Outlook / Office 365",
        host: "smtp.office365.com",
        port: 587,
        icon: Globe, // Microsoft icon replacement
        help: "Usa tu correo y contraseña. Puede requerir habilitar SMTP Authenticated en Admin Center."
    },
    zoho: {
        name: "Zoho Mail",
        host: "smtp.zoho.com",
        port: 465,
        icon: Mail,
        help: "Usa SSL en puerto 465."
    },
    custom: {
        name: "Otro / Personalizado",
        host: "",
        port: 465,
        icon: Server,
        help: "Consuluta la configuración SMTP de tu hosting (cPanel, AWS SES, etc)."
    }
}

export function SmtpConnectionTab({ organizationId, initialConfig }: SmtpConnectionTabProps) {
    const [config, setConfig] = useState<Partial<SmtpConfigFull>>(initialConfig || {
        provider: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        user_email: '',
        from_email: '',
        from_name: '',
        is_verified: false
    })

    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Fill defaults when provider changes
    const handleProviderChange = (providerKey: string) => {
        const p = PROVIDERS[providerKey as keyof typeof PROVIDERS]
        setConfig(prev => ({
            ...prev,
            provider: providerKey as any,
            host: p.host,
            port: p.port
        }))
    }

    const handleSave = async () => {
        if (!config.user_email || !config.host || !config.port) {
            toast.error("Por favor completa los campos requeridos")
            return
        }
        if (!initialConfig && !password) {
            toast.error("La contraseña es requerida para la primera conexión")
            return
        }

        setLoading(true)
        try {
            const result = await saveSmtpConfig({
                ...config as SmtpConfigFull,
                organization_id: organizationId
            }, password)

            if (result.success) {
                toast.success("Conexión SMTP exitosa y guardada")
                setConfig(prev => ({ ...prev, is_verified: true }))
                setPassword("") // Clear for security
            } else {
                toast.error(result.error || "Error al conectar")
            }
        } catch (e) {
            console.error(e)
            toast.error("Error inesperado")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro? Volverás a usar el sistema de envío por defecto.")) return

        setIsDeleting(true)
        try {
            await deleteSmtpConfig(organizationId)
            setConfig({
                provider: 'gmail',
                host: 'smtp.gmail.com',
                port: 465,
                user_email: '',
                from_email: '',
                from_name: '',
                is_verified: false
            })
            // initialConfig = null // Conceptually
            toast.success("Configuración eliminada")
        } catch (e) {
            toast.error("Error al eliminar")
        } finally {
            setIsDeleting(false)
        }
    }

    const currentProviderDef = PROVIDERS[config.provider as keyof typeof PROVIDERS] || PROVIDERS.custom

    return (
        <div className="max-w-4xl mx-auto">
            {/* Status Header */}
            <div className="flex items-center justify-between mb-8 p-6 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        config.is_verified ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    )}>
                        <Plug className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Estado de Conexión</h2>
                        <p className="text-sm text-muted-foreground">
                            {config.is_verified
                                ? `Conectado via ${config.host} como ${config.user_email}`
                                : "Usando sistema de envío por defecto (Pixy)"}
                        </p>
                    </div>
                </div>
                {config.is_verified && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Activo
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left: Provider Selection */}
                <div className="md:col-span-4 space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-2">1. Elige Proveedor</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {Object.entries(PROVIDERS).map(([key, def]) => {
                            const Icon = def.icon
                            const isSelected = config.provider === key
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleProviderChange(key)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                                        isSelected
                                            ? "border-brand-pink bg-brand-pink/5 text-brand-pink ring-1 ring-brand-pink"
                                            : "border-gray-200 dark:border-white/10 hover:border-brand-pink/50 hover:bg-gray-50"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium text-sm">{def.name}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Help Box */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-xs text-blue-800 dark:text-blue-300 mt-4">
                        <p className="font-semibold mb-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Ayuda para {currentProviderDef.name}
                        </p>
                        <p className="leading-relaxed opacity-90">{currentProviderDef.help}</p>
                    </div>
                </div>

                {/* Right: Configuration Form */}
                <div className="md:col-span-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración SMTP</CardTitle>
                            <CardDescription>Ingresa las credenciales de tu servidor de correo.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Host del Servidor</Label>
                                    <Input
                                        value={config.host}
                                        onChange={e => setConfig({ ...config, host: e.target.value })}
                                        placeholder="smtp.example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Puerto</Label>
                                    <Input
                                        type="number"
                                        value={config.port}
                                        onChange={e => setConfig({ ...config, port: parseInt(e.target.value) })}
                                        placeholder="465"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Usuario / Correo</Label>
                                <Input
                                    value={config.user_email}
                                    onChange={e => setConfig({
                                        ...config,
                                        user_email: e.target.value,
                                        // Auto-fill sender info if empty
                                        from_email: !config.from_email ? e.target.value : config.from_email
                                    })}
                                    placeholder="tu-correo@empresa.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Contraseña (SMTP / App Password)</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="password"
                                        className="pl-9"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder={initialConfig?.is_verified ? "•••••••••••• (Guardada)" : "Ingresa tu contraseña"}
                                    />
                                </div>
                                {initialConfig?.is_verified && !password && (
                                    <p className="text-xs text-muted-foreground mt-1">Dejar en blanco para mantener la actual.</p>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-white/10 mt-4">
                                <h4 className="text-sm font-medium mb-3">Identidad del Remitente</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nombre Visible</Label>
                                        <Input
                                            value={config.from_name}
                                            onChange={e => setConfig({ ...config, from_name: e.target.value })}
                                            placeholder="Ej: Finanzas TuEmpresa"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email Visible (From)</Label>
                                        <Input
                                            value={config.from_email}
                                            onChange={e => setConfig({ ...config, from_email: e.target.value })}
                                            placeholder="tu-correo@empresa.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between bg-gray-50 dark:bg-white/5 p-4 rounded-b-xl">
                            {config.is_verified ? (
                                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Desconectar
                                </Button>
                            ) : (
                                <div />
                            )}

                            <Button onClick={handleSave} disabled={loading} className="bg-brand-pink hover:bg-brand-pink/90">
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Probando conexión...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Probar y Guardar
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}

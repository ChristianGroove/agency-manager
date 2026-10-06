"use client"

import React, { useState, useEffect, useMemo } from "react"
import { IntegrationProvider, InstalledIntegration, BUILTIN_PROVIDERS } from "../types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import {
    Loader2,
    CheckCircle2,
    Copy,
    Check,
    Eye,
    EyeOff,
    ExternalLink,
    AlertCircle,
    Trash2,
    GitBranch,
    ShieldCheck,
    Zap,
    Lock
} from "lucide-react"
import {
    installIntegration,
    uninstallIntegration,
    getProviderByKey,
    getInstalledIntegrations
} from "../marketplace-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface DynamicIntegrationSheetProps {
    provider: IntegrationProvider | null
    providerKey?: string
    existingConnection?: InstalledIntegration
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

const getFallbackProvider = (key?: string): IntegrationProvider | null => {
    if (!key) return null
    return BUILTIN_PROVIDERS.find((p) => p.key === key) || null
}

export function DynamicIntegrationSheet({
    provider: initialProvider,
    providerKey,
    existingConnection: initialConnection,
    isOpen,
    onOpenChange,
    onSuccess,
}: DynamicIntegrationSheetProps) {
    const router = useRouter()
    const [provider, setProvider] = useState<IntegrationProvider | null>(
        initialProvider || getFallbackProvider(providerKey)
    )
    const [connection, setConnection] = useState<InstalledIntegration | undefined>(initialConnection)
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
    const [isLoading, setIsLoading] = useState(false)
    const [isUninstalling, setIsUninstalling] = useState(false)
    const [copiedWebhook, setCopiedWebhook] = useState(false)
    const [showUpdateCredentials, setShowUpdateCredentials] = useState(false)

    // Sync or load provider and connection data on open
    useEffect(() => {
        if (!isOpen) {
            setFormData({})
            setShowPassword({})
            setCopiedWebhook(false)
            setShowUpdateCredentials(false)
            return
        }

        let isMounted = true

        const loadData = async () => {
            const keyToLoad = initialProvider?.key || providerKey
            if (!keyToLoad) return

            setIsLoading(true)
            try {
                const [loadedProvider, installedList] = await Promise.all([
                    initialProvider ? Promise.resolve(initialProvider) : getProviderByKey(keyToLoad),
                    getInstalledIntegrations().catch(() => [])
                ])

                if (!isMounted) return

                if (loadedProvider) {
                    setProvider(loadedProvider)
                } else {
                    setProvider(getFallbackProvider(keyToLoad))
                }

                const foundConnection = installedList.find(
                    (c) => c.provider_key === keyToLoad && c.status !== 'deleted'
                )
                setConnection(foundConnection || initialConnection)
            } catch (err) {
                console.error("[DynamicIntegrationSheet] Error loading provider data:", err)
                if (isMounted) {
                    setProvider(getFallbackProvider(keyToLoad))
                }
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        loadData()

        return () => {
            isMounted = false
        }
    }, [isOpen, initialProvider, providerKey, initialConnection])

    const isInstalled = Boolean(connection && connection.status !== 'deleted')

    const schemaProperties = useMemo(() => {
        const props = provider?.config_schema?.properties || {}
        return Object.entries(props)
    }, [provider])

    const requiredFields = useMemo(() => {
        return new Set(provider?.config_schema?.required || [])
    }, [provider])

    const handleInputChange = (key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }))
    }

    const toggleShowPassword = (key: string) => {
        setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const handleCopyWebhookUrl = (url: string) => {
        if (!url) return
        navigator.clipboard.writeText(url)
        setCopiedWebhook(true)
        toast.success("URL del webhook copiada al portapapeles")
        setTimeout(() => setCopiedWebhook(false), 2500)
    }

    const handleInstall = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!provider) return

        // Validate required fields
        const missing: string[] = []
        for (const [key, prop] of schemaProperties) {
            if (requiredFields.has(key) && !formData[key]?.trim()) {
                missing.push(prop.title || key)
            }
        }

        if (missing.length > 0) {
            toast.error("Campos obligatorios requeridos", {
                description: `Por favor completa: ${missing.join(", ")}`
            })
            return
        }

        setIsLoading(true)
        try {
            const workspaceSlug = formData.workspace?.trim() || formData.owner?.trim() || ""
            const connectionName = workspaceSlug
                ? `${provider.name} (${workspaceSlug})`
                : `${provider.name} Connection`

            const res = await installIntegration({
                providerKey: provider.key,
                connectionName,
                credentials: formData,
                config: {},
                metadata: {
                    workspace: workspaceSlug,
                    owner: formData.owner?.trim() || workspaceSlug,
                    configured_at: new Date().toISOString()
                }
            })

            if (res.success) {
                toast.success(`Integración con ${provider.name} conectada exitosamente`)
                // Refresh local connection state
                const updatedList = await getInstalledIntegrations().catch(() => [])
                const updatedConn = updatedList.find(
                    (c) => c.provider_key === provider.key && c.status !== 'deleted'
                )
                if (updatedConn) {
                    setConnection(updatedConn)
                } else if (res.connectionId) {
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.pixy.agency'
                    setConnection({
                        id: res.connectionId,
                        organization_id: '',
                        provider_id: provider.id,
                        provider_key: provider.key,
                        connection_name: connectionName,
                        status: 'active',
                        credentials: {},
                        config: {},
                        metadata: {
                            workspace: workspaceSlug,
                            owner: formData.owner?.trim() || workspaceSlug,
                            webhook_url: `${origin}/api/webhooks/vcs/${provider.key}/${res.connectionId}`,
                            configured_at: new Date().toISOString()
                        },
                        is_primary: false,
                        last_synced_at: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                    })
                }
                setShowUpdateCredentials(false)
                onSuccess?.()
                router.refresh()
            } else {
                toast.error("Error al conectar integración", {
                    description: res.error || "No se pudieron validar las credenciales"
                })
            }
        } catch (error: any) {
            toast.error("Error inesperado", {
                description: error.message || "Ocurrió un error al procesar la solicitud"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleUninstall = async () => {
        if (!connection) return

        const confirmed = window.confirm(
            `¿Estás seguro de que deseas desconectar ${provider?.name || 'esta integración'}? Se detendrá la sincronización automática en tiempo real.`
        )
        if (!confirmed) return

        setIsUninstalling(true)
        try {
            const res = await uninstallIntegration(connection.id)
            if (res.success) {
                toast.success(`Integración desconectada exitosamente`)
                setConnection(undefined)
                setFormData({})
                onSuccess?.()
                router.refresh()
                onOpenChange(false)
            } else {
                toast.error("Error al desconectar", {
                    description: res.error || "No se pudo completar la desconexión"
                })
            }
        } catch (error: any) {
            toast.error("Error al desconectar", {
                description: error.message
            })
        } finally {
            setIsUninstalling(false)
        }
    }

    const webhookUrl = useMemo(() => {
        if (!connection) return ""
        if (connection.metadata?.webhook_url) return connection.metadata.webhook_url
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.pixy.agency'
        return `${origin}/api/webhooks/vcs/${connection.provider_key}/${connection.id}`
    }, [connection])

    const workspaceIdentifier = connection?.metadata?.owner || connection?.metadata?.workspace || connection?.connection_name || (provider?.key === 'github' ? 'Owner / Organización' : 'Workspace')
    const accountLabel = provider?.key === 'github' ? 'Owner / Organización' : 'Workspace'

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
                <SheetHeader className="sr-only">
                    <SheetTitle>Configuración de {provider?.name || "Integración"}</SheetTitle>
                    <SheetDescription>
                        Administra credenciales, webhooks y estado de la integración
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-col h-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
                    {/* Sheet Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border-b border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg text-lg">
                                {provider?.key === 'github' ? (
                                    <span className="text-xl">🐙</span>
                                ) : provider?.key === 'bitbucket' ? (
                                    <GitBranch className="h-5 w-5" />
                                ) : (
                                    <Zap className="h-5 w-5" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                        {provider?.name || "Integración"}
                                    </h2>
                                    {isInstalled && (
                                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 py-0.5">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Activa
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {isInstalled
                                        ? `Conexión activa con ${workspaceIdentifier}`
                                        : (provider?.description || "Conecta y sincroniza con tu espacio de trabajo")}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sheet Body */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-6">
                        {isLoading && !provider ? (
                            <div className="flex flex-col items-center justify-center py-16 space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">Cargando configuración...</p>
                            </div>
                        ) : isInstalled && !showUpdateCredentials ? (
                            /* INSTALLED / ACTIVE STATE */
                            <div className="space-y-6 animate-in fade-in duration-200">
                                {/* Status Banner */}
                                <Card className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl space-y-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground">Conexión Saludable y Verificada</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {accountLabel}: <span className="font-mono font-medium text-foreground">{workspaceIdentifier}</span>
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                {/* Webhook Endpoint Section */}
                                {webhookUrl && (
                                    <div className="space-y-2.5">
                                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                            <span>URL del Webhook de Pixy</span>
                                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-blue-500/30 text-blue-600 dark:text-blue-400">
                                                HMAC SHA-256
                                            </Badge>
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                readOnly
                                                value={webhookUrl}
                                                className="font-mono text-xs h-9 bg-muted/40 text-muted-foreground select-all"
                                            />
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleCopyWebhookUrl(webhookUrl)}
                                                className="h-9 px-3 gap-1.5 text-xs font-medium cursor-pointer shrink-0"
                                            >
                                                {copiedWebhook ? (
                                                    <>
                                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                        <span>Copiado</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3.5 w-3.5" />
                                                        <span>Copiar</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            {provider?.key === 'github' ? (
                                                <>
                                                    Registra este webhook en los <strong>Settings de tu Organización o Repositorio de GitHub</strong> (Settings → Webhooks → Add webhook) con Content type <strong>application/json</strong> y eventos de <strong>Push</strong> y <strong>Pull requests</strong> para sincronizar ramas y tickets en tiempo real.
                                                </>
                                            ) : provider?.key === 'bitbucket' ? (
                                                <>
                                                    Registra este webhook en tu <strong>Workspace de Bitbucket</strong> (Configuración del Workspace → Webhooks) seleccionando los eventos de <strong>Push</strong> y <strong>Pull Requests</strong> para sincronizar ramas y tickets en tiempo real.
                                                </>
                                            ) : (
                                                <>
                                                    Configura esta URL en el panel de tu proveedor para recibir notificaciones de eventos en tiempo real.
                                                </>
                                            )}
                                        </p>
                                    </div>
                                )}

                                {/* Security & Credentials Note */}
                                <div className="rounded-xl border border-border/40 bg-muted/20 p-3.5 space-y-2 text-xs">
                                    <div className="flex items-center gap-2 text-foreground font-medium">
                                        <Lock className="w-3.5 h-3.5 text-blue-500" />
                                        <span>Credenciales Cifradas de Nivel Empresarial</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Los tokens de acceso y secretos de webhook se encuentran cifrados con AES-256-GCM y nunca se exponen en texto plano en el navegador.
                                    </p>
                                    <div className="pt-1 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setShowUpdateCredentials(true)}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                        >
                                            Actualizar o rotar credenciales →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* CONFIGURATION / INSTALLATION FORM */
                            <form onSubmit={handleInstall} className="space-y-5 animate-in fade-in duration-200">
                                {isInstalled && (
                                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                                        <span className="text-xs font-semibold text-foreground">
                                            Actualización de Credenciales
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowUpdateCredentials(false)}
                                            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            Cancelar edición
                                        </button>
                                    </div>
                                )}

                                {schemaProperties.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-xs">
                                        Este conector no requiere configuración de credenciales manuales.
                                    </div>
                                ) : (
                                    schemaProperties.map(([key, prop]) => {
                                        const isRequired = requiredFields.has(key)
                                        const isSecret =
                                            prop.format === "password" ||
                                            key.toLowerCase().includes("token") ||
                                            key.toLowerCase().includes("secret") ||
                                            key.toLowerCase().includes("password") ||
                                            key.toLowerCase().includes("key")
                                        const isRevealed = showPassword[key] ?? false

                                        return (
                                            <div key={key} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor={`field-${key}`} className="text-xs font-medium text-foreground">
                                                        {prop.title || key}
                                                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                                                    </Label>
                                                    {isSecret && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleShowPassword(key)}
                                                            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                                                            tabIndex={-1}
                                                        >
                                                            {isRevealed ? (
                                                                <>
                                                                    <EyeOff className="w-3 h-3" />
                                                                    <span>Ocultar</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Eye className="w-3 h-3" />
                                                                    <span>Mostrar</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="relative">
                                                    <Input
                                                        id={`field-${key}`}
                                                        name={key}
                                                        type={isSecret && !isRevealed ? "password" : "text"}
                                                        value={formData[key] || ""}
                                                        onChange={(e) => handleInputChange(key, e.target.value)}
                                                        placeholder={prop.description || prop.title || key}
                                                        required={isRequired}
                                                        className="text-xs font-mono h-9 pr-8"
                                                    />
                                                </div>

                                                {prop.description && (
                                                    <p className="text-[11px] text-muted-foreground leading-normal">
                                                        {prop.description}
                                                    </p>
                                                )}
                                            </div>
                                        )
                                    })
                                )}

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-xs h-10 rounded-xl shadow-md gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Verificando y conectando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="h-4 w-4" />
                                                <span>{isInstalled ? "Actualizar Credenciales" : `Conectar ${provider?.name || ""}`}</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Sheet Footer */}
                    <div className="sticky bottom-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between z-20">
                        <div>
                            {isInstalled && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleUninstall}
                                    disabled={isUninstalling || isLoading}
                                    className="text-destructive hover:bg-destructive/10 text-xs gap-1.5 cursor-pointer"
                                >
                                    {isUninstalling ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                    <span>Desconectar integración</span>
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="text-xs cursor-pointer"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

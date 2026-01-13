"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check, ExternalLink, Info } from "lucide-react"
import { toast } from "sonner"

interface WebhookUrlCardProps {
    providerKey: string
}

/**
 * WebhookUrlCard
 * 
 * Displays the webhook URL that users need to configure in their messaging provider
 * (Meta WhatsApp, Evolution API, etc.) to receive incoming messages.
 * 
 * The URL is dynamically generated based on:
 * - Production: Uses NEXT_PUBLIC_APP_URL environment variable
 * - Development: Shows localhost URL with a warning
 * 
 * Features:
 * - Copy to clipboard functionality
 * - Provider-specific documentation links
 * - Verify token display for Meta webhooks
 */
export function WebhookUrlCard({ providerKey }: WebhookUrlCardProps) {
    const [copied, setCopied] = useState(false)
    const [copiedToken, setCopiedToken] = useState(false)
    const [baseUrl, setBaseUrl] = useState("")

    // Determine base URL (client-side)
    useEffect(() => {
        // Priority: ENV var > Window location
        const envUrl = process.env.NEXT_PUBLIC_APP_URL
        if (envUrl) {
            setBaseUrl(envUrl)
        } else if (typeof window !== 'undefined') {
            setBaseUrl(window.location.origin)
        }
    }, [])

    // Construct webhook URL based on provider
    const getWebhookUrl = () => {
        if (providerKey === 'evolution_api') {
            return `${baseUrl}/api/webhooks/whatsapp`
        }
        // Meta WhatsApp and others use the unified messaging endpoint
        return `${baseUrl}/api/webhooks/messaging?channel=whatsapp`
    }

    // The verify token used in Meta configuration (must match the one in route.ts)
    const VERIFY_TOKEN = "antigravity_verification_token_2026"

    const handleCopy = async (text: string, type: 'url' | 'token') => {
        try {
            await navigator.clipboard.writeText(text)
            if (type === 'url') {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            } else {
                setCopiedToken(true)
                setTimeout(() => setCopiedToken(false), 2000)
            }
            toast.success("Copiado al portapapeles")
        } catch (err) {
            toast.error("Error al copiar")
        }
    }

    const getDocumentationUrl = () => {
        if (providerKey === 'meta_whatsapp') {
            return "https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components"
        }
        if (providerKey === 'evolution_api') {
            return "https://doc.evolution-api.com/webhooks"
        }
        return null
    }

    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')

    return (
        <Card className="border-emerald-100 shadow-sm mt-6">
            <CardHeader className="bg-emerald-50/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-emerald-700 text-base">
                    <ExternalLink className="h-5 w-5" /> URL de Webhook
                </CardTitle>
                <CardDescription>
                    Configura esta URL en {providerKey === 'meta_whatsapp' ? 'Meta for Developers' : 'tu servidor Evolution'} para recibir mensajes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
                {/* Warning for localhost */}
                {isLocalhost && (
                    <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 flex gap-2 text-sm">
                        <Info className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <strong>Modo Desarrollo:</strong> Estás en localhost. Para recibir webhooks reales, usa <strong>ngrok</strong> o despliega a producción. Esta URL es solo de referencia.
                        </div>
                    </div>
                )}

                {/* Webhook URL */}
                <div className="space-y-2">
                    <Label>Callback URL</Label>
                    <div className="flex gap-2">
                        <Input
                            value={getWebhookUrl()}
                            readOnly
                            className="font-mono text-sm bg-slate-50"
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCopy(getWebhookUrl(), 'url')}
                            className="shrink-0"
                        >
                            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Verify Token (Only for Meta) */}
                {providerKey === 'meta_whatsapp' && (
                    <div className="space-y-2">
                        <Label>Verify Token</Label>
                        <div className="flex gap-2">
                            <Input
                                value={VERIFY_TOKEN}
                                readOnly
                                className="font-mono text-sm bg-slate-50"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleCopy(VERIFY_TOKEN, 'token')}
                                className="shrink-0"
                            >
                                {copiedToken ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Usa este token exacto al configurar el webhook en Meta.
                        </p>
                    </div>
                )}

                {/* Documentation Link */}
                {getDocumentationUrl() && (
                    <div className="pt-2">
                        <a
                            href={getDocumentationUrl()!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                        >
                            <ExternalLink className="h-3 w-3" />
                            Ver documentación de configuración
                        </a>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

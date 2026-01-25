"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createConnection } from "@/modules/core/integrations/actions"
import { toast } from "sonner"
import { Loader2, Key, CheckCircle2, Globe, Server } from "lucide-react"
import { IntegrationProvider } from "./integration-card"

interface ConnectionWizardProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    provider: IntegrationProvider | null
}

export function ConnectionWizard({ open, onOpenChange, provider }: ConnectionWizardProps) {
    const [isLoading, setIsLoading] = useState(false)

    // Generic State
    const [apiKey, setApiKey] = useState("")
    const [connectionName, setConnectionName] = useState("")

    // Evolution Specific State
    const [baseUrl, setBaseUrl] = useState("")
    const [instanceName, setInstanceName] = useState("")

    // UI Mode State
    const [manualMode, setManualMode] = useState(false)

    if (!provider) return null

    const handleConnect = async () => {
        setIsLoading(true)
        try {
            let credentials = {}
            let finalConnectionName = connectionName || provider.name

            // Construct payload based on provider type
            if (provider.key === 'evolution_api') {
                credentials = {
                    baseUrl,
                    apiKey, // This is the Global API Key
                    instanceName
                }
                finalConnectionName = instanceName || `Evolution: ${baseUrl}`
            } else if (provider.key === 'meta_whatsapp') {
                // If using Manual Mode, sending real credentials
                // If using Mock Auto Mode (manualMode=false), sending mock dummy
                if (manualMode) {
                    credentials = {
                        phoneNumberId: instanceName, // Reusing instanceName state
                        accessToken: apiKey
                    }
                    finalConnectionName = `WhatsApp: ${instanceName}`
                } else {
                    credentials = { mock_auth: true } // Mock Auth
                }
            } else if (provider.key === 'meta_instagram') {
                if (manualMode) {
                    credentials = {
                        assetId: instanceName, // Instagram Business ID
                        accessToken: apiKey
                    }
                    finalConnectionName = `Instagram: ${instanceName}`
                } else {
                    credentials = { mock_auth: true }
                }
            } else {
                // Default / Generic
                credentials = { api_key: apiKey }
            }

            const result = await createConnection({
                provider_key: provider.key,
                connection_name: finalConnectionName,
                credentials,
                config: {},
                metadata: {}
            })

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`Successfully connected ${provider.name}`)
                onOpenChange(false)
                // Reset Form
                setApiKey("")
                setConnectionName("")
                setBaseUrl("")
                setInstanceName("")
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    const renderContent = () => {
        // --- EVOLUTION API FLOW ---
        if (provider.key === 'evolution_api') {
            return (
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Instance Name</Label>
                        <div className="relative">
                            <Server className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="My Business Instance"
                                value={instanceName}
                                onChange={(e) => setInstanceName(e.target.value)}
                                className="pl-9 bg-white/5 border-white/10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Evolution Server URL</Label>
                        <div className="relative">
                            <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="https://api.your-evolution.com"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                className="pl-9 bg-white/5 border-white/10"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">The full URL to your Evolution API server.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Global API Key</Label>
                        <div className="relative">
                            <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="password"
                                placeholder="Global API Key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="pl-9 bg-white/5 border-white/10"
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="border-white/10 hover:bg-white/5">
                            Cancel
                        </Button>
                        <Button onClick={handleConnect} disabled={!baseUrl || !apiKey || !instanceName || isLoading} className="bg-brand-pink hover:bg-brand-pink/90 text-white border-0">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Connect Instance
                        </Button>
                    </DialogFooter>
                </div>
            )
        }

        // --- META OPEN AUTH (MOCK) OR MANUAL ---
        if (provider.key.startsWith('meta')) {
            if (manualMode) {
                return (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{provider.key === 'meta_instagram' ? 'Instagram Business ID' : provider.key === 'meta_whatsapp' ? 'Phone Number ID' : 'Page ID'}</Label>
                            <Input
                                placeholder="1234567890..."
                                value={instanceName} // Reusing instanceName state for Asset ID
                                onChange={(e) => setInstanceName(e.target.value)}
                                className="bg-white/5 border-white/10"
                            />
                            <p className="text-xs text-muted-foreground">Found in Meta App Dashboard, usually under {provider.key === 'meta_instagram' ? 'Instagram Graph API' : 'WhatsApp/Messenger'} setup</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Permanent Access Token</Label>
                            <div className="relative">
                                <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    placeholder="EAAG..."
                                    value={apiKey} // Reusing apiKey state
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="pl-9 bg-white/5 border-white/10"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Use a System User Token that doesn't expire.</p>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button variant="ghost" onClick={() => setManualMode(false)} className="mr-auto text-xs text-muted-foreground hover:text-white">
                                Back to Auto-Connect
                            </Button>
                            <Button onClick={handleConnect} disabled={!instanceName || !apiKey || isLoading} className="bg-brand-pink hover:bg-brand-pink/90 text-white border-0">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Connect
                            </Button>
                        </DialogFooter>
                    </div>
                )
            }

            return (
                <div className="space-y-4 py-4">
                    <div className="bg-brand-dark/50 p-6 rounded-lg border border-white/10 text-center">
                        <div className="mx-auto h-12 w-12 rounded-full bg-[#1877F2]/20 flex items-center justify-center mb-4 text-[#1877F2]">
                            <provider.icon className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-white mb-2">Connect with Facebook</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            You will be redirected to Facebook to authorize permissions for {provider.name}.
                        </p>
                        <Button
                            className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
                            onClick={handleConnect}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Continue to Facebook
                        </Button>
                    </div>

                    <div className="text-center">
                        <Button variant="link" onClick={() => setManualMode(true)} className="text-xs text-muted-foreground">
                            I carry my own token (Manual Setup)
                        </Button>
                    </div>
                </div>
            )
        }

        // --- GENERIC API KEY FLOW ---
        return (
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Connection Name</Label>
                    <Input
                        id="name"
                        placeholder={`My ${provider.name}`}
                        value={connectionName}
                        onChange={(e) => setConnectionName(e.target.value)}
                        className="bg-white/5 border-white/10"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="apikey">API Key / Secret</Label>
                    <div className="relative">
                        <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="apikey"
                            type="password"
                            placeholder="sk_..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="pl-9 bg-white/5 border-white/10"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Your credentials will be encrypted securely.
                    </p>
                </div>
                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="border-white/10 hover:bg-white/5">
                        Cancel
                    </Button>
                    <Button onClick={handleConnect} disabled={!apiKey || isLoading} className="bg-brand-pink hover:bg-brand-pink/90 text-white border-0">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Connect
                    </Button>
                </DialogFooter>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#0A0A0A] border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Connect {provider.name}</DialogTitle>
                    <DialogDescription>
                        Configure your connection settings below.
                    </DialogDescription>
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    )
}

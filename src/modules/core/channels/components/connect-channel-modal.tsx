"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { createChannel, getChannelQrCode } from "../actions"
import { toast } from "sonner"
import { Loader2, MessageCircle, QrCode, ArrowLeft, RefreshCw } from "lucide-react"

interface ConnectChannelModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type ProviderKey = 'meta_whatsapp' | 'evolution_api'
type Step = 'select' | 'form' | 'scan'

export function ConnectChannelModal({ open, onOpenChange }: ConnectChannelModalProps) {
    const [step, setStep] = useState<Step>('select')
    const [provider, setProvider] = useState<ProviderKey | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [qrCode, setQrCode] = useState<string | null>(null)

    // Form data
    const [name, setName] = useState("")
    // Meta
    const [phoneId, setPhoneId] = useState("")
    const [token, setToken] = useState("")
    const [wabaId, setWabaId] = useState("")
    // Evolution
    const [baseUrl, setBaseUrl] = useState("")
    const [apiKey, setApiKey] = useState("")
    const [instanceName, setInstanceName] = useState("")

    const handleProviderSelect = (key: ProviderKey) => {
        setProvider(key)
        setStep('form')
    }

    const reset = () => {
        setStep('select')
        setProvider(null)
        setQrCode(null)
        setName("")
        setPhoneId("")
        setToken("")
        setWabaId("")
        setBaseUrl("")
        setApiKey("")
        setInstanceName("")
        setIsLoading(false)
    }

    const handleFetchQr = async () => {
        if (!baseUrl || !apiKey || !instanceName) {
            toast.error("Missing Info", { description: "Please fill in all Evolution API fields." })
            return
        }

        setIsLoading(true)
        try {
            const result = await getChannelQrCode('evolution_api', { baseUrl, apiKey, instanceName })
            if (result && result.qr) {
                setQrCode(result.qr)
                setStep('scan')
            } else {
                // If null, maybe instance is already connected or error
                toast.info("No QR Code", { description: "Could not fetch QR. Instance might be already connected or offline." })
                // We can offer to try connecting anyway
                // setStep('scan') // Or just stay and show error
            }
        } catch (error: any) {
            toast.error("Error", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!provider) return

        // If Evolution and not yet scanned (and no QR shown), maybe user wants to try direct connect
        // But if we are in 'form' and user clicks Connect, for Evolution we might want to try QR first?
        // Let's make "Connect" button in Form trigger QR fetch for Evolution
        if (provider === 'evolution_api' && step === 'form') {
            await handleFetchQr()
            return
        }

        setIsLoading(true)
        try {
            const credentials: any = {}
            if (provider === 'meta_whatsapp') {
                credentials.phoneNumberId = phoneId
                credentials.accessToken = token
                credentials.wabaId = wabaId
            } else {
                credentials.baseUrl = baseUrl
                credentials.apiKey = apiKey
                credentials.instanceName = instanceName
            }

            // Force validation will verify connection status
            await createChannel({
                provider_key: provider,
                connection_name: name,
                credentials,
                config: {},
                is_primary: false,
                force_validation: true // Important for Evolution to check if scanned
            })

            toast.success("Channel Connected", { description: `${name} has been successfully connected.` })
            onOpenChange(false)
            reset()
        } catch (error: any) {
            toast.error("Connection Failed", { description: error.message || "Could not verify credentials." })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) reset()
            onOpenChange(val)
        }}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'select' ? "Connect New Channel" :
                            step === 'scan' ? "Scan QR Code" :
                                `Connect ${provider === 'meta_whatsapp' ? 'Meta Cloud API' : 'Evolution API'}`}
                    </DialogTitle>
                </DialogHeader>

                {step === 'select' ? (
                    <div className="grid gap-4 py-4">
                        <p className="text-sm text-muted-foreground">Select a provider to connect.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="h-32 flex flex-col gap-3 hover:border-green-500 hover:bg-green-50" onClick={() => handleProviderSelect('meta_whatsapp')}>
                                <div className="p-2 bg-green-100 rounded-full">
                                    <MessageCircle className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="text-center">
                                    <div className="font-medium">WhatsApp Cloud API</div>
                                    <span className="text-xs text-muted-foreground font-normal">Official Meta API</span>
                                </div>
                            </Button>
                            <Button variant="outline" className="h-32 flex flex-col gap-3 hover:border-blue-500 hover:bg-blue-50" onClick={() => handleProviderSelect('evolution_api')}>
                                <div className="p-2 bg-blue-100 rounded-full">
                                    <QrCode className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="text-center">
                                    <div className="font-medium">Evolution API</div>
                                    <span className="text-xs text-muted-foreground font-normal">QR Code / Instance</span>
                                </div>
                            </Button>
                        </div>
                    </div>
                ) : step === 'scan' ? (
                    <div className="flex flex-col items-center justify-center space-y-4 py-4">
                        {qrCode ? (
                            <div className="border-4 border-white shadow-lg rounded-lg overflow-hidden">
                                <img src={`data:image/png;base64,${qrCode}`} alt="Scan QR Code" className="w-64 h-64 object-contain" />
                            </div>
                        ) : (
                            <div className="h-64 w-64 bg-slate-100 rounded flex items-center justify-center text-muted-foreground">
                                No QR Code
                            </div>
                        )}
                        <p className="text-center text-sm text-muted-foreground px-4">
                            Open WhatsApp on your phone go to <strong>Linked Devices &gt; Link a Device</strong> and scan this code.
                        </p>

                        <div className="flex gap-2 w-full pt-4">
                            <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                                Back
                            </Button>
                            <Button onClick={() => handleSubmit()} disabled={isLoading} className="flex-1">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                I have scanned it
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Connection Name</Label>
                            <Input placeholder="e.g. Sales Team WhatsApp" value={name} onChange={e => setName(e.target.value)} required />
                        </div>

                        {provider === 'meta_whatsapp' ? (
                            <>
                                <div className="space-y-2">
                                    <Label>Phone Number ID</Label>
                                    <Input placeholder="From Meta Developer Portal" value={phoneId} onChange={e => setPhoneId(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Access Token (Permanent)</Label>
                                    <Input type="password" placeholder="EAAG..." value={token} onChange={e => setToken(e.target.value)} required />
                                    <p className="text-[10px] text-muted-foreground">System Users token recommended</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>WABA ID (Optional)</Label>
                                    <Input placeholder="WhatsApp Business Account ID" value={wabaId} onChange={e => setWabaId(e.target.value)} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label>API Base URL</Label>
                                    <Input placeholder="https://api.your-evolution.com" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Global API Key</Label>
                                    <Input type="password" placeholder="..." value={apiKey} onChange={e => setApiKey(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Instance Name</Label>
                                    <Input placeholder="instance_name" value={instanceName} onChange={e => setInstanceName(e.target.value)} required />
                                    <p className="text-[10px] text-muted-foreground">Must be created in Evolution first</p>
                                </div>
                            </>
                        )}

                        <div className="flex justify-between pt-4">
                            <Button type="button" variant="ghost" onClick={() => setStep('select')} disabled={isLoading}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? "Verifying..." : provider === 'evolution_api' ? "Next: Get QR Code" : "Connect Channel"}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}

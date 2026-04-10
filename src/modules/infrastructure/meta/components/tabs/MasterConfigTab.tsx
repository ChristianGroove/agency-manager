"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Lock, Save, RefreshCw, Eye, EyeOff } from "lucide-react"

export function MasterConfigTab() {
    const [isLoading, setIsLoading] = useState(false)
    const [showToken, setShowToken] = useState(false)

    // Default values preloaded from request (in a real app, these would come from server action)
    const [config, setConfig] = useState({
        metaAppId: "25468410932828305",
        wabaId: "204989441727866",
        businessId: "537209451085058",
        permanentToken: "EAFp7YoKlGJEBQrtOrCiZBQYPxnFcDePzTcL8EWwttTBY2dnLH8Qr0gcIZBqdHASZAgKAZA48xwyZABobDzIeLZAhXo6ixD4fhJyZCRvZCHMJl2uvSNZCjaz2uVB537yilhIjtrUC1H1vd8RmJQ4Vo5TvEeWXu8FhpNgp8ytMvWXectw1g4DCDm21NkDdKE1I87jx10QZDZD",
        appSecret: ""
    })

    const handleSave = async () => {
        setIsLoading(true)
        // Simulate API call to save config to backend/env
        await new Promise(resolve => setTimeout(resolve, 1500))
        setIsLoading(false)
        toast.success("Master Configuration Updated", {
            description: "Environment variables have been patched. Restart required for some changes."
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Meta Master Configuration (Production)</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage critical identifiers for the production environment. These override default env variables.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
                    {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Production Config
                </Button>
            </div>

            <div className="grid gap-6">
                <Card className="border-red-900/20 bg-red-950/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-500">
                            <Lock className="h-5 w-5" />
                            Core Identifiers
                        </CardTitle>
                        <CardDescription>
                            These IDs link your application to the verified Meta Business Portfolio.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>App ID (Identificador de la App)</Label>
                                <Input
                                    value={config.metaAppId}
                                    onChange={(e) => setConfig({ ...config, metaAppId: e.target.value })}
                                    className="font-mono bg-background/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Business Portfolio ID</Label>
                                <Input
                                    value={config.businessId}
                                    onChange={(e) => setConfig({ ...config, businessId: e.target.value })}
                                    className="font-mono bg-background/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>WABA ID (WhatsApp Business Account)</Label>
                            <Input
                                value={config.wabaId}
                                onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                                className="font-mono bg-background/50"
                            />
                            <p className="text-xs text-muted-foreground">
                                Must match the WABA inside the verified portfolio.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-yellow-900/20 bg-yellow-950/5">
                    <CardHeader>
                        <CardTitle className="text-yellow-500">Security Credentials</CardTitle>
                        <CardDescription>
                            Permanent tokens with 'business_management' scope.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>System User Permanent Token</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowToken(!showToken)}
                                    className="h-6 w-6 p-0"
                                >
                                    {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                            </div>
                            <Input
                                type={showToken ? "text" : "password"}
                                value={config.permanentToken}
                                onChange={(e) => setConfig({ ...config, permanentToken: e.target.value })}
                                className="font-mono bg-background/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>App Secret</Label>
                            <Input
                                type="password"
                                placeholder="••••••••••••••••"
                                value={config.appSecret}
                                onChange={(e) => setConfig({ ...config, appSecret: e.target.value })}
                                className="font-mono bg-background/50"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

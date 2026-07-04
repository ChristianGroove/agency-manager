"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Globe, Save, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { getOrgMetaConfig, saveOrgMetaConfig } from "../actions"

interface TenantAdsSettingsProps {
    onSuccess?: () => void
}

export function TenantAdsSettings({ onSuccess }: TenantAdsSettingsProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState<any>(null)

    useEffect(() => {
        loadConfig()
    }, [])

    const loadConfig = async () => {
        setLoading(true)
        const { config, error } = await getOrgMetaConfig()
        if (config) {
            setConfig(config)
        }
        setLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSaving(true)
        const formData = new FormData(e.currentTarget)
        const result = await saveOrgMetaConfig(formData)
        
        if (result.success) {
            toast.success("Configuración de Meta Ads guardada correctamente")
            loadConfig()
            onSuccess?.()
        } else {
            toast.error(result.error || "Error al guardar la configuración")
        }
        setSaving(false)
    }

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    const isConnected = !!config?.has_access_token

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[2rem] bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Credenciales de Meta Graph API</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Tus credenciales se cifran de extremo a extremo (E2EE) antes de guardarse en el sistema.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-100 dark:border-white/10 shadow-sm shrink-0">
                    {isConnected ? (
                        <>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Conectado</span>
                        </>
                    ) : (
                        <>
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-xs font-bold text-slate-500">Pendiente</span>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        System User Access Token
                        {!isConnected && <span className="ml-2 text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold">Requerido</span>}
                    </Label>
                    <Input 
                        name="access_token" 
                        type="password" 
                        placeholder={isConnected ? "Token configurado; deja vacío para conservarlo" : "EAA..."}
                        className="h-12 bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-white/10 rounded-2xl font-mono text-sm focus:ring-primary shadow-sm"
                        required={!isConnected}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ad Account ID</Label>
                    <Input 
                        name="ad_account_id" 
                        placeholder="act_123456789" 
                        defaultValue={config?.credentials?.ad_account_id}
                        className="h-12 bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-white/10 rounded-2xl font-mono text-sm focus:ring-primary shadow-sm"
                        required 
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Facebook Page ID</Label>
                    <Input 
                        name="page_id" 
                        placeholder="1234567890" 
                        defaultValue={config?.credentials?.page_id}
                        className="h-12 bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-white/10 rounded-2xl font-mono text-sm focus:ring-primary shadow-sm"
                        required 
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 rounded-2xl shadow-lg shadow-primary/20 font-bold text-sm transition-all active:scale-95">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Configuración
                </Button>
            </div>
        </form>
    );
}

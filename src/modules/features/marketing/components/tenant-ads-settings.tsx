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

    const isConnected = !!config?.credentials?.access_token

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                            System User Access Token
                            <span className="ml-2 text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold">Requerido</span>
                        </Label>
                        <Input 
                            name="access_token" 
                            type="password" 
                            placeholder="EAA..." 
                            defaultValue={config?.credentials?.access_token}
                            className="h-11 bg-white dark:bg-zinc-800 border-slate-200 dark:border-white/10 rounded-xl font-mono text-sm focus:ring-indigo-500 shadow-sm"
                            required 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Ad Account ID</Label>
                        <Input 
                            name="ad_account_id" 
                            placeholder="act_123456789" 
                            defaultValue={config?.credentials?.ad_account_id}
                            className="h-11 bg-white dark:bg-zinc-800 border-slate-200 dark:border-white/10 rounded-xl font-mono text-sm focus:ring-indigo-500 shadow-sm"
                            required 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Facebook Page ID</Label>
                        <Input 
                            name="page_id" 
                            placeholder="1234567890" 
                            defaultValue={config?.credentials?.page_id}
                            className="h-11 bg-white dark:bg-zinc-800 border-slate-200 dark:border-white/10 rounded-xl font-mono text-sm focus:ring-indigo-500 shadow-sm"
                            required 
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-indigo-50/30 dark:bg-indigo-500/5 border border-indigo-100/50 dark:border-indigo-500/10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-indigo-100/20">
                                <AlertCircle className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-900 dark:text-indigo-300">Estado de Conexión</span>
                        </div>
                        
                        <div className="flex items-center gap-3 py-1">
                            {isConnected ? (
                                <>
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">Motor Configurado</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-sm font-bold text-slate-500">Credenciales Pendientes</span>
                                </>
                            )}
                        </div>
                        
                        <p className="text-[11px] text-indigo-950/60 dark:text-indigo-200/40 leading-relaxed font-medium">
                            Esta configuración permite que el sistema centralizado de Agency Manager sincronice métricas automáticas.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Permisos Sugeridos
                        </h4>
                        <ul className="space-y-2">
                            {['ads_read', 'ads_management', 'pages_read_engagement'].map(p => (
                                <li key={p} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" /> {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="p-6 rounded-2xl border border-amber-500/10 bg-amber-500/5 flex gap-3 text-amber-600 dark:text-amber-400 mt-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="space-y-1">
                    <p className="text-xs font-bold leading-none">Nota de Seguridad</p>
                    <p className="text-[10px] leading-relaxed font-medium opacity-80">
                        Tus credenciales se cifran antes de guardarse y solo se utilizan para consultas directas a Meta Graph API.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex items-center justify-end pt-6 border-t border-slate-100 dark:border-white/5">
                <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-xl shadow-lg shadow-indigo-500/20 font-bold text-sm transition-all active:scale-95">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Configuración
                </Button>
            </form>
        </div>
    );
}

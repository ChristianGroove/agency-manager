"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { completeOrganizationOnboarding, getOnboardingContext } from "@/modules/core/organizations/actions/provisioning"
import { getAvailableApps } from "@/modules/core/saas/saas-actions"

import { useBranding } from "@/components/providers/branding-provider"

import { AppSlider } from "./app-slider"
import { AnimatedBorderBeam } from "@/components/ui/animated-border-beam"

export function OnboardingWizard() {
    const submitting = useRef(false)
    const branding = useBranding()
    const primaryColor = branding?.colors?.primary || "#4f46e5"

    const [isLoading, setIsLoading] = useState(false)
    const [isAppsLoading, setIsAppsLoading] = useState(true)
    const [apps, setApps] = useState<Awaited<ReturnType<typeof getAvailableApps>>>([])
    const [domainBase, setDomainBase] = useState("")
    const [context, setContext] = useState<Extract<Awaited<ReturnType<typeof getOnboardingContext>>, { success: true }>['data'] | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        app_id: "",
        password: "",
        confirmPassword: "",
        fullName: ""
    })

    // Domain Detection
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname
            if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
                setDomainBase('.localhost:3000')
            } else {
                if (hostname.startsWith('app.')) {
                    setDomainBase('.' + hostname.substring(4))
                } else {
                    const parts = hostname.split('.')
                    if (parts.length > 2) {
                        setDomainBase('.' + parts.slice(1).join('.'))
                    } else {
                        setDomainBase('.' + hostname)
                    }
                }
            }
        }
    }, [])

    // Load Apps & User Metadata
    useEffect(() => {
        let cancelled = false
        async function loadInitialData() {
            try {
                const result = await getOnboardingContext()
                if (!result.success) throw new Error(result.error)
                const data = result.data.organization ? [] : await getAvailableApps()
                if (cancelled) return
                setContext(result.data)
                setFormData(prev => ({ ...prev, fullName: result.data.fullName }))
                setApps(data || [])
                
                // Pre-select invited app if specified in user_metadata, otherwise default to first app
                const invitedAppId = result.data.invitation?.target_app_id
                if (invitedAppId && data?.some(a => a.id === invitedAppId)) {
                    setFormData(prev => ({ ...prev, app_id: invitedAppId }))
                } else if (data && data.length > 0) {
                    setFormData(prev => ({ ...prev, app_id: data[0].id }))
                }
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo cargar tu cuenta.')
            } finally {
                if (!cancelled) setIsAppsLoading(false)
            }
        }
        loadInitialData()
        return () => { cancelled = true }
    }, [])

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value
        const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        setFormData(prev => ({ ...prev, name, slug }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!context || submitting.current) return
        if (!context.organization && (!formData.name || !formData.slug || !formData.app_id)) {
            toast.error("Por favor completa todos los campos")
            return
        }
        submitting.current = true
        setError(null)
        setIsLoading(true)
        try {
            const result = await completeOrganizationOnboarding(formData)
            if (result.success) {
                toast.success(context.organization ? 'Tu acceso está listo' : 'Organización creada exitosamente')
                window.location.assign('/dashboard')
            } else {
                setError(result.error || "No se pudo completar la activación")
                submitting.current = false
                setIsLoading(false)
            }
        } catch (error) {
            console.error(error)
            setError("No se pudo completar la activación. Intenta de nuevo.")
            submitting.current = false
            setIsLoading(false)
        }
    }

    if (isAppsLoading) {
        return (
            <div className="w-full h-[600px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
        )
    }

    return (
        <div className="w-full max-w-md mx-auto h-full flex flex-col justify-center animate-in fade-in zoom-in duration-500 py-6">

            {/* Top: 3D Slider (Compact & Magnetic) */}
            {context && !context.organization && <div className="w-full mb-6 relative z-10">
                <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Elige tu espacio</h2>
                </div>
                <AppSlider
                    apps={apps}
                    selectedAppId={formData.app_id}
                    onSelect={(id) => setFormData(prev => ({ ...prev, app_id: id }))}
                    primaryColor={primaryColor}
                />
            </div>}

            {/* Bottom: Minimal Form */}
            <div className="w-full premium-glass-card p-6 rounded-3xl relative z-20 overflow-hidden">
                <AnimatedBorderBeam className="rounded-3xl" />
                <form onSubmit={handleSubmit} className="space-y-4 relative z-20">
                    {context?.organization && <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Activa tu acceso</h1>
                        <p>Tu organización ya está configurada. Completa tu acceso para empezar.</p>
                        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 p-4">
                            <p className="font-semibold text-zinc-900 dark:text-white">{context.organization.name}</p>
                            <p>{context.organization.app_name}</p>
                            <p className="text-xs mt-1 text-zinc-500 dark:text-zinc-400">Identificador: {context.organization.slug}</p>
                        </div>
                    </div>}
                    {context && !context.organization && <>
                    <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-zinc-700 dark:text-zinc-300 text-[10px] uppercase font-bold tracking-wider pl-1">Organización</Label>
                        <Input
                            id="name"
                            required
                            placeholder="Nombre de tu empresa"
                            value={formData.name}
                            onChange={handleNameChange}
                            className="bg-black/[0.04] dark:bg-white/[0.07] border-black/10 dark:border-white/15 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-offset-0 transition-all shadow-sm h-10 text-sm rounded-xl"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="slug" className="text-zinc-700 dark:text-zinc-300 text-[10px] uppercase font-bold tracking-wider pl-1">URL del Espacio</Label>
                        <div className="flex rounded-md shadow-sm h-9">
                            <Input
                                id="slug"
                                required
                                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                                value={formData.slug}
                                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                                className="rounded-r-none bg-black/[0.04] dark:bg-white/[0.07] border-black/10 dark:border-white/15 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:z-10 focus:ring-2 focus:ring-offset-0 text-right font-medium text-sm h-full"
                                placeholder="slug"
                            />
                            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-400 text-[10px] select-none font-medium h-full">
                                {domainBase || '.pixy.com.co'}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">El identificador se usa en el subdominio de tu organización. Usa letras, números y guiones.</p>
                    {!apps.length && <p role="alert" className="text-sm text-red-600">No hay espacios disponibles. Contacta a soporte.</p>}
                    </>}
                    {context?.requiresPassword && <>
                        <div className="space-y-1.5">
                            <Label htmlFor="fullName" className="text-zinc-700 dark:text-zinc-300 text-xs font-medium">Tu nombre</Label>
                            <Input id="fullName" autoComplete="name" required value={formData.fullName}
                                onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                className="bg-black/[0.04] dark:bg-white/[0.07] border-black/10 dark:border-white/15 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-offset-0 transition-all shadow-sm h-10 text-sm rounded-xl" />
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">Crea una contraseña para ingresar después con tu correo.</p>
                        <div className="space-y-1.5">
                            <Label htmlFor="password" className="text-zinc-700 dark:text-zinc-300 text-xs font-medium">Contraseña</Label>
                            <Input id="password" type="password" autoComplete="new-password" minLength={6} required value={formData.password}
                                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                className="bg-black/[0.04] dark:bg-white/[0.07] border-black/10 dark:border-white/15 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-offset-0 transition-all shadow-sm h-10 text-sm rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="confirmPassword" className="text-zinc-700 dark:text-zinc-300 text-xs font-medium">Confirmar contraseña</Label>
                            <Input id="confirmPassword" type="password" autoComplete="new-password" minLength={6} required value={formData.confirmPassword}
                                onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="bg-black/[0.04] dark:bg-white/[0.07] border-black/10 dark:border-white/15 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-offset-0 transition-all shadow-sm h-10 text-sm rounded-xl" />
                        </div>
                    </>}
                    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                    <Button
                        type="submit"
                        className="w-full text-white shadow-lg h-10 font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all mt-2 cursor-pointer"
                        style={{
                            backgroundColor: primaryColor,
                            boxShadow: `0 8px 16px -4px ${primaryColor}50`
                        }}
                        disabled={isLoading || !context || (!context.organization && !formData.app_id)}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span>Finalizando...</span>
                            </>
                        ) : (
                            context?.organization ? 'Guardar y entrar' : 'Crear y entrar'
                        )}
                    </Button>
                    <a href="/login" className="block text-center text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white underline transition-colors">Volver al inicio de sesión</a>
                </form>
            </div>
        </div>
    )
}


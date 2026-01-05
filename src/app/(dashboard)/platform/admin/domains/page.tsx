"use client"

import { useState, useEffect } from "react"
import { getPlatformDomainsConfig, updatePlatformDomains, getOrganizationDomainsConfig, updateOrganizationDomains } from "@/modules/core/domains/actions"
import { getAdminOrganizations } from "@/modules/core/admin/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { ArrowLeft, Loader2, Save, Globe, Shield, AlertTriangle, CheckCircle2, Copy, Settings, Building2, ChevronDown, ChevronUp, Info, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DomainConfig {
    admin_domain: string
    portal_domain: string
    updated_at: string | null
}

interface Organization {
    id: string
    name: string
    slug: string
    use_custom_domains?: boolean
    custom_admin_domain?: string | null
    custom_portal_domain?: string | null
}

export default function UnifiedDomainsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [globalDomains, setGlobalDomains] = useState<DomainConfig | null>(null)
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [activeTab, setActiveTab] = useState("global")

    // Global state
    const [globalAdminDomain, setGlobalAdminDomain] = useState("")
    const [globalPortalDomain, setGlobalPortalDomain] = useState("")
    const [globalOriginal, setGlobalOriginal] = useState<DomainConfig | null>(null)

    // Search & filter
    const [searchTerm, setSearchTerm] = useState("")
    const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())
    const [showInstructions, setShowInstructions] = useState<Set<string>>(new Set())

    useEffect(() => {
        loadAllData()
    }, [])

    const loadAllData = async () => {
        try {
            const [domainsResponse, orgsData] = await Promise.all([
                getPlatformDomainsConfig(),
                getAdminOrganizations()
            ])

            if (domainsResponse.success && domainsResponse.data) {
                setGlobalDomains(domainsResponse.data)
                setGlobalOriginal(domainsResponse.data)
                setGlobalAdminDomain(domainsResponse.data.admin_domain)
                setGlobalPortalDomain(domainsResponse.data.portal_domain)
            }

            if (orgsData) {
                setOrganizations(orgsData as Organization[])
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar configuración")
        } finally {
            setLoading(false)
        }
    }

    const validateDomain = (domain: string): boolean => {
        const domainRegex = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*$/i
        return domainRegex.test(domain) && !domain.includes('//') && domain.length > 3
    }

    const handleSaveGlobal = async () => {
        if (!validateDomain(globalAdminDomain) || !validateDomain(globalPortalDomain)) {
            toast.error("Formato de dominio inválido")
            return
        }

        if (globalAdminDomain === globalPortalDomain) {
            toast.error("Los dominios deben ser diferentes")
            return
        }

        setSaving(true)
        try {
            const response = await updatePlatformDomains({
                admin_domain: globalAdminDomain,
                portal_domain: globalPortalDomain
            })

            if (response.success) {
                toast.success("Dominios globales actualizados")
                loadAllData()
            } else {
                toast.error(response.error || "Error al guardar")
            }
        } catch (error) {
            toast.error("Error al guardar cambios")
        } finally {
            setSaving(false)
        }
    }

    const handleToggleOrgDomains = async (orgId: string, enabled: boolean) => {
        setSaving(true)
        try {
            const response = await updateOrganizationDomains({
                organization_id: orgId,
                use_custom_domains: enabled,
                custom_admin_domain: enabled ? `admin.${organizations.find(o => o.id === orgId)?.slug}.com` : null,
                custom_portal_domain: enabled ? `portal.${organizations.find(o => o.id === orgId)?.slug}.com` : null
            })

            if (response.success) {
                toast.success(enabled ? "Dominios personalizados habilitados" : "Usando dominios globales")
                loadAllData()
            } else {
                toast.error(response.error || "Error")
            }
        } catch (error) {
            toast.error("Error al actualizar")
        } finally {
            setSaving(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success("Copiado")
    }

    const toggleExpanded = (orgId: string) => {
        const newExpanded = new Set(expandedOrgs)
        if (newExpanded.has(orgId)) {
            newExpanded.delete(orgId)
        } else {
            newExpanded.add(orgId)
        }
        setExpandedOrgs(newExpanded)
    }

    const toggleInstructions = (orgId: string) => {
        const newInstructions = new Set(showInstructions)
        if (newInstructions.has(orgId)) {
            newInstructions.delete(orgId)
        } else {
            newInstructions.add(orgId)
        }
        setShowInstructions(newInstructions)
    }

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const customDomainsCount = organizations.filter(o => o.use_custom_domains).length
    const globalDomainsCount = organizations.length - customDomainsCount

    const hasGlobalChanges = globalAdminDomain !== globalOriginal?.admin_domain ||
        globalPortalDomain !== globalOriginal?.portal_domain

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/platform/admin">
                            <Button variant="ghost" size="icon" className="-ml-3 h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Centro de Gestión de Dominios</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Configura dominios globales y personalizados por vertical desde un solo lugar.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dominios Globales</CardTitle>
                        <Globe className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{globalDomainsCount}</div>
                        <p className="text-xs text-muted-foreground">Verticales usando defaults</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dominios Personalizados</CardTitle>
                        <Settings className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customDomainsCount}</div>
                        <p className="text-xs text-muted-foreground">Con configuración custom</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Verticales</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{organizations.length}</div>
                        <p className="text-xs text-muted-foreground">Organizaciones registradas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="global" className="gap-2">
                        <Globe className="h-4 w-4" />
                        Configuración Global
                    </TabsTrigger>
                    <TabsTrigger value="verticals" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Por Vertical ({organizations.length})
                    </TabsTrigger>
                </TabsList>

                {/* Global Tab */}
                <TabsContent value="global" className="space-y-6 mt-6">
                    {hasGlobalChanges && (
                        <div className="flex gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-amber-800 dark:text-amber-400">
                                    <strong>Advertencia:</strong> Cambiar dominios globales afectará a {globalDomainsCount} verticales que no usan dominios personalizados.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Admin Domain */}
                        <Card className="border-2 border-indigo-500/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-indigo-500" />
                                    Dominio Administrativo
                                </CardTitle>
                                <CardDescription>
                                    Dominio principal para panel de control
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Dominio</Label>
                                    <Input
                                        value={globalAdminDomain}
                                        onChange={(e) => setGlobalAdminDomain(e.target.value.toLowerCase())}
                                        placeholder="app.pixy.com.co"
                                        className="font-mono"
                                    />
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Preview</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-muted/50 rounded-md border text-xs">
                                            https://{globalAdminDomain}/dashboard
                                        </code>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(`https://${globalAdminDomain}/dashboard`)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Portal Domain */}
                        <Card className="border-2 border-emerald-500/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-emerald-500" />
                                    Dominio de Portales
                                </CardTitle>
                                <CardDescription>
                                    Dominio público para clientes
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Dominio</Label>
                                    <Input
                                        value={globalPortalDomain}
                                        onChange={(e) => setGlobalPortalDomain(e.target.value.toLowerCase())}
                                        placeholder="mi.pixy.com.co"
                                        className="font-mono"
                                    />
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Preview</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-muted/50 rounded-md border text-xs">
                                            https://{globalPortalDomain}/portal/abc123
                                        </code>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(`https://${globalPortalDomain}/portal/abc123`)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            onClick={handleSaveGlobal}
                            disabled={saving || !hasGlobalChanges}
                            size="lg"
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Configuración Global
                        </Button>
                    </div>
                </TabsContent>

                {/* Verticals Tab */}
                <TabsContent value="verticals" className="space-y-6 mt-6">
                    {/* Search */}
                    <div className="flex items-center gap-4">
                        <Input
                            placeholder="Buscar vertical..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Badge variant="outline">{filteredOrgs.length} resultados</Badge>
                    </div>

                    {/* Organizations List */}
                    <ScrollArea className="h-[600px] rounded-lg border">
                        <div className="p-4 space-y-3">
                            {filteredOrgs.map((org) => {
                                const isExpanded = expandedOrgs.has(org.id)
                                const usingCustom = org.use_custom_domains

                                return (
                                    <Card key={org.id} className={`transition-all ${usingCustom ? 'border-emerald-500/30' : ''}`}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <CardTitle className="text-lg">{org.name}</CardTitle>
                                                        {usingCustom ? (
                                                            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                                                                Custom
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary">
                                                                Global
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground font-mono">@{org.slug}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleExpanded(org.id)}
                                                >
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </CardHeader>

                                        {isExpanded && (
                                            <CardContent className="space-y-4 border-t pt-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-0.5">
                                                        <Label>Usar dominios personalizados</Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            {usingCustom ? 'Esta vertical usa sus propios dominios' : 'Hereda dominios globales'}
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={usingCustom}
                                                        onCheckedChange={(checked) => handleToggleOrgDomains(org.id, checked)}
                                                        disabled={saving}
                                                    />
                                                </div>

                                                <Separator />

                                                <div className="space-y-3">
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Admin Domain</Label>
                                                        <code className="block mt-1 px-3 py-2 bg-muted/50 rounded-md border text-sm">
                                                            {usingCustom && org.custom_admin_domain
                                                                ? org.custom_admin_domain
                                                                : globalAdminDomain
                                                            }
                                                        </code>
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Portal Domain</Label>
                                                        <code className="block mt-1 px-3 py-2 bg-muted/50 rounded-md border text-sm">
                                                            {usingCustom && org.custom_portal_domain
                                                                ? org.custom_portal_domain
                                                                : globalPortalDomain
                                                            }
                                                        </code>
                                                    </div>
                                                </div>

                                                {/* Discreet Instructions Toggle - Only when custom domains enabled */}
                                                {usingCustom && (
                                                    <>
                                                        <Separator />

                                                        <div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full justify-between text-xs"
                                                                onClick={() => toggleInstructions(org.id)}
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <HelpCircle className="h-3.5 w-3.5" />
                                                                    Instrucciones de configuración
                                                                </span>
                                                                {showInstructions.has(org.id) ? (
                                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                                )}
                                                            </Button>

                                                            {showInstructions.has(org.id) && (
                                                                <div className="mt-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-3">
                                                                    <div className="flex items-start gap-2">
                                                                        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                                                        <div className="space-y-2 text-xs">
                                                                            <p className="font-medium text-blue-900 dark:text-blue-300">
                                                                                Pasos para configurar dominios personalizados:
                                                                            </p>

                                                                            <ol className="space-y-1.5 text-muted-foreground ml-4 list-decimal">
                                                                                <li>
                                                                                    <strong>Configurar DNS:</strong> Crear registros A o CNAME apuntando:
                                                                                    <ul className="ml-4 mt-1 space-y-0.5 list-disc">
                                                                                        <li><code className="text-xs bg-muted px-1 py-0.5 rounded">{org.custom_admin_domain}</code> → IP del servidor</li>
                                                                                        <li><code className="text-xs bg-muted px-1 py-0.5 rounded">{org.custom_portal_domain}</code> → IP del servidor</li>
                                                                                    </ul>
                                                                                </li>
                                                                                <li>
                                                                                    <strong>Verificar propagación:</strong> Usar herramientas como <code className="bg-muted px-1 py-0.5 rounded">nslookup</code> o <a href="https://dnschecker.org" target="_blank" className="text-blue-600 hover:underline">dnschecker.org</a>
                                                                                </li>
                                                                                <li>
                                                                                    <strong>Certificados SSL:</strong> Asegurar que los nuevos dominios tengan certificados SSL válidos
                                                                                </li>
                                                                                <li>
                                                                                    <strong>Notificar usuarios:</strong> Los links antiguos serán redirigidos, pero es recomendable informar del cambio
                                                                                </li>
                                                                            </ol>

                                                                            <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                                                                                <p className="font-medium text-amber-800 dark:text-amber-400">
                                                                                    ⚠️ <strong>Importante:</strong>
                                                                                </p>
                                                                                <ul className="ml-4 space-y-0.5 list-disc text-amber-700 dark:text-amber-500">
                                                                                    <li>Passkeys existentes dejarán de funcionar y deben regenerarse</li>
                                                                                    <li>Los cambios DNS pueden tardar hasta 48 horas en propagarse</li>
                                                                                    <li>Probar en ambiente de prueba antes de aplicar en producción</li>
                                                                                </ul>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </CardContent>
                                        )}
                                    </Card>
                                )
                            })}

                            {filteredOrgs.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    No se encontraron verticales
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    )
}

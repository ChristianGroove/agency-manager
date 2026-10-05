"use client"

import { IntegrationProvider, MARKETPLACE_CATEGORIES, InstalledIntegration } from "../types"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useMemo } from "react"
import { Check, Crown, ExternalLink, Search, Sparkles, Puzzle, ShieldAlert, Zap, Clock } from "lucide-react"
import { IntegrationSetupSheet } from "./integration-setup-sheet"
import { SectionHeader } from "@/components/layout/section-header"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from 'sonner'
import { SearchFilterBar, FilterOption } from "@/modules/core/ui/components/search-filter-bar"
import { TenantAIGovernanceContext } from "@/modules/infrastructure/ai-engine/actions"

interface MarketplacePageProps {
    providers: IntegrationProvider[]
    installedIntegrations: InstalledIntegration[]
    aiCredentials?: any[]
    aiProviders?: any[]
    aiGovernance?: TenantAIGovernanceContext
}

const PROVIDER_ICONS: Record<string, string> = {
    'meta_business': '🏢',
    'meta_whatsapp': '📱',
    'evolution_api': '💬',
    'meta_instagram': '📸',
    'telegram': '✈️',
    'twilio_sms': '📨',
    'stripe': '💳',
    'google_calendar': '📅',
    'openai': '🤖',
    'anthropic': '🧠',
    'ai-engine': '🔮',
    'bitbucket': '🪣'
}

const MOCK_OR_UNIMPLEMENTED_PROVIDERS = new Set([
    'stripe',
    'twilio_sms',
    'telegram',
    'google_calendar',
    'google_mail',
    'anthropic'
])

function getProviderEcosystem(providerKey: string, category: string): { id: string; label: string; color: string } {
    if (providerKey === 'bitbucket' || category === 'dev_tasks') {
        return { id: 'dev_tasks', label: 'Desarrollo & Tareas', color: 'blue' }
    }
    if (['meta_business', 'meta_whatsapp', 'meta_instagram', 'evolution_api', 'telegram', 'twilio_sms'].includes(providerKey) || ['messaging', 'crm'].includes(category)) {
        return { id: 'messaging_crm', label: 'Mensajería & CRM', color: 'emerald' }
    }
    if (providerKey === 'stripe' || ['payments', 'finance', 'invoicing'].includes(category)) {
        return { id: 'finance', label: 'Facturación & Pagos', color: 'amber' }
    }
    if (['ai-engine', 'openai', 'anthropic', 's3', 'google_drive'].includes(providerKey) || ['ai', 'platform', 'other'].includes(category)) {
        return { id: 'platform', label: 'Plataforma & Core', color: 'purple' }
    }
    return { id: 'productivity', label: 'Productividad', color: 'zinc' }
}

import { AIEngineSheet } from "./ai-engine-sheet"
import { useEffect } from "react"

export function MarketplacePage({ providers, installedIntegrations, aiCredentials = [], aiProviders = [], aiGovernance }: MarketplacePageProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const callbackError = searchParams.get('error')
    const [search, setSearch] = useState("")
    const [category, setCategory] = useState("all")
    const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [isAIEngineOpen, setIsAIEngineOpen] = useState(false)

    // Auto-open sheet if return from OAuth
    useEffect(() => {
        const action = searchParams.get('action')
        if (action === 'configure_assets') {
            const metaProvider = providers.find(p => p.key === 'meta_business')
            if (metaProvider) {
                setSelectedProvider(metaProvider)
                setIsSheetOpen(true)
            }
        }
    }, [searchParams, providers])

    useEffect(() => {
        if (!callbackError) return
        toast.error(callbackError === 'no_eligible_assets'
            ? 'Meta no encontró páginas o cuentas de Instagram elegibles. Revisa la cuenta y los permisos concedidos.'
            : 'No se pudo completar la autorización con Meta. Inténtalo de nuevo.')
        router.replace('/platform/integrations')
    }, [callbackError, router])

    // Derived state for quick lookup
    const installedKeys = useMemo(() => new Set(installedIntegrations.map(i => i.provider_key)), [installedIntegrations])

    const isAiSuspended = aiGovernance?.aiStatus === 'suspended' || aiGovernance?.aiMode === 'disabled'
    const isAiSaaS = aiGovernance?.aiMode === 'saas'

    const filteredProviders = useMemo(() => {
        // 1. Create Synthetic AI Card with adaptive microcopy
        let aiDescription = 'Gestiona tus cuentas de OpenAI, Anthropic, Gemini y Groq con enrutamiento inteligente.'
        if (isAiSuspended) {
            aiDescription = 'Capacidades de IA pausadas. Contacta al administrador para reactivar.'
        } else if (isAiSaaS) {
            const usageText = aiGovernance ? ` (${aiGovernance.currentUsage.toLocaleString()} / ${aiGovernance.monthlyLimit === -1 ? 'Ilimitado' : `${aiGovernance.monthlyLimit.toLocaleString()} tok`})` : ''
            aiDescription = `Inteligencia Artificial gestionada e incluida en tu plan${usageText}. Modelos provistos por Pixy.`
        } else {
            // Claves Propias
            if (aiCredentials.length > 0) {
                aiDescription = `${aiCredentials.length} clave(s) conectada(s). Consumo directo con tu proveedor sin límites de plataforma.`
            } else {
                aiDescription = 'Conecta tus cuentas de OpenAI o Anthropic para activar la IA en tu espacio.'
            }
        }

        const aiCard: IntegrationProvider = {
            id: 'ai-engine-synth',
            key: 'ai-engine',
            name: 'Inteligencia Artificial',
            description: aiDescription,
            category: 'ai',
            is_premium: isAiSaaS,
            is_enabled: !isAiSuspended,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            config_schema: { required: [], properties: {} },
            icon_url: null,
            documentation_url: null,
            setup_instructions: null
        }

        // 2. Filter original list (remove individual AI providers)
        const AI_KEYS = ['openai', 'anthropic', 'groq', 'google']
        const cleaned = providers.filter(p => !AI_KEYS.includes(p.key))

        // 3. Inject AI Card if category matches
        let list = cleaned

        // [VIDEO-PREP] Quick Filter: Ocultar Evolution API para el video de revisión de Meta
        // Para que se vea 100% "oficial".
        list = list.filter(p => p.key !== 'evolution_api');

        if (category === 'all' || category === 'ai' || category === 'platform') {
            const hasAi = providers.some(p => AI_KEYS.includes(p.key))
            // Always show it if we are in AI category or ALL
            list = [aiCard, ...list]
        }

        // 4. Apply filters
        return list.filter(p => {
            const matchesSearch = !search ||
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.description?.toLowerCase().includes(search.toLowerCase())
            const eco = getProviderEcosystem(p.key, p.category)
            const matchesCategory = category === "all" || p.category === category || eco.id === category
            return matchesSearch && matchesCategory
        })
    }, [providers, search, category, isAiSuspended, isAiSaaS, aiGovernance, aiCredentials.length])

    const getProviderIcon = (key: string, category: string) => {
        if (PROVIDER_ICONS[key]) return PROVIDER_ICONS[key]
        const found = MARKETPLACE_CATEGORIES.find(c => c.key === category)
        return found?.icon || '🔌'
    }

    const handleConfigure = (provider: IntegrationProvider) => {
        if (provider.key === 'ai-engine') {
            setIsAIEngineOpen(true)
            return
        }
        setSelectedProvider(provider)
        setIsSheetOpen(true)
    }

    const getExistingConnection = (providerKey: string) => {
        return installedIntegrations.find(i => i.provider_key === providerKey)
    }

    const installedCount = installedIntegrations.length
    const totalCount = providers.length

    const filterOptions: FilterOption[] = useMemo(() => {
        const AI_KEYS = ['openai', 'anthropic', 'groq', 'google']
        const baseList = providers.filter(p => !AI_KEYS.includes(p.key) && p.key !== 'evolution_api')
        const allList = [{ key: 'ai-engine', category: 'ai' }, ...baseList]

        const counts: Record<string, number> = {
            all: allList.length,
            dev_tasks: 0,
            messaging_crm: 0,
            finance: 0,
            platform: 0,
            productivity: 0
        }

        allList.forEach(item => {
            const eco = getProviderEcosystem(item.key, item.category)
            if (counts[eco.id] !== undefined) {
                counts[eco.id]++
            }
        })

        return [
            { id: 'all', label: 'Todas las integraciones', count: counts.all, color: 'zinc' },
            { id: 'dev_tasks', label: '🛠️ Desarrollo & Tareas', count: counts.dev_tasks, color: 'blue' },
            { id: 'messaging_crm', label: '💬 Mensajería & CRM', count: counts.messaging_crm, color: 'emerald' },
            { id: 'finance', label: '💳 Facturación & Finanzas', count: counts.finance, color: 'amber' },
            { id: 'platform', label: '🔮 Plataforma & IA', count: counts.platform, color: 'purple' },
            { id: 'productivity', label: '📅 Productividad', count: counts.productivity, color: 'zinc' }
        ]
    }, [providers])

    return (
        <div className="space-y-6">
            {/* Header */}
            {/* Standardized Header */}
            <SectionHeader
                title="Marketplace de Integraciones"
                subtitle="Conecta apps y servicios externos para potenciar tus flujos de trabajo, automatizaciones y proyectos en Pixy"
                icon={Puzzle}
                action={
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-2xl font-bold">{installedCount}/{totalCount}</p>
                            <p className="text-xs text-muted-foreground">Instaladas</p>
                        </div>
                    </div>
                }
            />

            {/* Search & Filters */}
            <div className="sticky top-4 z-30">
                <SearchFilterBar
                    searchTerm={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Buscar integraciones..."
                    activeFilter={category}
                    onFilterChange={setCategory}
                    filters={filterOptions}
                />
            </div>

            {/* Provider Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProviders.map(provider => {
                    const isAiCard = provider.key === 'ai-engine'
                    const isMock = MOCK_OR_UNIMPLEMENTED_PROVIDERS.has(provider.key)
                    const ecosystem = getProviderEcosystem(provider.key, provider.category)
                    let isInstalled = installedKeys.has(provider.key)

                    if (isAiCard) {
                        isInstalled = aiCredentials.length > 0
                    }

                    // Dynamic border ring
                    let cardRing = ''
                    if (isAiCard) {
                        if (isAiSuspended) cardRing = 'ring-2 ring-red-500/50 dark:ring-red-500/30'
                        else if (isAiSaaS) cardRing = 'ring-2 ring-indigo-500/50 dark:ring-indigo-500/30'
                        else if (isInstalled) cardRing = 'ring-2 ring-emerald-500/50 dark:ring-emerald-500/30'
                        else cardRing = 'ring-2 ring-amber-500/40 dark:ring-amber-500/25'
                    } else if (isInstalled) {
                        cardRing = 'ring-2 ring-emerald-500/50 dark:ring-emerald-500/30'
                    }

                    return (
                        <Card key={provider.id} className={`glass-card rounded-2xl relative overflow-hidden transition-all hover:shadow-md border-transparent ${cardRing}`}>
                            {isMock ? (
                                <Badge variant="outline" className="absolute top-3 right-3 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[10px] font-semibold gap-1">
                                    <Clock className="h-3 w-3" />
                                    Próximamente
                                </Badge>
                            ) : isAiCard ? (
                                isAiSuspended ? (
                                    <Badge className="absolute top-3 right-3 bg-red-500 text-white hover:bg-red-600 text-[10px] font-semibold">
                                        Servicio Pausado
                                    </Badge>
                                ) : isAiSaaS ? (
                                    <Badge className="absolute top-3 right-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 text-[10px] font-semibold gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        Incluido en tu Plan
                                    </Badge>
                                ) : (
                                    <Badge className="absolute top-3 right-3 bg-amber-500 text-white hover:bg-amber-600 text-[10px] font-semibold">
                                        Claves Propias
                                    </Badge>
                                )
                            ) : (
                                provider.is_premium && (
                                    <Badge className="absolute top-3 right-3 bg-amber-500 text-white hover:bg-amber-600">
                                        <Crown className="h-3 w-3 mr-1" />
                                        Premium
                                    </Badge>
                                )
                            )}

                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-2xl ${isAiCard
                                        ? isAiSuspended
                                            ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                                            : isAiSaaS
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20'
                                        : 'bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900'
                                        }`}>
                                        {getProviderIcon(provider.key, provider.category)}
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">{provider.name}</CardTitle>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                            <Badge variant="secondary" className="text-[10px]">
                                                {provider.category}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                                                {ecosystem.label}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <CardDescription className="line-clamp-2 min-h-[40px]">
                                    {provider.description || 'Sin descripción'}
                                </CardDescription>
                            </CardContent>

                            <CardFooter className="pt-0">
                                {isMock ? (
                                    <Button
                                        variant="outline"
                                        disabled
                                        className="w-full gap-1.5 text-xs text-muted-foreground opacity-60 cursor-not-allowed bg-muted/20"
                                    >
                                        <Clock className="h-3.5 w-3.5" />
                                        Próximamente
                                    </Button>
                                ) : isAiCard ? (
                                    isAiSuspended ? (
                                        <Button
                                            variant="destructive"
                                            className="w-full gap-2 text-xs font-semibold"
                                            onClick={() => handleConfigure(provider)}
                                        >
                                            <ShieldAlert className="h-4 w-4" />
                                            Ver Estado (Pausado)
                                        </Button>
                                    ) : isAiSaaS ? (
                                        <Button
                                            variant="default"
                                            className="w-full gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:to-purple-700 text-white shadow-md text-xs font-semibold border-0"
                                            onClick={() => handleConfigure(provider)}
                                        >
                                            <Zap className="h-4 w-4" />
                                            Panel de IA Gestionada
                                        </Button>
                                    ) : isInstalled ? (
                                        <Button
                                            variant="secondary"
                                            className="w-full gap-2 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-xs font-semibold"
                                            onClick={() => handleConfigure(provider)}
                                        >
                                            <Check className="h-4 w-4" />
                                            Administrar Claves
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="default"
                                            className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:to-amber-600 hover:to-amber-700 text-white shadow-md text-xs font-semibold border-0"
                                            onClick={() => handleConfigure(provider)}
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Conectar Claves
                                        </Button>
                                    )
                                ) : isInstalled ? (
                                    <Button
                                        variant="secondary"
                                        className="w-full gap-2 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                        onClick={() => handleConfigure(provider)}
                                    >
                                        <Check className="h-4 w-4" />
                                        Configurar
                                    </Button>
                                ) : (
                                    <Button
                                        variant="default"
                                        className="w-full gap-2"
                                        onClick={() => handleConfigure(provider)}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Conectar
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            {filteredProviders.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        No se encontraron integraciones. Intenta con otro término de búsqueda.
                    </p>
                </div>
            )}

            {/* Configuration Sheet */}
            <IntegrationSetupSheet
                provider={selectedProvider}
                existingConnection={selectedProvider ? getExistingConnection(selectedProvider.key) : undefined}
                isOpen={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />

            {/* AI Engine Sheet */}
            <AIEngineSheet
                open={isAIEngineOpen}
                onOpenChange={setIsAIEngineOpen}
                credentials={aiCredentials}
                providers={aiProviders}
                aiGovernance={aiGovernance}
            />
        </div>
    )
}

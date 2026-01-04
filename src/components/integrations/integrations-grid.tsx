"use client"

import { useState } from "react"
import { IntegrationCard, IntegrationProvider } from "@/components/integrations/integration-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, Facebook, Mail, CreditCard, Bot, MessageSquare, Megaphone, Smartphone } from "lucide-react"
import { ConnectionWizard } from "./connection-wizard"
import { Connection } from "@/modules/core/integrations/actions"

// Mock Providers Configuration
// Mock Providers Configuration
const PROVIDERS: IntegrationProvider[] = [
    {
        key: 'meta_whatsapp',
        name: 'WhatsApp Business (Official)',
        description: 'Connect your Official WhatsApp Business API account via Meta.',
        icon: MessageSquare,
        category: 'messaging',
        status: 'disconnected',
        colorClass: 'bg-gradient-to-r from-emerald-500 to-teal-600'
    },
    {
        key: 'evolution_api',
        name: 'WhatsApp (Evolution API)',
        description: 'Connect your own WhatsApp number using the unofficial Evolution API server.',
        icon: Smartphone,
        category: 'messaging',
        status: 'disconnected',
        colorClass: 'bg-gradient-to-r from-green-600 to-emerald-800'
    },
    {
        key: 'meta_instagram',
        name: 'Instagram Direct',
        description: 'Manage Instagram DMs and comments from your unified inbox.',
        icon: Smartphone, // Instagram icon usually distinct, but using lucide for now
        category: 'messaging',
        status: 'disconnected',
        colorClass: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500'
    },
    {
        key: 'google_mail',
        name: 'Gmail / Google Workspace',
        description: 'Sync emails, calendar events, and contacts with Google.',
        icon: Mail,
        category: 'messaging',
        status: 'disconnected',
        colorClass: 'bg-gradient-to-r from-red-500 to-orange-600'
    },
    {
        key: 'stripe',
        name: 'Stripe Payments',
        description: 'Process payments, send invoices, and track subscription revenue.',
        icon: CreditCard,
        category: 'finance',
        status: 'disconnected',
        colorClass: 'bg-gradient-to-r from-indigo-500 to-purple-600'
    },
    {
        key: 'openai',
        name: 'OpenAI (ChatGPT)',
        description: 'Power your AI features with your own API key for custom fine-tuning.',
        icon: Bot,
        category: 'tools',
        status: 'disconnected',
        colorClass: 'bg-gradient-to-r from-emerald-900 to-zinc-900' // Darker/Sleeker for AI
    },
    {
        key: 'meta_ads',
        name: 'Meta Ads',
        description: 'Track ad performance and sync leads directly to the CRM.',
        icon: Megaphone,
        category: 'crm',
        status: 'disconnected',
        colorClass: 'bg-gradient-to-r from-blue-500 to-cyan-500'
    }
]

interface IntegrationsGridProps {
    initialConnections: Connection[]
}

export function IntegrationsGrid({ initialConnections }: IntegrationsGridProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("all")
    const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null)
    const [isWizardOpen, setIsWizardOpen] = useState(false)

    // Merge active connections with providers
    const providersWithStatus = PROVIDERS.map(p => {
        const activeConn = initialConnections.find(c => c.provider_key === p.key && c.status === 'active')
        const count = initialConnections.filter(c => c.provider_key === p.key && c.status === 'active').length

        return {
            ...p,
            status: activeConn ? 'connected' : 'disconnected',
            connectionCount: count > 0 ? count : undefined
        } as IntegrationProvider
    })

    // Filter logic
    const filteredProviders = providersWithStatus.filter(provider => {
        const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            provider.description.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesTab = activeTab === "all" || provider.category === activeTab
        return matchesSearch && matchesTab
    })

    const handleConnect = (provider: IntegrationProvider) => {
        setSelectedProvider(provider)
        setIsWizardOpen(true)
    }

    const handleManage = (provider: IntegrationProvider) => {
        // For now, just re-open wizard to add another or ideally go to details
        // In this MVP, we treat "Manage" as "Connect Another" or "View Details"
        console.log(`Manage ${provider.key}`)
    }

    return (
        <div className="space-y-6">
            <ConnectionWizard
                open={isWizardOpen}
                onOpenChange={setIsWizardOpen}
                provider={selectedProvider}
            />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={setActiveTab}>
                    <TabsList className="bg-white/5 border border-white/10">
                        <TabsTrigger value="all">Todos</TabsTrigger>
                        <TabsTrigger value="messaging">Mensajería</TabsTrigger>
                        <TabsTrigger value="finance">Finanzas</TabsTrigger>
                        <TabsTrigger value="tools">Herramientas</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar integraciones..."
                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-brand-pink"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProviders.map((provider) => (
                    <IntegrationCard
                        key={provider.key}
                        provider={provider}
                        onConnect={() => handleConnect(provider)}
                        onManage={() => handleManage(provider)}
                    />
                ))}
            </div>

            {filteredProviders.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No se encontraron integraciones.</p>
                </div>
            )}
        </div>
    )
}

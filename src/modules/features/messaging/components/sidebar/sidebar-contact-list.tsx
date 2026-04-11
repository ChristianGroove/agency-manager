"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { Virtuoso } from "react-virtuoso"
import { Search, UserPlus, MessageCircle, Phone, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/modules/infrastructure/utils/utils"
import { getSidebarContacts, SidebarContact } from "@/modules/features/crm/services/logic/contact-actions"
import { toast } from "sonner"
import { createConversation } from "@/modules/features/messaging/conversation-management-actions"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getChannels } from "@/modules/features/channels/actions"
import { getCurrentUserPermissions } from "@/modules/core/settings/actions/team"
import { Channel as ChannelType } from "@/modules/features/channels/types"
import { supabase } from "@/modules/core/database/supabase"

interface SidebarContactListProps {
    onSelectConversation: (id: string | null) => void
    organizationId: string | null
    userPermissions: any
}

export function SidebarContactList({ 
    onSelectConversation, 
    organizationId: propOrgId, 
    userPermissions: propPermissions 
}: SidebarContactListProps) {
    const { t } = useTranslation()
    const [contacts, setContacts] = useState<SidebarContact[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const router = useRouter()

    // Channel selection state
    const [channels, setChannels] = useState<ChannelType[]>([])
    const [selectedChannelId, setSelectedChannelId] = useState<string>("default")

    // Effective identity data
    const [localPermissions, setLocalPermissions] = useState<any>(null)
    const effectivePermissions = propPermissions || localPermissions

    const hasGlobalView = useMemo(() => {
        const role = effectivePermissions?.role?.toLowerCase();
        const isGlobalRole = role === 'owner' || role === 'dueño' || role === 'admin' || role === 'administrador';
        
        return isGlobalRole || 
               effectivePermissions?.permissions?.all === true || 
               effectivePermissions?.permissions?.['inbox.conversations.view_all'] === true
    }, [effectivePermissions])

    useEffect(() => {
        const fetchUserDataAndChannels = async () => {
            try {
                // If perms aren't provided, fetch them once here
                if (!propPermissions && !localPermissions) {
                    const perms = await getCurrentUserPermissions()
                    setLocalPermissions(perms)
                }

                const allChannels = await getChannels()
                let availableChannels = allChannels
                
                const isRestricted = !hasGlobalView
                const authorizedChannels = effectivePermissions?.permissions?.inbox_access || []

                if (isRestricted) {
                    availableChannels = allChannels.filter(c => authorizedChannels.includes(c.id))
                }

                // Only keep WhatsApp channels for new outbound chats
                const waChannels = availableChannels.filter(c => c.provider_key === 'whatsapp_cloud' || c.provider_key === 'meta_whatsapp')
                setChannels(waChannels)

                if (waChannels.length > 0) {
                    setSelectedChannelId(waChannels[0].id)
                }
            } catch (error) {
                console.error("Failed to load channels", error)
            }
        }
        fetchUserDataAndChannels()
    }, [propPermissions, hasGlobalView]) // Broken circular dependency with effectivePermissions

    // Debounced search
    const performSearch = async (query: string) => {
        setLoading(true)
        try {
            const data = await getSidebarContacts(query)
            setContacts(data)
        } catch (error) {
            console.error("Error fetching sidebar contacts:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        performSearch("")
    }, [])

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchQuery(value)

        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(() => {
            performSearch(value)
        }, 300)
    }

    const isPhoneNumber = (query: string) => {
        const digits = query.replace(/\D/g, '')
        return digits.length >= 7
    }

    const handleStartChat = async (contact: SidebarContact | { phone: string, name?: string }) => {
        const phone = 'phone' in contact ? contact.phone : undefined
        const contactId = 'id' in contact ? contact.id : undefined
        const isDirectDial = contactId === 'new-direct-dial'

        if (!phone && !contactId) return

        const toastId = toast.loading(t('crm.inbox.sidebar.starting_chat' as any) || "Starting chat...")
        try {
            const payload: any = { channel: 'whatsapp' }

            if (isDirectDial && phone) {
                payload.phone = phone
            } else if (contactId && !isDirectDial) {
                payload.client_id = contactId
            } else if (phone) {
                payload.phone = phone
            }

            if (selectedChannelId && selectedChannelId !== 'default') {
                payload.connection_id = selectedChannelId
            }

            const result = await createConversation(payload)

            if (result.success && result.data) {
                onSelectConversation(result.data.id)
                toast.success(t('crm.inbox.sidebar.chat_opened' as any) || "Chat opened", { id: toastId })
            } else {
                toast.error(result.error || "Could not start chat", { id: toastId })
            }

        } catch (error) {
            console.error(error)
            toast.error("Error starting chat", { id: toastId })
        }
    }

    const displayContacts = [...contacts]
    if (searchQuery && isPhoneNumber(searchQuery)) {
        const exists = contacts.some(c => c.phone?.replace(/\D/g, '') === searchQuery.replace(/\D/g, ''))
        if (!exists) {
            displayContacts.unshift({
                id: 'new-direct-dial',
                name: searchQuery,
                phone: searchQuery,
                avatar_url: null,
                last_contacted_at: new Date().toISOString()
            } as any)
        }
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
            <div className="px-4 pb-2 pt-2 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('crm.inbox.sidebar.search_contacts_placeholder')}
                        value={searchQuery}
                        onChange={handleSearch}
                        className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-none shadow-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-offset-0"
                    />
                </div>

                {channels.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-md border border-zinc-100 dark:border-zinc-800">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap pl-1">
                            {t('crm.inbox.sidebar.send_from' as any) || 'Enviar desde:'}
                        </span>
                        <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                            <SelectTrigger className="h-7 text-xs border-none shadow-none bg-transparent focus:ring-0 w-full px-1 justify-end flex-row-reverse gap-1 text-right text-foreground font-medium">
                                <SelectValue placeholder="Default Line" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {channels.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                        {c.connection_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-0">
                {loading && contacts.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        {t('crm.inbox.sidebar.loading')}
                    </div>
                ) : displayContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60">
                        <UserPlus className="h-8 w-8 mb-3 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">{t('crm.inbox.sidebar.no_contacts')}</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                            {t('crm.inbox.sidebar.no_contacts_desc')}
                        </p>
                    </div>
                ) : (
                    <Virtuoso
                        style={{ height: '100%' }}
                        totalCount={displayContacts.length}
                        data={displayContacts}
                        itemContent={(index, contact) => (
                            <div
                                onClick={() => handleStartChat(contact)}
                                className={cn(
                                    "border-b border-border/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer",
                                    contact.id === 'new-direct-dial' && "bg-indigo-50/50 dark:bg-indigo-900/10"
                                )}>
                                <div className="p-3 flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border border-border/50">
                                        <AvatarImage src={contact.avatar_url || undefined} />
                                        <AvatarFallback className={cn(
                                            "bg-brand-pink/10 text-brand-pink font-medium text-xs",
                                            contact.id === 'new-direct-dial' && "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300"
                                        )}>
                                            {contact.id === 'new-direct-dial' ? <Phone className="h-4 w-4" /> : (contact.name?.substring(0, 2).toUpperCase() || 'UN')}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <h4 className="text-sm font-semibold truncate text-foreground">
                                                {contact.id === 'new-direct-dial' ? t('crm.inbox.sidebar.direct_dial', { name: contact.name }) : (contact.name || t('crm.inbox.chat.unknown_user'))}
                                            </h4>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                            {contact.id === 'new-direct-dial' ? (
                                                <span className="text-indigo-600 dark:text-indigo-400">{t('crm.inbox.sidebar.start_chat')}</span>
                                            ) : (
                                                <>
                                                    {contact.company_name && (
                                                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                                                            <Building2 className="h-3 w-3" />
                                                            {contact.company_name}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1", contact.id === 'new-direct-dial' && "opacity-100")}>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-transparent"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                )}
            </div>
        </div>
    )
}

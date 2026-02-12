"use client"

import { useEffect, useState, useRef } from "react"
import { Virtuoso } from "react-virtuoso"
import { Search, UserPlus, MessageCircle, Phone, Mail, Building2, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getSidebarContacts, SidebarContact } from "@/modules/core/crm/contact-actions"
import { toast } from "sonner"
// We need an action to create/find conversation. 
// Assuming createConversation exists or we mock it for now.
import { createConversation } from "@/modules/core/messaging/conversation-management-actions"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/i18n/use-translation"

interface SidebarContactListProps {
    onSelectConversation: (id: string) => void
}

export function SidebarContactList({ onSelectConversation }: SidebarContactListProps) {
    const { t } = useTranslation()
    const [contacts, setContacts] = useState<SidebarContact[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const router = useRouter()

    // Debounced search
    const performSearch = async (query: string) => {
        setLoading(true)
        try {
            console.log("Fetching sidebar contacts with query:", query)
            const data = await getSidebarContacts(query)
            console.log("Received sidebar contacts:", data)
            setContacts(data)
        } catch (error) {
            console.error("Error fetching sidebar contacts:", error)
            toast.error("Failed to load contacts")
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
        // Simple check: mostly digits, at least 7 chars
        const digits = query.replace(/\D/g, '')
        return digits.length >= 7
    }

    const handleStartChat = async (contact: SidebarContact | { phone: string, name?: string }) => {
        const phone = 'phone' in contact ? contact.phone : undefined
        const contactId = 'id' in contact ? contact.id : undefined
        const isDirectDial = contactId === 'new-direct-dial'

        if (!phone && !contactId) {
            toast.error("Invalid contact")
            return
        }

        const toastId = toast.loading("Starting chat...")
        try {
            // Use updated createConversation with client_id OR phone support
            const payload: any = { channel: 'whatsapp' }

            if (isDirectDial && phone) {
                // Direct Dial: send phone number, NOT the fake 'new-direct-dial' ID
                payload.phone = phone
            } else if (contactId && !isDirectDial) {
                payload.client_id = contactId
            } else if (phone) {
                payload.phone = phone
            }

            const result = await createConversation(payload)

            if (result.success && result.data) {
                onSelectConversation(result.data.id)
                toast.success("Chat opened", { id: toastId })
            } else {
                toast.error(result.error || "Could not start chat", { id: toastId })
            }

        } catch (error) {
            console.error(error)
            toast.error("Error starting chat", { id: toastId })
        }
    }

    // Combine contacts with "Direct Dial" option if applicable
    const displayContacts = [...contacts]
    if (searchQuery && isPhoneNumber(searchQuery)) {
        // Check if exact match exists to avoid duplicate
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
            {/* Header Area */}
            <div className="px-4 pb-2 pt-2 space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('crm.inbox.sidebar.search_contacts_placeholder')}
                        value={searchQuery}
                        onChange={handleSearch}
                        className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-none shadow-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-offset-0"
                    />
                </div>
            </div>

            {/* Contact List */}
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
                            <div className={cn(
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
                                            {/* Status Badge */}
                                            {contact.status && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium uppercase tracking-tight">
                                                    {contact.status}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                                            {contact.id === 'new-direct-dial' ? (
                                                <span className="text-indigo-600 dark:text-indigo-400">{t('crm.inbox.sidebar.start_chat')}</span>
                                            ) : (
                                                <>
                                                    {contact.company_name && (
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="h-3 w-3" />
                                                            {contact.company_name}
                                                        </span>
                                                    )}
                                                    {contact.email && (
                                                        <span className="flex items-center gap-1 truncate">
                                                            <Mail className="h-3 w-3" />
                                                            {contact.email}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions - Visible on Hover */}
                                    <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1", contact.id === 'new-direct-dial' && "opacity-100")}>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 rounded-full bg-brand-pink/10 text-brand-pink hover:bg-brand-pink hover:text-white"
                                            onClick={() => handleStartChat(contact)}
                                            title={t('crm.inbox.sidebar.tabs.conversations')}
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

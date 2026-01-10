'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Search, UserPlus, Check } from 'lucide-react'
import { getOrganizationMembers } from '@/modules/core/settings/actions/team-actions'
import { assignLeads } from '../crm-advanced-actions'
import { toast } from 'sonner'
// Removed useQuery dependency to avoid install issues, using useEffect

interface AssignLeadSheetProps {
    open: boolean
    onClose: () => void
    leadIds: string[]
    currentAssigneeId?: string
    onSuccess: () => void
}

export function AssignLeadSheet({ open, onClose, leadIds, currentAssigneeId, onSuccess }: AssignLeadSheetProps) {
    const [search, setSearch] = useState('')
    const [selectedUserId, setSelectedUserId] = useState<string | null>(currentAssigneeId || null)
    const [assigning, setAssigning] = useState(false)
    const [members, setMembers] = useState<any[]>([])
    const [loadingMembers, setLoadingMembers] = useState(false)

    useEffect(() => {
        if (open) {
            loadMembers()
        }
    }, [open])

    async function loadMembers() {
        setLoadingMembers(true)
        try {
            const data = await getOrganizationMembers()
            setMembers(data || [])
        } catch (error) {
            console.error('Error loading members:', error)
            toast.error('Error cargando miembros del equipo')
        } finally {
            setLoadingMembers(false)
        }
    }

    const filteredMembers = members.filter(member => {
        const term = search.toLowerCase()
        const name = member.user?.full_name?.toLowerCase() || ''
        const email = member.user?.email?.toLowerCase() || ''
        return name.includes(term) || email.includes(term)
    })

    async function handleAssign() {
        setAssigning(true)
        try {
            const result = await assignLeads({
                lead_ids: leadIds,
                assigned_to: selectedUserId
            })

            if (result.success) {
                toast.success(selectedUserId ? 'Lead asignado exitosamente' : 'Lead desasignado')
                onSuccess()
                onClose()
            } else {
                toast.error('Error al asignar lead')
            }
        } catch (error) {
            console.error('Assign error:', error)
            toast.error('Error al asignar lead')
        } finally {
            setAssigning(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent
                className="
                    sm:max-w-[500px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur-xl">
                    <SheetHeader className="px-6 py-4 bg-white/80 dark:bg-zinc-900/80 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white">Asignar Lead{leadIds.length > 1 ? 's' : ''}</SheetTitle>
                                <SheetDescription>Selecciona un miembro del equipo para asignar</SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar miembro..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-11 bg-white dark:bg-zinc-800"
                            />
                        </div>

                        {/* Members List */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider pl-1">Miembros del Equipo</h4>

                            <ScrollArea className="h-[400px] pr-4">
                                {loadingMembers ? (
                                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        <span className="text-xs">Cargando miembros...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div
                                            className={`
                                                flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all
                                                ${selectedUserId === null
                                                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/50'
                                                    : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-500'}
                                            `}
                                            onClick={() => setSelectedUserId(null)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                                    <UserPlus className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-semibold block text-gray-900 dark:text-white">Sin Asignar</span>
                                                    <span className="text-xs text-muted-foreground">Dejar lead libre</span>
                                                </div>
                                            </div>
                                            {selectedUserId === null && (
                                                <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm">
                                                    <Check className="h-3.5 w-3.5" />
                                                </div>
                                            )}
                                        </div>

                                        {filteredMembers.map((member) => (
                                            <div
                                                key={member.user_id}
                                                className={`
                                                    flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all
                                                    ${selectedUserId === member.user_id
                                                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/50'
                                                        : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-500'}
                                                `}
                                                onClick={() => setSelectedUserId(member.user_id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-gray-200 dark:border-zinc-700">
                                                        <AvatarImage src={member.user?.avatar_url || ''} />
                                                        <AvatarFallback>{member.user?.full_name?.[0] || 'U'}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{member.user?.full_name || 'Usuario'}</p>
                                                        <p className="text-xs text-muted-foreground">{member.role}</p>
                                                    </div>
                                                </div>
                                                {selectedUserId === member.user_id && (
                                                    <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm">
                                                        <Check className="h-3.5 w-3.5" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>

                    <SheetFooter className="p-6 bg-white/80 dark:bg-zinc-800/80 border-t border-gray-100 dark:border-white/5 backdrop-blur-md flex flex-row justify-between gap-3 sm:space-x-0">
                        <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAssign}
                            disabled={assigning}
                            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 dark:shadow-none"
                        >
                            {assigning ? 'Asignando...' : 'Confirmar Asignación'}
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    )
}

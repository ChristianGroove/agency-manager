import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle2, Clock, Archive, Trash2, Phone, Sidebar, X, Check } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { Conversation } from "@/modules/features/messaging/hooks/use-chat-logic"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { completeConversation, snoozeConversation, archiveConversation, deleteConversation } from "@/modules/features/messaging/conversation-actions"

interface ChatHeaderProps {
    conversation: Conversation | null
    conversationId: string
    isContextOpen: boolean
    onToggleContext: () => void
    callStatus: any
    incomingCall: { call_id: string, from: string } | null
    setIncomingCall: (call: any) => void
    setIsTemplatePickerOpen: (open: boolean) => void
    onSendInteractiveCall: () => void
}

export function ChatHeader({
    conversation,
    conversationId,
    isContextOpen,
    onToggleContext,
    callStatus,
    incomingCall,
    setIncomingCall,
    setIsTemplatePickerOpen,
    onSendInteractiveCall
}: ChatHeaderProps) {
    const { t } = useTranslation()
    const router = useRouter()

    const leadName = conversation?.clients?.name || conversation?.leads?.name || conversation?.clients?.phone || conversation?.leads?.phone || t('crm.inbox.chat.unknown_user')

    const handleAction = async (action: 'resolve' | 'snooze' | 'archive' | 'delete') => {
        window.dispatchEvent(new CustomEvent('pixy:conversation-deleted', { detail: { conversationId } }));
        router.push('/inbox')

        if (action === 'resolve') {
            toast.success(t('crm.inbox.context.actions.resolved'))
            await completeConversation(conversationId)
        } else if (action === 'snooze') {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            toast.success(t('crm.inbox.context.actions.snoozed_tomorrow'))
            await snoozeConversation(conversationId, tomorrow)
        } else if (action === 'archive') {
            toast.success(t('crm.inbox.context.actions.archived'))
            await archiveConversation(conversationId)
        } else if (action === 'delete') {
            if (window.confirm("¿Seguro que quieres eliminar esta conversación?")) {
                toast.success("Eliminando conversación...")
                await deleteConversation(conversationId)
            }
        }
    }

    return (
        <>
            <div className="h-16 border-b flex items-center justify-between px-4 bg-white dark:bg-zinc-900 shadow-sm z-10 w-full shrink-0">
                <div className="flex items-center gap-3">
                    <div className="shrink-0">
                        {(() => {
                            if (!conversation) return <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />;
                            const combined = `${conversation.channel || ''} ${(conversation as any).integration_connections?.provider_key || ''}`.toLowerCase();
                            const icon = combined.includes('whatsapp') || combined.includes('evolution') ? 'whatsapp' :
                                         combined.includes('messenger') || combined.includes('facebook') ? 'messenger' :
                                         combined.includes('instagram') ? 'instagram' : 'whatsapp';
                            return <img src={`/social media icons/${icon}.png`} className="h-9 w-9 object-contain drop-shadow-sm" alt="Channel" />;
                        })()}
                    </div>

                    <div className="flex flex-col justify-center min-w-[120px]">
                        {!conversation ? (
                            <div className="space-y-1.5 py-0.5">
                                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                                <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-sm leading-none text-foreground">{leadName}</h3>
                                    {conversation?.leads?.status && (
                                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-normal text-muted-foreground border-zinc-200 dark:border-zinc-800">
                                            {conversation.leads.status}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <span className="capitalize">{conversation?.channel || 'Unknown'}</span>
                                    <span className="opacity-50">•</span>
                                    <span className="font-mono opacity-70">{conversation?.id.slice(0, 8)}</span>
                                </p>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-50" onClick={() => handleAction('resolve')}>
                                    <CheckCircle2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('crm.inbox.context.actions.resolve')}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50" onClick={() => handleAction('snooze')}>
                                    <Clock className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('crm.inbox.context.actions.snooze')}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-zinc-900" onClick={() => handleAction('archive')}>
                                    <Archive className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('crm.inbox.context.actions.archive')}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => handleAction('delete')}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('common.delete')}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <div className="w-px h-4 bg-border mx-1" />

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={!callStatus?.callingEnabled}
                                    className={cn("h-8 w-8 transition-colors", callStatus?.permStatus?.hasPermission ? "text-green-600" : callStatus?.isSessionActive ? "text-blue-600" : "text-muted-foreground")}
                                    onClick={() => {
                                        if (callStatus?.permStatus?.hasPermission) toast.info("Iniciando llamada...");
                                        else if (callStatus?.isSessionActive) onSendInteractiveCall();
                                        else setIsTemplatePickerOpen(true);
                                    }}
                                >
                                    <Phone className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {!callStatus?.callingEnabled ? "Llamadas desactivadas" :
                                 callStatus?.permStatus?.hasPermission ? "Llamar ahora" :
                                 callStatus?.isSessionActive ? "Solicitar llamada" : "Enviar plantilla de llamada"}
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={onToggleContext} className={cn("text-muted-foreground hover:text-foreground h-8 w-8", isContextOpen && "bg-muted")}>
                                    <Sidebar className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalles</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {incomingCall && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-4 flex items-center gap-4 min-w-[320px]">
                        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-pulse">
                            <Phone className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm">Llamada Entrante</h4>
                            <p className="text-xs text-muted-foreground">{incomingCall.from}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-8 rounded-full border-red-200 text-red-600" onClick={() => setIncomingCall(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                            <Button size="sm" className="h-8 rounded-full bg-green-600" onClick={() => { toast.success("Conectando..."); setIncomingCall(null); }}>
                                <Check className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

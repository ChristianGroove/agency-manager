'use client'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { History, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Execution {
    id: string
    status: string
    started_at: string
    workflow?: { name: string }
}

interface ActivitySheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    executions: Execution[]
}

export function ActivitySheet({ open, onOpenChange, executions }: ActivitySheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="
                    sm:max-w-[420px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 shrink-0 px-6 py-5 bg-white/80 backdrop-blur-md border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-pink/10 rounded-lg text-brand-pink">
                                <History className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-lg font-semibold text-gray-900">
                                    Actividad Reciente
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Ejecuciones en tiempo real
                                </p>
                            </div>
                        </div>
                        <Link href="/crm/automations/analytics">
                            <Button variant="ghost" size="sm" className="text-xs gap-1">
                                <ExternalLink className="h-3 w-3" />
                                Ver Todo
                            </Button>
                        </Link>
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1 px-6 py-4">
                        <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3 space-y-4">
                            {executions.length === 0 ? (
                                <div className="text-center py-16 pl-6 text-slate-400 text-sm">
                                    <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p>No hay actividad reciente</p>
                                </div>
                            ) : (
                                executions.map((exec) => (
                                    <div key={exec.id} className="relative pl-6 group">
                                        {/* Timeline Dot */}
                                        <div className={cn(
                                            "absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full border-2 border-white transition-all group-hover:scale-125",
                                            exec.status === 'success' ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" :
                                                exec.status === 'failed' ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]" :
                                                    "bg-blue-500 animate-pulse"
                                        )} />

                                        <div className="flex flex-col gap-1 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-mono text-slate-400" suppressHydrationWarning>
                                                    {new Date(exec.started_at).toLocaleTimeString()}
                                                </span>
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px] h-5 px-1.5 border-0",
                                                    exec.status === 'success' ? "bg-emerald-50 text-emerald-700" :
                                                        exec.status === 'failed' ? "bg-red-50 text-red-700" :
                                                            "bg-blue-50 text-blue-700"
                                                )}>
                                                    {exec.status === 'success' ? 'Éxito' : exec.status === 'failed' ? 'Error' : 'En curso'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm font-medium text-slate-800 line-clamp-1">
                                                {exec.workflow?.name || "Workflow Desconocido"}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Avatar className="h-4 w-4">
                                                    <AvatarFallback className="text-[8px] bg-slate-200">SYS</AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] text-slate-400">Sistema</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="sticky bottom-0 px-6 py-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="w-full"
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

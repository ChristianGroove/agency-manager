
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Edit, Trash2, Globe, Server, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export interface HostingAccount {
    id: string
    domain_url: string
    provider_name: string
    plan_name: string
    status: string
    server_ip?: string
    renewal_date?: string
    client_id: string
}

interface HostingCardProps {
    account: HostingAccount
    onEdit: (account: HostingAccount) => void
    onDelete: (id: string) => void
}

export function HostingCard({ account, onEdit, onDelete }: HostingCardProps) {
    const [isChecking, setIsChecking] = useState(false)
    const [serverStatus, setServerStatus] = useState<'idle' | 'online' | 'offline'>('idle')
    const [latency, setLatency] = useState<number | null>(null)

    const checkStatus = async () => {
        setIsChecking(true)
        try {
            const response = await fetch(`/api/hosting/check-status?url=${encodeURIComponent(account.domain_url)}`)
            const data = await response.json()

            if (data.status === 'online') {
                setServerStatus('online')
                setLatency(data.latency)
                toast.success(`Sitio Online (${data.latency}ms)`)
            } else {
                setServerStatus('offline')
                toast.error("El sitio parece estar caído")
            }
        } catch (error) {
            setServerStatus('offline')
            toast.error("Error al verificar estado")
        } finally {
            setIsChecking(false)
        }
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-sm hover:shadow-md transition-all text-slate-900 dark:text-zinc-100">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <a href={`https://${account.domain_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold text-lg text-indigo-600 dark:text-indigo-400 hover:underline">
                        {account.domain_url}
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{account.provider_name} • {account.plan_name}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Badge className={account.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-transparent' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-transparent'}>
                        {account.status}
                    </Badge>

                    {/* Status Indicator */}
                    {serverStatus === 'online' && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Online {latency}ms</span>
                        </div>
                    )}
                    {serverStatus === 'offline' && (
                        <div className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-900/50">
                            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            <span>Offline</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mt-4 bg-gray-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                <div>
                    <span className="text-slate-400 dark:text-gray-400 block text-[10px] font-semibold uppercase tracking-wider">IP Servidor</span>
                    <span className="font-mono text-gray-700 dark:text-gray-200 font-medium text-xs">{account.server_ip || '---'}</span>
                </div>
                <div>
                    <span className="text-slate-400 dark:text-gray-400 block text-[10px] font-semibold uppercase tracking-wider">Renovación</span>
                    <span className="text-gray-700 dark:text-gray-200 font-medium text-xs">{account.renewal_date ? new Date(account.renewal_date).toLocaleDateString() : '---'}</span>
                </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs rounded-xl border-slate-200 dark:border-white/10 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                    onClick={checkStatus}
                    disabled={isChecking}
                >
                    {isChecking ? (
                        <>Verificando...</>
                    ) : (
                        <>
                            <Globe className="h-3.5 w-3.5 mr-1 text-indigo-500 dark:text-indigo-400" />
                            Ping
                        </>
                    )}
                </Button>

                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(account)} className="h-8 px-3 rounded-xl text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                        <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(account.id)} className="h-8 w-8 rounded-xl text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 p-0">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

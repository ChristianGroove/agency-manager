
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <a href={`https://${account.domain_url}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-bold text-lg text-indigo-600 hover:underline">
                        {account.domain_url}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-sm text-gray-500">{account.provider_name} • {account.plan_name}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Badge className={account.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                        {account.status}
                    </Badge>

                    {/* Status Indicator */}
                    {serverStatus === 'online' && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Online {latency}ms</span>
                        </div>
                    )}
                    {serverStatus === 'offline' && (
                        <div className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100">
                            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            <span>Offline</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mt-3 bg-gray-50 p-2 rounded-lg">
                <div>
                    <span className="text-gray-400 block text-xs">IP Servidor</span>
                    <span className="font-mono text-gray-700">{account.server_ip || '---'}</span>
                </div>
                <div>
                    <span className="text-gray-400 block text-xs">Renovación</span>
                    <span className="text-gray-700">{account.renewal_date ? new Date(account.renewal_date).toLocaleDateString() : '---'}</span>
                </div>
            </div>

            <div className="mt-3 flex justify-between items-center">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={checkStatus}
                    disabled={isChecking}
                >
                    {isChecking ? (
                        <>Verificando...</>
                    ) : (
                        <>
                            <Globe className="h-3 w-3 mr-1" />
                            Ping
                        </>
                    )}
                </Button>

                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(account)} className="h-7">
                        <Edit className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(account.id)} className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

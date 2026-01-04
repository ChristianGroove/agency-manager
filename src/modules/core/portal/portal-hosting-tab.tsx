
"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Globe, Copy, Eye, EyeOff, Server, Terminal, Lock } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PortalHostingTabProps {
    hostingAccounts: any[]
}

export function PortalHostingTab({ hostingAccounts }: PortalHostingTabProps) {
    if (!hostingAccounts || hostingAccounts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed border-gray-200">
                <div className="bg-gray-50 p-4 rounded-full mb-4">
                    <Server className="h-8 w-8 text-indigo-200" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Sin Servicios de Hosting</h3>
                <p className="text-gray-500 max-w-sm">
                    No tienes cuentas de hosting activas asociadas a tu perfil.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Mis Servicios de Hosting</h2>
                <p className="text-gray-500 mt-1">Gestiona tus dominios y accesos técnicos.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {hostingAccounts.map((account) => (
                    <HostingAccountCard key={account.id} account={account} />
                ))}
            </div>
        </div>
    )
}

function HostingAccountCard({ account }: { account: any }) {
    const [isChecking, setIsChecking] = useState(false)
    const [status, setStatus] = useState<'idle' | 'online' | 'offline'>('idle')
    const [ping, setPing] = useState<number | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const checkStatus = async () => {
        setIsChecking(true)
        try {
            const response = await fetch(`/api/hosting/check-status?url=${encodeURIComponent(account.domain_url)}`)
            const data = await response.json()

            if (data.status === 'online') {
                setStatus('online')
                setPing(data.latency)
                toast.success(`Sitio Online (${data.latency}ms)`)
            } else {
                setStatus('offline')
                toast.error("El sitio parece estar caído")
            }
        } catch (error) {
            setStatus('offline')
            toast.error("Error al verificar estado")
        } finally {
            setIsChecking(false)
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copiado al portapapeles`)
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all group">
            {/* Header */}
            <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <a href={`https://${account.domain_url}`} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline flex items-center gap-1">
                            {account.domain_url}
                            <ExternalLink className="h-3 w-3 text-gray-400" />
                        </a>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{account.provider_name} • {account.plan_name}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className={cn(
                        "bg-white",
                        account.status === 'active' ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-gray-600"
                    )}>
                        {account.status === 'active' ? 'Activo' : account.status}
                    </Badge>
                    {/* Ping Status */}
                    {status === 'online' && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online {ping}ms
                        </div>
                    )}
                    {status === 'offline' && (
                        <div className="flex items-center gap-1 text-[10px] text-red-600 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Offline
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">

                {/* Tech Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Server className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium uppercase">IP Servidor</span>
                        </div>
                        <div className="font-mono text-gray-900 flex items-center justify-between">
                            {account.server_ip || '---'}
                            {account.server_ip && (
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(account.server_ip, 'IP')}>
                                    <Copy className="h-3 w-3 text-gray-400" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Terminal className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium uppercase">Puerto FTP</span>
                        </div>
                        <div className="font-mono text-gray-900">
                            21 / 22 (SFTP)
                        </div>
                    </div>
                </div>

                {/* Credentials Section */}
                {(account.cpanel_user || account.cpanel_password) && (
                    <div className="border border-indigo-100 bg-indigo-50/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-indigo-900 font-medium text-sm">
                                <Lock className="h-3.5 w-3.5" />
                                Accesos (cPanel / FTP)
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <><EyeOff className="h-3 w-3 mr-1" /> Ocultar</> : <><Eye className="h-3 w-3 mr-1" /> Mostrar</>}
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {/* User */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 text-xs w-16">Usuario:</span>
                                <div className="flex-1 flex items-center justify-between bg-white px-2 py-1 rounded border border-indigo-100">
                                    <span className="font-mono text-gray-700 truncate">{account.cpanel_user || '---'}</span>
                                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(account.cpanel_user, 'Usuario')}>
                                        <Copy className="h-2.5 w-2.5 text-gray-400" />
                                    </Button>
                                </div>
                            </div>

                            {/* Password */}
                            {showPassword && (
                                <div className="flex items-center justify-between text-sm animate-in fade-in zoom-in-95">
                                    <span className="text-gray-500 text-xs w-16">Pass:</span>
                                    <div className="flex-1 flex items-center justify-between bg-white px-2 py-1 rounded border border-indigo-100">
                                        <span className="font-mono text-gray-700 truncate">{account.cpanel_password || '---'}</span>
                                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(account.cpanel_password, 'Contraseña')}>
                                            <Copy className="h-2.5 w-2.5 text-gray-400" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-100">
                <div className="text-xs text-gray-400">
                    Renueva: {account.renewal_date ? new Date(account.renewal_date).toLocaleDateString() : 'N/A'}
                </div>
                <Button variant="outline" size="sm" onClick={checkStatus} disabled={isChecking} className="bg-white hover:bg-gray-50 text-indigo-600 border-indigo-200">
                    {isChecking ? 'Verificando...' : <><Globe className="h-3.5 w-3.5 mr-1.5" /> Ping Test</>}
                </Button>
            </div>
        </div>
    )
}

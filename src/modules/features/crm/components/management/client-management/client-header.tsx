import { Badge } from "@/components/ui/badge"
import { Layout, Mail, Phone } from "lucide-react"
import { Client } from "@/types"

interface ClientHeaderProps {
    client: Client
}

export function ClientHeader({ client }: ClientHeaderProps) {
    return (
        <div className="sticky top-0 z-20 flex items-start gap-6 shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
            <div className="flex-1 pt-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white truncate">
                        {client.name}
                    </h2>
                    <div className="flex items-center gap-2">
                        {(client as any).metadata?.role === 'tenant' && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-3 h-7 rounded-full text-xs font-bold">
                                ● Inquilino
                            </Badge>
                        )}
                        {(client as any).metadata?.role === 'owner' && (
                            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/20 px-3 h-7 rounded-full text-xs font-bold">
                                ● Propietario
                            </Badge>
                        )}
                        {(client as any).metadata?.role === 'buyer' && (
                            <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 px-3 h-7 rounded-full text-xs font-bold">
                                ● Comprador
                            </Badge>
                        )}
                        {(client as any).metadata?.role === 'seller' && (
                            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 px-3 h-7 rounded-full text-xs font-bold">
                                ● Vendedor
                            </Badge>
                        )}
                        {client.total_debt && client.total_debt > 0 ? (
                            <Badge variant="destructive" className="animate-pulse-slow bg-red-500 text-white border-none shadow-lg shadow-red-200 px-4 h-7 rounded-full text-xs font-bold">
                                Deuda: ${client.total_debt.toLocaleString()}
                            </Badge>
                        ) : !(client as any).metadata?.role ? (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-none px-4 h-7 rounded-full text-xs font-bold">
                                Al Día
                            </Badge>
                        ) : null}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500 dark:text-gray-400">
                    {client.company_name && (
                        <span className="flex items-center gap-2 font-medium">
                            <Layout className="h-4 w-4 text-gray-400 dark:text-gray-500" /> {client.company_name}
                        </span>
                    )}
                    <span className="flex items-center gap-2 font-medium">
                        <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" /> {client.email || '--'}
                    </span>
                    <span className="flex items-center gap-2 font-medium">
                        <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" /> {client.phone || '--'}
                    </span>
                </div>
            </div>
        </div>
    )
}

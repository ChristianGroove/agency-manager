import { Badge } from "@/components/ui/badge"
import { Layout, Mail, Phone } from "lucide-react"
import { Client } from "@/types"

interface ClientHeaderProps {
    client: Client
}

export function ClientHeader({ client }: ClientHeaderProps) {
    return (
        <div className="bg-white dark:bg-white/5 backdrop-blur-md border-b border-gray-100 dark:border-white/10 px-8 py-6 flex items-start gap-6 flex-none z-10">
            <div className="flex-1 pt-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white truncate">
                        {client.name}
                    </h2>
                    <div className="flex items-center gap-3">
                        {client.total_debt && client.total_debt > 0 ? (
                            <Badge variant="destructive" className="animate-pulse bg-red-500 text-white border-none shadow-lg shadow-red-200 px-4 h-7 rounded-full text-xs font-bold">
                                Deuda: ${client.total_debt.toLocaleString()}
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none px-4 h-7 rounded-full text-xs font-bold">
                                Al Día
                            </Badge>
                        )}
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

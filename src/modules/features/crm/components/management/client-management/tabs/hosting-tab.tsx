import { Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Client } from "@/types"

interface HostingTabProps {
    client: Client
    onEditHosting: (account: any) => void
}

export function HostingTab({
    client,
    onEditHosting
}: HostingTabProps) {
    return (
        <div className="space-y-6 m-0 animate-in fade-in-50">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Cuentas de Hosting</h3>
                    <p className="text-sm text-gray-500 font-medium">Credenciales cPanel y accesos técnicos del cliente a sus servidores.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {client.hosting_accounts && client.hosting_accounts.map((acc: any) => (
                    <div key={acc.id} className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm flex items-center justify-between group hover:border-primary transition-colors">
                        <div
                            className="flex items-center gap-4 cursor-pointer flex-1"
                            onClick={() => onEditHosting(acc)}
                        >
                            <div className={cn("p-2.5 rounded-lg", acc.status === 'suspended' ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")}>
                                <Server className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className={cn("font-bold text-sm dark:text-white", acc.status === 'suspended' && "line-through text-gray-400 dark:text-gray-600")}>{acc.domain || "Dominio no configurado"}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">IP: {acc.server_ip || '--'} • User: {acc.username || '--'}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditHosting(acc)}
                            className="text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary hover:bg-primary/10"
                        >
                            Editar
                        </Button>
                    </div>
                ))}
                
                {(!client.hosting_accounts || client.hosting_accounts.length === 0) && (
                    <div className="text-center py-12 bg-slate-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10">
                        <Server className="h-8 w-8 text-slate-300 dark:text-white/20 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">No hay servicios de hosting activos.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

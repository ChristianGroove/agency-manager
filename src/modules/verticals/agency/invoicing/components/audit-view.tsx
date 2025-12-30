"use client"

import { useEffect, useState } from "react"
import { getAuditLogs, AuditLogEntry } from "../actions/get-audit-logs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Download, Terminal, Clock, Hash, Shield, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function AuditView() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")

    useEffect(() => {
        getAuditLogs().then(setLogs).finally(() => setLoading(false))
    }, [])

    const filteredLogs = logs.filter(l =>
        l.action.toLowerCase().includes(filter.toLowerCase()) ||
        l.entity_id.includes(filter) ||
        JSON.stringify(l.metadata).toLowerCase().includes(filter.toLowerCase())
    )

    const handleExport = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Timestamp,Action,Entity,ID,Actor,Metadata\n"
            + filteredLogs.map(e => `"${e.created_at}","${e.action}","${e.entity_type}","${e.entity_id}","${e.actor_email}","${JSON.stringify(e.metadata).replace(/"/g, '""')}"`).join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `billing_audit_log_${new Date().toISOString()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-4">
            {/* Control Bar */}
            <div className="flex items-center justify-between gap-4 bg-gray-900 text-gray-100 p-4 rounded-xl shadow-lg border border-gray-800">
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-emerald-400" />
                    <h2 className="font-mono font-bold">AUDIT_LOG_V1</h2>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-500" />
                        <Input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="grep logs..."
                            className="pl-7 h-9 w-64 bg-gray-800 border-gray-700 text-xs font-mono text-gray-300 focus-visible:ring-emerald-500/50"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport} className="h-9 bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300">
                        <Download className="h-3 w-3 mr-2" />
                        CSV
                    </Button>
                </div>
            </div>

            {/* Terminal View */}
            <div className="bg-black/95 rounded-xl border border-gray-800 shadow-2xl overflow-hidden font-mono text-xs">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 border-b border-gray-800">
                    <Terminal className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-500">tail -f billing_core.log</span>
                </div>

                <ScrollArea className="h-[600px] w-full p-4">
                    {loading ? (
                        <div className="text-emerald-500/50 animate-pulse">Initializing audit sequence...</div>
                    ) : (
                        <div className="space-y-4">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="relative pl-4 border-l border-gray-800 hover:border-emerald-500/50 transition-colors group">
                                    {/* Tick */}
                                    <div className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-gray-800 group-hover:bg-emerald-500 transition-colors" />

                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3 text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(log.created_at).toISOString()}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-600">
                                                <Hash className="h-3 w-3" />
                                                {log.id.substring(0, 8)}
                                            </span>
                                            <span className="text-emerald-500/80 font-bold px-1.5 py-0.5 bg-emerald-500/10 rounded">
                                                {log.action}
                                            </span>
                                        </div>

                                        <div className="text-gray-300 pl-1">
                                            <span className="text-blue-400">[{log.entity_type}]</span> {log.entity_id}
                                            <span className="text-gray-500"> via </span>
                                            <span className="text-yellow-500/80">{log.actor_email || 'System'}</span>
                                        </div>

                                        {/* Metadata Dump */}
                                        <div className="bg-gray-900/50 p-2 rounded mt-1 border border-gray-800/50 text-gray-500 overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-auto group-hover:text-gray-400">
                                            {JSON.stringify(log.metadata, null, 2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            <p className="text-[10px] text-gray-400 text-center font-mono opacity-50">
                SECURE_LOG_STORAGE_VERIFIED • IMMUTABLE RECORD
            </p>
        </div>
    )
}

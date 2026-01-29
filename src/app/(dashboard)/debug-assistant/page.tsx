"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AssistantResult } from "@/modules/assistant/types"
import { sendMessage } from "@/modules/assistant/actions"

export default function AssistantDebugPage() {
    const [input, setInput] = useState("")
    const [logs, setLogs] = useState<{ in: string, out: AssistantResult }[]>([])
    const [loading, setLoading] = useState(false)

    const handleSend = async () => {
        if (!input.trim()) return
        setLoading(true)
        try {
            const result = await sendMessage(input, 'text')
            setLogs(prev => [...prev, { in: input, out: result }])
            setInput("")
        } catch (e: any) {
            console.error(e)
            setLogs(prev => [...prev, { in: input, out: { success: false, narrative_log: `Error: ${e.message}` } }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 space-y-8 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Pixy Assistant Debugger (Phase 0)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Ej: 'Crear cliente Bobby'"
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        <Button onClick={handleSend} disabled={loading}>
                            {loading ? "..." : "Enviar"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {logs.map((log, i) => (
                    <Card key={i} className={log.out.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                        <CardContent className="p-4 space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase">Input</p>
                            <p className="font-mono text-sm text-gray-700">{log.in}</p>
                            <div className="h-px bg-black/5 my-2" />
                            <p className="text-xs font-bold text-gray-500 uppercase">Assistant Response</p>
                            <p className="font-medium text-lg text-gray-900">{log.out.narrative_log}</p>
                            {log.out.data && (
                                <pre className="text-xs bg-black/5 p-2 rounded mt-2 overflow-auto max-h-40">
                                    {JSON.stringify(log.out.data, null, 2)}
                                </pre>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

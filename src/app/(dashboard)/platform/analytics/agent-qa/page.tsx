import { Metadata } from "next"
import { AgentQADashboard } from "./components/agent-qa-dashboard"

export const metadata: Metadata = {
    title: "Agent QA | Analytics",
    description: "Analiza el desempeño de tus agentes con IA"
}

export default function AgentQAPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Agent QA Dashboard</h1>
                <p className="text-muted-foreground">
                    Analiza el desempeño de tus agentes basándote en sus conversaciones recientes.
                </p>
            </div>
            <AgentQADashboard />
        </div>
    )
}

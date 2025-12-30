import { AlertCircle, CheckCircle2, ShieldAlert, ShieldCheck, XCircle } from "lucide-react"
import { AIValidationResult, DiagnosticFinding } from "@/modules/billing/core/types/AIValidationResult"
import { cn } from "@/lib/utils"

interface AIVerificationCardProps {
    result: AIValidationResult | null
    loading: boolean
}

export function AIVerificationCard({ result, loading }: AIVerificationCardProps) {
    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-100 rounded w-full"></div>
                <div className="h-3 bg-gray-100 rounded w-2/3"></div>
            </div>
        )
    }

    if (!result) return null

    const isSafe = result.riskLevel === 'LOW'
    const isCritical = result.riskLevel === 'HIGH'
    const isWarning = result.riskLevel === 'MEDIUM'

    return (
        <div className={cn(
            "rounded-xl border p-5 shadow-sm transition-all duration-300",
            isSafe ? "bg-green-50/50 border-green-100" :
                isCritical ? "bg-red-50/50 border-red-100" :
                    "bg-yellow-50/50 border-yellow-100"
        )}>
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
                <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    isSafe ? "bg-green-100 text-green-700" :
                        isCritical ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                )}>
                    {isSafe && <ShieldCheck className="h-6 w-6" />}
                    {isCritical && <ShieldAlert className="h-6 w-6" />}
                    {isWarning && <AlertCircle className="h-6 w-6" />}
                </div>
                <div>
                    <h3 className={cn(
                        "font-bold text-sm uppercase tracking-wide",
                        isSafe ? "text-green-900" :
                            isCritical ? "text-red-900" :
                                "text-yellow-900"
                    )}>
                        {isSafe ? "Verificación Fiscal Exitosa" :
                            isCritical ? "Bloqueo Preventivo de Emisión" :
                                "Advertencia de Calidad"}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {result.summary}
                    </p>
                </div>
            </div>

            {/* Findings List */}
            {result.findings.length > 0 && (
                <div className="space-y-3 pl-[3.25rem]">
                    {result.findings.map((finding, idx) => (
                        <div key={idx} className="bg-white/60 p-3 rounded-lg border border-gray-100/50 text-sm">
                            <div className="flex items-center gap-2 font-semibold text-gray-900 mb-1">
                                {finding.severity === 'CRITICAL' && <XCircle className="h-4 w-4 text-red-500" />}
                                {finding.severity === 'WARNING' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                                {finding.severity === 'INFO' && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                                <span>{finding.humanExplanation}</span>
                            </div>
                            {finding.suggestion && (
                                <p className="text-gray-500 text-xs ml-6">
                                    💡 Sugerencia: {finding.suggestion}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

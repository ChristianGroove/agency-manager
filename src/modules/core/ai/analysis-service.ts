
import { createClient } from '@/lib/supabase-server'
import { ProcessInstance, ProcessState } from "@/types/process-engine"

export interface AnalysisRecommendation {
    id: string
    type: 'warning' | 'opportunity' | 'action'
    message: string
    action_label?: string
    action_handler?: string
    score: number // 0-100 verification confidence
}

export class AnalysisService {

    /**
     * Analyze a Lead's Process State and History to generate non-intrusive recommendations.
     * "Copilot Mode" - Does not execute, only suggests.
     */
    static async analyzeLead(
        instance: ProcessInstance,
        currentState: ProcessState
    ): Promise<AnalysisRecommendation[]> {
        const recommendations: AnalysisRecommendation[] = []
        const now = new Date()
        const lastUpdate = new Date(instance.updated_at)
        const daysInStage = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24))

        // RULE 1: Stagnation Check
        // If in a non-terminal state for > 7 days
        if (!currentState.is_terminal && daysInStage > 7) {
            recommendations.push({
                id: 'stagnation',
                type: 'warning',
                message: `Este lead ha estado en "${currentState.name}" por ${daysInStage} días sin actividad.`,
                action_label: 'Sugerir Seguimiento',
                score: 80
            })
        }

        // RULE 2: Payment Issue
        if (instance.current_state === 'payment_issue') {
            recommendations.push({
                id: 'payment_risk',
                type: 'warning',
                message: 'Pago pendiente o rechazado detectado. El cliente podría estar en riesgo de abandono.',
                action_label: 'Contactar (Urgente)',
                score: 95
            })
        }

        // RULE 3: Negotiation Closing Opportunity
        if (instance.current_state === 'negotiation' && daysInStage > 3) {
            recommendations.push({
                id: 'closing_opp',
                type: 'opportunity',
                message: 'La negociación está madura. Considera ofrecer un incentivo de cierre rápido.',
                action_label: 'Ver Descuentos',
                score: 70
            })
        }

        // RULE 4: Intent Score (Mock AI)
        // If intent score (from context) is high but moved to 'lost'
        if (instance.current_state === 'lost' && (instance.context?.intent_score || 0) > 80) {
            recommendations.push({
                id: 'false_negative',
                type: 'opportunity',
                message: 'La IA detectó alta intención de compra antes de perderse. ¿Vale la pena un último intento?',
                action_label: 'Reactivar',
                score: 60
            })
        }

        return recommendations.sort((a, b) => b.score - a.score)
    }
}

/**
 * AI Deflection Handler - Off-Topic Query Management
 * 
 * Handles queries outside Pixy's 8 commercial intents with educational
 * deflection responses that redirect users to valid technical support topics.
 * 
 * Meta 2026 Requirement: Must NOT engage with general-purpose queries.
 */

import { OffTopicIntent, PixyBusinessIntent } from './ai-intent-validator';

/**
 * Deflection response
 */
export interface DeflectionResponse {
    /** Response message to user */
    message: string;

    /** Type of deflection */
    type: 'redirect' | 'escalate' | 'close';

    /** Suggested actions */
    suggestedActions?: string[];

    /** Should transfer to human? */
    shouldHandoff: boolean;
}

/**
 * Deflection templates for each off-topic type
 */
const DEFLECTION_TEMPLATES: Record<OffTopicIntent, DeflectionResponse> = {
    [OffTopicIntent.GENERAL_KNOWLEDGE]: {
        message: `Soy un asistente especializado para la integración técnica de Pixy. No puedo responder a esa consulta.

¿En qué tema técnico de la API puedo ayudarte?`,
        type: 'redirect',
        suggestedActions: [
            'Diagnóstico de errores',
            'Plantillas HSM',
            'Quality rating'
        ],
        shouldHandoff: false
    },

    [OffTopicIntent.CREATIVE_WRITING]: {
        message: `Soy un asistente especializado para la integración técnica de Pixy. No puedo responder a esa consulta.

¿Necesitas ayuda con algún aspecto técnico de tu integración?`,
        type: 'redirect',
        suggestedActions: [
            'Plantillas de mensajes',
            'Respuestas automáticas',
            'Flows técnicos'
        ],
        shouldHandoff: false
    },

    [OffTopicIntent.PERSONAL_ADVICE]: {
        message: `Soy un asistente especializado para la integración técnica de Pixy. No puedo responder a esa consulta.`,
        type: 'close',
        shouldHandoff: false
    },

    [OffTopicIntent.CASUAL_CHAT]: {
        message: `Hola! Soy el asistente técnico de Pixy para WhatsApp Business API.

Mi función es ayudarte con temas como:
• Resolución de errores técnicos
• Gestión de plantillas y calidad de cuenta
• Implementación de funciones avanzadas
• Facturación y costos de messaging

¿En qué puedo asistirte técnicamente hoy?`,
        type: 'redirect',
        suggestedActions: [
            'Ver errores comunes',
            'Revisar estado de cuenta',
            'Consultar precios'
        ],
        shouldHandoff: false
    },

    [OffTopicIntent.EDUCATIONAL_GENERAL]: {
        message: `Lo siento, mi función es asistirte exclusivamente con la integración técnica de WhatsApp Business API en Pixy. No puedo proporcionar educación general.

Sin embargo, puedo ayudarte con capacitación técnica sobre:
• Documentación de WhatsApp Cloud API
• Best practices de implementación
• Casos de uso técnicos de la plataforma

¿Te gustaría información sobre alguno de estos temas?`,
        type: 'redirect',
        suggestedActions: [
            'Documentación API',
            'Best practices',
            'Casos de uso'
        ],
        shouldHandoff: false
    },

    [OffTopicIntent.OUT_OF_SCOPE]: {
        message: `Lo siento, esa consulta está fuera de mi alcance técnico. Mi especialidad es la integración de WhatsApp Business API en Pixy.

Puedo ayudarte con:
• Diagnóstico técnico y errores
• Gobernanza de plantillas
• Monitoreo de cuenta
• Versionado de API
• Funciones avanzadas (Flows, Calling API)
• Facturación y precios
• Onboarding y validación

¿Hay algún tema de estos en el que pueda asistirte?`,
        type: 'redirect',
        suggestedActions: [
            'Diagnóstico de problemas',
            'Estado de plantillas',
            'Configurar funciones avanzadas',
            'Hablar con un experto'
        ],
        shouldHandoff: false
    }
};

/**
 * Multiple deflection threshold before handoff
 */
const MAX_DEFLECTIONS_BEFORE_HANDOFF = 2;

/**
 * AI Deflection Handler Class
 */
export class AIDeflectionHandler {
    private deflectionCounts: Map<string, number> = new Map();

    /**
     * Handle off-topic query with appropriate deflection
     */
    async deflect(
        message: string,
        offTopicIntent: OffTopicIntent,
        conversationId: string
    ): Promise<DeflectionResponse> {
        // Track deflection count for this conversation
        const currentCount = this.deflectionCounts.get(conversationId) || 0;
        this.deflectionCounts.set(conversationId, currentCount + 1);

        // If multiple deflections, escalate to human
        if (currentCount >= MAX_DEFLECTIONS_BEFORE_HANDOFF) {
            return this.escalateToHuman(conversationId);
        }

        // Return appropriate deflection template
        const deflection = DEFLECTION_TEMPLATES[offTopicIntent];

        return {
            ...deflection,
            // Add deflection count context
            message: this.addDeflectionContext(deflection.message, currentCount)
        };
    }

    /**
     * Escalate to human after multiple deflections
     */
    private escalateToHuman(conversationId: string): DeflectionResponse {
        // Reset deflection count
        this.deflectionCounts.delete(conversationId);

        return {
            message: `Veo que tus consultas están fuera de mi capacidad técnica. Te conectaré con un experto de soporte que podrá ayudarte mejor.

Un agente se pondrá en contacto contigo en breve. ¿Hay algo específico que quieras que el agente sepa?`,
            type: 'escalate',
            shouldHandoff: true
        };
    }

    /**
     * Add context based on deflection count
     */
    private addDeflectionContext(message: string, count: number): string {
        if (count === 1) {
            message += `\n\nSi prefieres hablar con un experto técnico, puedo conectarte con nuestro equipo de soporte.`;
        }

        return message;
    }

    /**
     * Reset deflection count for conversation
     */
    resetDeflectionCount(conversationId: string): void {
        this.deflectionCounts.delete(conversationId);
    }

    /**
     * Get current deflection count
     */
    getDeflectionCount(conversationId: string): number {
        return this.deflectionCounts.get(conversationId) || 0;
    }
}

// Singleton instance
export const aiDeflectionHandler = new AIDeflectionHandler();

/**
 * AI Handoff Manager - Human Escalation System
 * 
 * Detects when AI should transfer conversation to human agent based on:
 * - Explicit user request
 * - Multiple deflections
 * - Low confidence in classification
 * - Detected frustration
 */

import { aiDeflectionHandler } from './ai-deflection-handler';

/**
 * Handoff trigger reasons
 */
export enum HandoffTrigger {
    EXPLICIT_REQUEST = 'explicit_request',
    MULTIPLE_DEFLECTIONS = 'multiple_deflections',
    LOW_CONFIDENCE = 'low_confidence',
    USER_FRUSTRATION = 'user_frustration',
    OUT_OF_SCOPE = 'out_of_scope',
}

/**
 * Handoff result
 */
export interface HandoffResult {
    /** Should handoff to human? */
    shouldHandoff: boolean;

    /** Trigger reason */
    trigger?: HandoffTrigger;

    /** Message to user */
    message: string;

    /** Context for agent */
    agentContext?: string;
}

/**
 * Frustration indicators
 */
const FRUSTRATION_KEYWORDS = [
    'no entiendes',
    'no sirves',
    'inútil',
    'mal servicio',
    'pésimo',
    'no funciona',
    'no me ayudas',
    'horrible',
    'terrible'
];

/**
 * Explicit handoff requests
 */
const HANDOFF_REQUESTS = [
    'agente',
    'humano',
    'persona',
    'persona real',
    'soporte',
    'técnico',
    'experto',
    'alguien que sepa',
    'hablar con alguien'
];

/**
 * AI Handoff Manager Class
 */
export class AIHandoffManager {
    private readonly maxDeflectionsBeforeHandoff = 2;
    private readonly lowConfidenceThreshold = 0.5;

    /**
     * Check if conversation should be handed off to human
     */
    async shouldHandoff(params: {
        message: string;
        conversationId: string;
        intentConfidence?: number;
        deflectionCount?: number;
    }): Promise<HandoffResult> {
        const { message, conversationId, intentConfidence, deflectionCount } = params;

        const lowerMessage = message.toLowerCase();

        // 1. Explicit request for human
        if (this.isExplicitHandoffRequest(lowerMessage)) {
            return {
                shouldHandoff: true,
                trigger: HandoffTrigger.EXPLICIT_REQUEST,
                message: this.getHandoffMessage(HandoffTrigger.EXPLICIT_REQUEST),
                agentContext: `User explicitly requested human agent. Last message: "${message}"`
            };
        }

        // 2. User frustration detected
        if (this.detectsFrustration(lowerMessage)) {
            return {
                shouldHandoff: true,
                trigger: HandoffTrigger.USER_FRUSTRATION,
                message: this.getHandoffMessage(HandoffTrigger.USER_FRUSTRATION),
                agentContext: `User showing frustration. Last message: "${message}"`
            };
        }

        // 3. Multiple deflections
        const currentDeflectionCount = deflectionCount ?? aiDeflectionHandler.getDeflectionCount(conversationId);
        if (currentDeflectionCount >= this.maxDeflectionsBeforeHandoff) {
            return {
                shouldHandoff: true,
                trigger: HandoffTrigger.MULTIPLE_DEFLECTIONS,
                message: this.getHandoffMessage(HandoffTrigger.MULTIPLE_DEFLECTIONS),
                agentContext: `Multiple deflections (${currentDeflectionCount}). User queries appear outside AI scope.`
            };
        }

        // 4. Low confidence in intent classification
        if (intentConfidence !== undefined && intentConfidence < this.lowConfidenceThreshold) {
            return {
                shouldHandoff: true,
                trigger: HandoffTrigger.LOW_CONFIDENCE,
                message: this.getHandoffMessage(HandoffTrigger.LOW_CONFIDENCE),
                agentContext: `Low confidence (${(intentConfidence * 100).toFixed(1)}%) in intent classification.`
            };
        }

        // No handoff needed
        return {
            shouldHandoff: false,
            message: ''
        };
    }

    /**
     * Execute handoff to human agent
     */
    async transferToHuman(params: {
        conversationId: string;
        reason: HandoffTrigger;
        userMessage: string;
        context?: string;
    }): Promise<{
        success: boolean;
        agentNotified: boolean;
        message: string;
    }> {
        const { conversationId, reason, userMessage, context } = params;

        console.log('[AI Handoff] Transferring conversation to human:', {
            conversationId,
            reason,
            userMessage: userMessage.substring(0, 100)
        });

        // Reset deflection count
        aiDeflectionHandler.resetDeflectionCount(conversationId);

        // TODO: Integrate with actual agent assignment system
        // For now, just log and return success

        // Notify agent queue
        await this.notifyAgentQueue({
            conversationId,
            reason,
            userMessage,
            context: context || this.buildHandoffContext(reason, userMessage),
            priority: this.getPriority(reason),
            timestamp: new Date()
        });

        return {
            success: true,
            agentNotified: true,
            message: this.getHandoffMessage(reason)
        };
    }

    /**
     * Check if message explicitly requests handoff
     */
    private isExplicitHandoffRequest(message: string): boolean {
        return HANDOFF_REQUESTS.some(keyword => message.includes(keyword));
    }

    /**
     * Detect user frustration
     */
    private detectsFrustration(message: string): boolean {
        return FRUSTRATION_KEYWORDS.some(keyword => message.includes(keyword));
    }

    /**
     * Get handoff message for user
     */
    private getHandoffMessage(trigger: HandoffTrigger): string {
        const messages: Record<HandoffTrigger, string> = {
            [HandoffTrigger.EXPLICIT_REQUEST]:
                `Por supuesto, te conecto con un agente de soporte técnico especializado.

Un experto se pondrá en contacto contigo en breve. ¿Hay algo específico que quieras que el agente sepa antes de la transferencia?`,

            [HandoffTrigger.USER_FRUSTRATION]:
                `Entiendo tu frustración. Déjame conectarte con un experto de soporte técnico que podrá ayudarte mejor.

Un agente se comunicará contigo de inmediato.`,

            [HandoffTrigger.MULTIPLE_DEFLECTIONS]:
                `Veo que tus consultas requieren asistencia especializada. Te transfiero con un agente de soporte técnico.

Un experto revisará tu caso y te ayudará directamente.`,

            [HandoffTrigger.LOW_CONFIDENCE]:
                `Para brindarte la mejor asistencia con tu consulta, te conectaré con un experto técnico.

Un agente especializado se pondrá en contacto contigo pronto.`,

            [HandoffTrigger.OUT_OF_SCOPE]:
                `Esa consulta requiere asistencia especializada. Te conecto con un agente técnico.

Un experto de soporte te atenderá directamente.`
        };

        return messages[trigger];
    }

    /**
     * Build context for agent
     */
    private buildHandoffContext(trigger: HandoffTrigger, userMessage: string): string {
        return `Handoff Trigger: ${trigger}
Last User Message: ${userMessage.substring(0, 200)}
AI Assessment: User query requires specialized human assistance.`;
    }

    /**
     * Get priority based on trigger
     */
    private getPriority(trigger: HandoffTrigger): 'high' | 'medium' | 'low' {
        if (trigger === HandoffTrigger.USER_FRUSTRATION) return 'high';
        if (trigger === HandoffTrigger.EXPLICIT_REQUEST) return 'high';
        return 'medium';
    }

    /**
     * Notify agent queue (placeholder for actual integration)
     */
    private async notifyAgentQueue(handoff: {
        conversationId: string;
        reason: HandoffTrigger;
        userMessage: string;
        context: string;
        priority: 'high' | 'medium' | 'low';
        timestamp: Date;
    }): Promise<void> {
        // TODO: Integrate with actual agent assignment system
        // Options:
        // - Update conversation status in database
        // - Send notification via websocket
        // - Add to agent queue (Redis/BullMQ)
        // - Trigger email/SMS to on-call agent

        console.log('[AI Handoff] Agent notification sent:', handoff);
    }
}

// Singleton instance
export const aiHandoffManager = new AIHandoffManager();

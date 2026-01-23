/**
 * AI Message Handler - Integration Layer WITH FLOWS
 * 
 * Orchestrates AI compliance + WhatsApp Flows for Meta 2026.
 * Flow: Intent → Flow Launch (if applicable) → Deflection/Handoff → AI Response
 */

import { aiIntentValidator, PixyBusinessIntent } from './ai-intent-validator';
import { aiDeflectionHandler } from './ai-deflection-handler';
import { aiDataProtection, callOpenAIWithZeroRetention } from './ai-data-protection';
import { aiHandoffManager } from './ai-handoff-manager';
import { metaComplianceMetrics } from './ai-compliance-metrics';
import { createFlowTriggerFromIntent } from '../meta/flows/message-triggers';

/**
 * AI message response (updated for Flows support)
 */
export interface AIMessageResponse {
    type: 'ai_response' | 'deflection' | 'handoff' | 'flow_launch';
    message: string | any; // String for text, object for Flow message
    shouldHandoff: boolean;
    intent?: string;
    confidence?: number;
    compliance: {
        isCommercial: boolean;
        dataSanitized: boolean;
        policyCompliant: boolean;
        flowLaunched?: boolean;
    };
}

/**
 * Flow configs (populated from environment)
 */
const FLOW_CONFIGS = {
    appointment: {
        flowId: process.env.APPOINTMENT_FLOW_ID || '',
        flowToken: 'appointment_token_' + Date.now()
    },
    leadGen: {
        flowId: process.env.LEAD_GEN_FLOW_ID || '',
        flowToken: 'lead_gen_token_' + Date.now()
    },
    support: {
        flowId: process.env.SUPPORT_FLOW_ID || '',
        flowToken: 'support_token_' + Date.now()
    }
};

/**
 * Map Pixy intents to Flow names
 */
const INTENT_TO_FLOW_MAP: Record<string, keyof typeof FLOW_CONFIGS> = {
    [PixyBusinessIntent.ONBOARDING_VALIDATION]: 'leadGen',
    [PixyBusinessIntent.HUMAN_HANDOFF]: '' as any, // No flow, direct handoff
};

// Note: You can extend this map or handle dynamically

/**
 * Handle message with AI + Flows integration
 */
export async function handleAIMessage(params: {
    message: string;
    conversationId: string;
    userId: string;
}): Promise<AIMessageResponse> {
    const { message, conversationId, userId } = params;

    try {
        // Step 1: Classify intent
        const classification = await aiIntentValidator.classify(message);

        console.log('[AI Handler] Intent:', classification.intent, classification.isCommercial);

        // Step 1.5: Check if should launch Flow (NEW - Phase 3)
        if (classification.isCommercial) {
            // Check if intent has associated Flow
            let flowConfig = null;

            // Example: Map specific intents to Flows
            if (classification.intent.includes('appointment') ||
                classification.intent.includes('agendar') ||
                classification.intent.includes('cita')) {
                flowConfig = FLOW_CONFIGS.appointment;
            } else if (classification.intent.includes('lead') ||
                classification.intent.includes('onboarding')) {
                flowConfig = FLOW_CONFIGS.leadGen;
            } else if (classification.intent.includes('support') ||
                classification.intent.includes('soporte')) {
                flowConfig = FLOW_CONFIGS.support;
            }

            if (flowConfig && flowConfig.flowId) {
                console.log('[AI] 🚀 Launching Flow for intent');

                const flowTrigger = createFlowTriggerFromIntent({
                    intent: classification.intent,
                    flowConfigs: FLOW_CONFIGS
                });

                if (flowTrigger) {
                    await metaComplianceMetrics.trackIntent({
                        intent: classification.intent as any,
                        isCommercial: true,
                        timestamp: new Date()
                    });

                    return {
                        type: 'flow_launch',
                        message: flowTrigger.message,
                        shouldHandoff: false,
                        intent: classification.intent,
                        confidence: classification.confidence,
                        compliance: {
                            isCommercial: true,
                            dataSanitized: false,
                            policyCompliant: true,
                            flowLaunched: true
                        }
                    };
                }
            }
        }

        // Step 2: Check handoff
        const handoffCheck = await aiHandoffManager.shouldHandoff({
            message,
            conversationId,
            intentConfidence: classification.confidence,
            deflectionCount: aiDeflectionHandler.getDeflectionCount(conversationId)
        });

        if (handoffCheck.shouldHandoff) {
            await metaComplianceMetrics.trackHandoff();

            return {
                type: 'handoff',
                message: handoffCheck.message,
                shouldHandoff: true,
                intent: classification.intent,
                compliance: {
                    isCommercial: classification.isCommercial,
                    dataSanitized: false,
                    policyCompliant: true
                }
            };
        }

        // Step 3: Deflection
        if (!classification.isCommercial) {
            await metaComplianceMetrics.trackDeflection();

            const deflection = await aiDeflectionHandler.deflect(
                message,
                classification.intent as any,
                conversationId
            );

            if (deflection.shouldHandoff) {
                await metaComplianceMetrics.trackHandoff();

                return {
                    type: 'handoff',
                    message: deflection.message,
                    shouldHandoff: true,
                    intent: classification.intent,
                    compliance: {
                        isCommercial: false,
                        dataSanitized: false,
                        policyCompliant: true
                    }
                };
            }

            return {
                type: 'deflection',
                message: deflection.message,
                shouldHandoff: false,
                intent: classification.intent,
                compliance: {
                    isCommercial: false,
                    dataSanitized: false,
                    policyCompliant: true
                }
            };
        }

        // Step 4: Sanitize + AI response
        const sanitization = aiDataProtection.sanitize(message);
        await metaComplianceMetrics.trackSanitization();

        const aiResponse = await generateTechnicalResponse(
            sanitization.sanitized,
            classification.intent,
            userId
        );

        return {
            type: 'ai_response',
            message: aiResponse,
            shouldHandoff: false,
            intent: classification.intent,
            confidence: classification.confidence,
            compliance: {
                isCommercial: true,
                dataSanitized: true,
                policyCompliant: true
            }
        };

    } catch (error: any) {
        console.error('[AI] Error:', error);

        return {
            type: 'handoff',
            message: `Disculpa, error técnico. Te conecto con soporte.`,
            shouldHandoff: true,
            compliance: {
                isCommercial: false,
                dataSanitized: false,
                policyCompliant: true
            }
        };
    }
}

async function generateTechnicalResponse(
    sanitizedMessage: string,
    intent: string,
    userId: string
): Promise<string> {
    const completion = await callOpenAIWithZeroRetention(sanitizedMessage, userId);
    return completion.choices[0]?.message?.content || 'Necesito más información.';
}

export function getPixySystemPrompt(): string {
    return `You are Pixy AI, specialized technical assistant for WhatsApp Business API.

YOUR STRICT SCOPE (Meta 2026):
1. Technical Diagnostics
2. Template Governance
3. Account Health
4. API Versioning
5. Advanced Features
6. Billing & Pricing
7. Onboarding
8. Human Escalation

DO NOT answer general questions. Task-oriented only.`;
}

/**
 * AI Intent Validator - WhatsApp AI Policy 2026 Compliance
 * 
 * Classifies user messages into Pixy's 8 commercial intents to ensure
 * 80-90% intent ratio required by Meta for Task-Oriented AI approval.
 * 
 * CRITICAL: This is NOT a general-purpose AI. It only handles technical
 * WhatsApp Business API queries specific to Pixy platform.
 */

import { metaComplianceMetrics } from './ai-compliance-metrics';

/**
 * Pixy Commercial Intents (Task-Oriented AI)
 * These cover the 80-90% of valid interactions
 */
export enum PixyBusinessIntent {
    /** Diagnóstico técnico y resolución de errores */
    TECHNICAL_DIAGNOSTICS = 'technical_diagnostics',

    /** Gobernanza de plantillas HSM */
    TEMPLATE_GOVERNANCE = 'template_governance',

    /** Monitoreo de salud de cuenta y quality rating */
    ACCOUNT_HEALTH = 'account_health',

    /** Ciclo de vida de API y versionado */
    API_VERSIONING = 'api_versioning',

    /** Implementación de funciones avanzadas */
    ADVANCED_FEATURES = 'advanced_features',

    /** Facturación y modelo de costos 2026 */
    BILLING_PRICING = 'billing_pricing',

    /** Onboarding y validación de negocio */
    ONBOARDING_VALIDATION = 'onboarding_validation',

    /** Escalación a soporte humano */
    HUMAN_HANDOFF = 'human_handoff',
}

/**
 * Off-Topic Intents (Must be deflected)
 * These are NOT allowed by Meta 2026 policy
 */
export enum OffTopicIntent {
    /** Conocimiento general (ej. "¿Capital de Francia?") */
    GENERAL_KNOWLEDGE = 'general_knowledge',

    /** Escritura creativa (ej. "Escríbeme un poema") */
    CREATIVE_WRITING = 'creative_writing',

    /** Consejos personales no relacionados */
    PERSONAL_ADVICE = 'personal_advice',

    /** Charla casual */
    CASUAL_CHAT = 'casual_chat',

    /** Tareas educativas generales */
    EDUCATIONAL_GENERAL = 'educational_general',

    /** Completamente fuera de alcance */
    OUT_OF_SCOPE = 'out_of_scope',
}

/**
 * Intent classification result
 */
export interface IntentClassificationResult {
    /** Detected intent */
    intent: PixyBusinessIntent | OffTopicIntent;

    /** Is this a valid commercial intent? */
    isCommercial: boolean;

    /** Confidence score (0-1) */
    confidence: number;

    /** Keywords that triggered classification */
    matchedKeywords: string[];

    /** Reason for classification */
    reason: string;
}

/**
 * Intent keyword patterns
 * Privacy by Design: These patterns don't leak to external LLMs
 */
const INTENT_PATTERNS = {
    [PixyBusinessIntent.TECHNICAL_DIAGNOSTICS]: {
        keywords: [
            'error', 'fallo', 'código', 'webhook', 'entrega fallida',
            'no funciona', '131049', '132018', '132000', 'message failed',
            'delivery', 'debug', 'log', 'trace', 'diagnosticar',
            'problema técnico', 'bug', 'issue'
        ],
        phrases: [
            'no se está enviando',
            'qué significa este error',
            'código de error',
            'fallo de entrega',
            'webhook no responde'
        ]
    },

    [PixyBusinessIntent.TEMPLATE_GOVERNANCE]: {
        keywords: [
            'plantilla', 'template', 'hsm', 'aprobación', 'rechazado',
            'utility', 'marketing', 'authentication', 'categoría',
            'contenido', 'optimizar plantilla', 'template status',
            'message template', 'approved', 'rejected', 'pending'
        ],
        phrases: [
            'mi plantilla fue rechazada',
            'cómo categorizar',
            'estado de aprobación',
            'optimizar contenido'
        ]
    },

    [PixyBusinessIntent.ACCOUNT_HEALTH]: {
        keywords: [
            'quality rating', 'calificación', 'tier', 'límite',
            'messaging limit', '250', '1k', '10k', '100k',
            'bloqueo', 'banned', 'restricted', 'phone number',
            'número bloqueado', 'escalado', 'throughput'
        ],
        phrases: [
            'cuál es mi quality rating',
            'límite de mensajes',
            'cómo escalar tier',
            'mi número fue bloqueado'
        ]
    },

    [PixyBusinessIntent.API_VERSIONING]: {
        keywords: [
            'versión', 'v17', 'v18', 'v19', 'v22', 'v24', 'v24.0',
            'deprecación', 'deprecated', 'actualización', 'migración',
            'api version', 'changelog', 'breaking change', 'upgrade'
        ],
        phrases: [
            'cuándo deprecan v18',
            'novedades v24',
            'migrar a v24',
            'cambios en la api'
        ]
    },

    [PixyBusinessIntent.ADVANCED_FEATURES]: {
        keywords: [
            'flows', 'flow 5.0', 'interactive', 'botones', 'buttons',
            'catálogo', 'catalog', 'calling api', 'llamadas', 'voz',
            'carousel', 'list', 'cta', 'quick reply', 'configurar'
        ],
        phrases: [
            'cómo implementar flows',
            'configurar botones',
            'crear catálogo',
            'activar calling api'
        ]
    },

    [PixyBusinessIntent.BILLING_PRICING]: {
        keywords: [
            'precio', 'costo', 'facturación', 'billing', 'pricing',
            'mensaje entregado', 'tarifa', 'créditos', 'wcc',
            'india', 'méxico', 'regional', 'tier', 'conversation'
        ],
        phrases: [
            'cuánto cuesta',
            'tarifas regionales',
            'modelo de precios',
            'créditos wcc'
        ]
    },

    [PixyBusinessIntent.ONBOARDING_VALIDATION]: {
        keywords: [
            'onboarding', 'verificación', 'business manager', 'mbm',
            'app review', 'validación', 'requisitos', 'identidad',
            'documentos', 'aprobar app', 'facebook', 'meta'
        ],
        phrases: [
            'cómo verificar negocio',
            'requisitos app review',
            'validar identidad',
            'preparar para meta'
        ]
    },

    [PixyBusinessIntent.HUMAN_HANDOFF]: {
        keywords: [
            'agente', 'humano', 'persona real', 'soporte técnico',
            'experto', 'hablar con alguien', 'escalar', 'ayuda urgente',
            'no entiendes', 'no puedes ayudarme'
        ],
        phrases: [
            'quiero hablar con una persona',
            'necesito un agente',
            'conectarme con soporte',
            'esto no funciona'
        ]
    },
};

/**
 * Off-topic patterns (to be deflected)
 */
const OFF_TOPIC_PATTERNS = {
    [OffTopicIntent.GENERAL_KNOWLEDGE]: {
        keywords: [
            'capital', 'país', 'historia', 'geografía', 'ciencia',
            'matemáticas', 'definición', 'qué es', 'quién fue'
        ],
        phrases: [
            'cuál es la capital de',
            'en qué año',
            'cuántos habitantes'
        ]
    },

    [OffTopicIntent.CREATIVE_WRITING]: {
        keywords: [
            'poema', 'cuento', 'historia', 'carta', 'escribe',
            'redacta', 'inventa', 'crea', 'imagina'
        ],
        phrases: [
            'escríbeme un poema',
            'cuéntame una historia',
            'inventa un cuento'
        ]
    },

    [OffTopicIntent.CASUAL_CHAT]: {
        keywords: [
            'hola', 'cómo estás', 'qué tal', 'buenos días',
            'buenas tardes', 'chao', 'adiós', 'gracias'
        ],
        phrases: [
            'cómo te llamas',
            'cuántos años tienes',
            'de dónde eres'
        ]
    },
};

/**
 * AI Intent Validator Class
 */
export class AIIntentValidator {
    private readonly minConfidence = 0.6;

    /**
     * Classify user message into intent
     */
    async classify(message: string): Promise<IntentClassificationResult> {
        const normalizedMessage = message.toLowerCase().trim();

        // 1. Check for human handoff keywords first (highest priority)
        if (this.matchesHandoff(normalizedMessage)) {
            return {
                intent: PixyBusinessIntent.HUMAN_HANDOFF,
                isCommercial: true,
                confidence: 1.0,
                matchedKeywords: ['human', 'agent', 'person'],
                reason: 'Explicit request for human agent'
            };
        }

        // 2. Check commercial intents
        const commercialMatch = await this.findBestCommercialMatch(normalizedMessage);

        if (commercialMatch && commercialMatch.confidence >= this.minConfidence) {
            // Track commercial intent
            await metaComplianceMetrics.trackIntent({
                intent: commercialMatch.intent as PixyBusinessIntent,
                isCommercial: true,
                timestamp: new Date()
            });

            return commercialMatch;
        }

        // 3. Check off-topic patterns
        const offTopicMatch = await this.findOffTopicMatch(normalizedMessage);

        if (offTopicMatch) {
            // Track off-topic
            await metaComplianceMetrics.trackIntent({
                intent: offTopicMatch.intent as OffTopicIntent,
                isCommercial: false,
                timestamp: new Date()
            });

            return offTopicMatch;
        }

        // 4. Default: Unknown/Out of scope
        await metaComplianceMetrics.trackIntent({
            intent: OffTopicIntent.OUT_OF_SCOPE,
            isCommercial: false,
            timestamp: new Date()
        });

        return {
            intent: OffTopicIntent.OUT_OF_SCOPE,
            isCommercial: false,
            confidence: 0.8,
            matchedKeywords: [],
            reason: 'No pattern matched - outside technical scope'
        };
    }

    /**
     * Find best commercial intent match
     */
    private async findBestCommercialMatch(
        message: string
    ): Promise<IntentClassificationResult | null> {
        let bestMatch: IntentClassificationResult | null = null;
        let maxScore = 0;

        for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
            const score = this.calculateMatchScore(message, patterns);

            if (score > maxScore) {
                maxScore = score;
                const matchedKeywords = this.getMatchedKeywords(message, patterns);

                bestMatch = {
                    intent: intent as PixyBusinessIntent,
                    isCommercial: true,
                    confidence: Math.min(score, 1.0),
                    matchedKeywords,
                    reason: `Matched ${matchedKeywords.length} keywords/phrases`
                };
            }
        }

        return bestMatch;
    }

    /**
     * Find off-topic match
     */
    private async findOffTopicMatch(
        message: string
    ): Promise<IntentClassificationResult | null> {
        for (const [intent, patterns] of Object.entries(OFF_TOPIC_PATTERNS)) {
            const score = this.calculateMatchScore(message, patterns);

            if (score > 0.5) {
                return {
                    intent: intent as OffTopicIntent,
                    isCommercial: false,
                    confidence: score,
                    matchedKeywords: this.getMatchedKeywords(message, patterns),
                    reason: 'Off-topic pattern detected'
                };
            }
        }

        return null;
    }

    /**
     * Calculate match score for patterns
     */
    private calculateMatchScore(
        message: string,
        patterns: { keywords: string[]; phrases: string[] }
    ): number {
        let score = 0;

        // Fixed weights validation
        const KEYWORD_WEIGHT = 0.25;
        const PHRASE_WEIGHT = 0.75;

        // Check keywords
        for (const keyword of patterns.keywords) {
            if (message.includes(keyword)) {
                score += KEYWORD_WEIGHT;
            }
        }

        // Check phrases (High confidence)
        for (const phrase of patterns.phrases) {
            if (message.includes(phrase)) {
                score += PHRASE_WEIGHT;
            }
        }

        // Cap at 1.0
        return Math.min(score, 1.0);
    }

    /**
     * Get matched keywords from message
     */
    private getMatchedKeywords(
        message: string,
        patterns: { keywords: string[]; phrases: string[] }
    ): string[] {
        const matched: string[] = [];

        for (const keyword of patterns.keywords) {
            if (message.includes(keyword)) {
                matched.push(keyword);
            }
        }

        for (const phrase of patterns.phrases) {
            if (message.includes(phrase)) {
                matched.push(phrase);
            }
        }

        return matched;
    }

    /**
     * Check if message requests human handoff
     */
    private matchesHandoff(message: string): boolean {
        const handoffTriggers = [
            'agente',
            'humano',
            'persona real',
            'soporte técnico',
            'hablar con alguien',
            'no entiendes',
            'no puedes',
            'no sirves'
        ];

        return handoffTriggers.some(trigger => message.includes(trigger));
    }

    /**
     * Get intent ratio metrics
     */
    async getIntentRatio(): Promise<{
        commercial: number;
        offTopic: number;
        compliant: boolean;
    }> {
        return await metaComplianceMetrics.getIntentRatio();
    }
}

// Singleton instance
export const aiIntentValidator = new AIIntentValidator();

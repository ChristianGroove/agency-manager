/**
 * AI Intent & Compliance Types
 */

/**
 * Pixy Commercial Intents (Task-Oriented AI)
 * These cover the 80-90% of valid interactions
 */
export enum PixyBusinessIntent {
    TECHNICAL_DIAGNOSTICS = 'technical_diagnostics',
    TEMPLATE_GOVERNANCE = 'template_governance',
    ACCOUNT_HEALTH = 'account_health',
    API_VERSIONING = 'api_versioning',
    ADVANCED_FEATURES = 'advanced_features',
    BILLING_PRICING = 'billing_pricing',
    ONBOARDING_VALIDATION = 'onboarding_validation',
    HUMAN_HANDOFF = 'human_handoff',
}

/**
 * Off-Topic Intents (Must be deflected)
 */
export enum OffTopicIntent {
    GENERAL_KNOWLEDGE = 'general_knowledge',
    CREATIVE_WRITING = 'creative_writing',
    PERSONAL_ADVICE = 'personal_advice',
    CASUAL_CHAT = 'casual_chat',
    EDUCATIONAL_GENERAL = 'educational_general',
    OUT_OF_SCOPE = 'out_of_scope',
}

/**
 * Intent tracking event
 */
export interface IntentEvent {
    intent: PixyBusinessIntent | OffTopicIntent;
    isCommercial: boolean;
    timestamp: Date;
}

/**
 * Compliance metrics snapshot
 */
export interface ComplianceMetrics {
    intentRatio: {
        commercial: number;
        offTopic: number;
        unknown: number;
    };
    totalMessages: number;
    deflectionRate: number;
    handoffRate: number;
    dataSanitizationRate: number;
    isCompliant: boolean;
    windowStart: Date;
    windowEnd: Date;
    intentDistribution: Record<string, number>;
}

/**
 * Compliance alert
 */
export interface ComplianceAlert {
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    metric: string;
    currentValue: number;
    targetValue: number;
    timestamp: Date;
}

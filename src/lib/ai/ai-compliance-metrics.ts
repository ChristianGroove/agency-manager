/**
 * AI Compliance Metrics - Real-time Monitoring
 * 
 * Tracks compliance with Meta 2026 AI Policy in real-time:
 * - Intent ratio (80-90% commercial target)
 * - Deflection rate
 * - Handoff rate
 * - Data sanitization rate
 */

import { PixyBusinessIntent, OffTopicIntent } from './ai-intent-validator';

/**
 * Intent tracking event
 */
interface IntentEvent {
    intent: PixyBusinessIntent | OffTopicIntent;
    isCommercial: boolean;
    timestamp: Date;
}

/**
 * Compliance metrics snapshot
 */
export interface ComplianceMetrics {
    /** Intent ratio breakdown */
    intentRatio: {
        commercial: number;      // Target: 80-90%
        offTopic: number;        // Max: 10-20%
        unknown: number;         // Min: <5%
    };

    /** Total messages analyzed */
    totalMessages: number;

    /** Deflection rate */
    deflectionRate: number;      // Expected: 10-20%

    /** Handoff rate */
    handoffRate: number;         // Expected: 5-10%

    /** Data sanitization rate */
    dataSanitizationRate: number; // Target: 100%

    /** Is compliant with Meta 2026? */
    isCompliant: boolean;

    /** Time window */
    windowStart: Date;
    windowEnd: Date;

    /** Intent distribution */
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

/**
 * AI Compliance Metrics Class
 */
export class AIComplianceMetrics {
    private intentEvents: IntentEvent[] = [];
    private deflectionCount = 0;
    private handoffCount = 0;
    private sanitizedCount = 0;
    private readonly maxEventsToKeep = 10000; // Last 10k events
    private readonly windowMs = 3600000; // 1 hour

    /**
     * Track intent classification
     */
    async trackIntent(event: IntentEvent): Promise<void> {
        this.intentEvents.push(event);

        // Keep events bounded
        if (this.intentEvents.length > this.maxEventsToKeep) {
            this.intentEvents.shift();
        }
    }

    /**
     * Track deflection
     */
    async trackDeflection(): Promise<void> {
        this.deflectionCount++;
    }

    /**
     * Track handoff
     */
    async trackHandoff(): Promise<void> {
        this.handoffCount++;
    }

    /**
     * Track data sanitization
     */
    async trackSanitization(): Promise<void> {
        this.sanitizedCount++;
    }

    /**
     * Get current compliance metrics
     */
    async getMetrics(windowMs: number = this.windowMs): Promise<ComplianceMetrics> {
        const now = new Date();
        const windowStart = new Date(now.getTime() - windowMs);

        // Filter events in window
        const windowEvents = this.intentEvents.filter(
            e => e.timestamp >= windowStart
        );

        if (windowEvents.length === 0) {
            return this.getEmptyMetrics(windowStart, now);
        }

        // Calculate intent ratio
        const commercialEvents = windowEvents.filter(e => e.isCommercial);
        const offTopicEvents = windowEvents.filter(e => !e.isCommercial);

        const totalMessages = windowEvents.length;
        const commercialRatio = commercialEvents.length / totalMessages;
        const offTopicRatio = offTopicEvents.length / totalMessages;

        // Calculate rates
        const deflectionRate = this.deflectionCount / totalMessages;
        const handoffRate = this.handoffCount / totalMessages;
        const dataSanitizationRate = this.sanitizedCount / totalMessages;

        // Intent distribution
        const intentDistribution = this.calculateIntentDistribution(windowEvents);

        // Check compliance
        const isCompliant = this.checkCompliance(commercialRatio, offTopicRatio);

        return {
            intentRatio: {
                commercial: commercialRatio,
                offTopic: offTopicRatio,
                unknown: Math.max(0, 1 - commercialRatio - offTopicRatio)
            },
            totalMessages,
            deflectionRate,
            handoffRate,
            dataSanitizationRate,
            isCompliant,
            windowStart,
            windowEnd: now,
            intentDistribution
        };
    }

    /**
     * Get intent ratio for compliance check
     */
    async getIntentRatio(): Promise<{
        commercial: number;
        offTopic: number;
        compliant: boolean;
    }> {
        const metrics = await this.getMetrics();

        return {
            commercial: metrics.intentRatio.commercial,
            offTopic: metrics.intentRatio.offTopic,
            compliant: metrics.isCompliant
        };
    }

    /**
     * Check if metrics are compliant with Meta 2026
     */
    private checkCompliance(commercialRatio: number, offTopicRatio: number): boolean {
        // Meta requirement: 80-90% commercial intents
        const MIN_COMMERCIAL_RATIO = 0.80;
        const MAX_OFF_TOPIC_RATIO = 0.20;

        return commercialRatio >= MIN_COMMERCIAL_RATIO &&
            offTopicRatio <= MAX_OFF_TOPIC_RATIO;
    }

    /**
     * Calculate intent distribution
     */
    private calculateIntentDistribution(events: IntentEvent[]): Record<string, number> {
        const distribution: Record<string, number> = {};

        events.forEach(event => {
            const intent = event.intent as string;
            distribution[intent] = (distribution[intent] || 0) + 1;
        });

        // Convert to percentages
        const total = events.length;
        Object.keys(distribution).forEach(intent => {
            distribution[intent] = distribution[intent] / total;
        });

        return distribution;
    }

    /**
     * Get compliance alerts
     */
    async getAlerts(): Promise<ComplianceAlert[]> {
        const metrics = await this.getMetrics();
        const alerts: ComplianceAlert[] = [];

        // Alert: Low commercial ratio
        if (metrics.intentRatio.commercial < 0.80) {
            alerts.push({
                severity: 'critical',
                message: 'Commercial intent ratio below Meta 2026 requirement (80%)',
                metric: 'commercial_ratio',
                currentValue: metrics.intentRatio.commercial,
                targetValue: 0.80,
                timestamp: new Date()
            });
        }

        // Alert: High off-topic ratio
        if (metrics.intentRatio.offTopic > 0.20) {
            alerts.push({
                severity: 'high',
                message: 'Off-topic intent ratio exceeds Meta 2026 limit (20%)',
                metric: 'off_topic_ratio',
                currentValue: metrics.intentRatio.offTopic,
                targetValue: 0.20,
                timestamp: new Date()
            });
        }

        // Alert: Low data sanitization
        if (metrics.dataSanitizationRate < 0.95) {
            alerts.push({
                severity: 'critical',
                message: 'Data sanitization rate below target (95%)',
                metric: 'data_sanitization',
                currentValue: metrics.dataSanitizationRate,
                targetValue: 0.95,
                timestamp: new Date()
            });
        }

        return alerts;
    }

    /**
     * Get formatted compliance report
     */
    async getComplianceReport(): Promise<string> {
        const metrics = await this.getMetrics();
        const alerts = await this.getAlerts();

        const status = metrics.isCompliant ? '✅ COMPLIANT' : '⚠️  NON-COMPLIANT';

        return `
=== AI Compliance Report (Meta 2026) ===
Status: ${status}
Window: ${metrics.windowStart.toISOString()} to ${metrics.windowEnd.toISOString()}

Intent Ratio:
  • Commercial: ${(metrics.intentRatio.commercial * 100).toFixed(1)}% (Target: 80-90%)
  • Off-Topic: ${(metrics.intentRatio.offTopic * 100).toFixed(1)}% (Max: 10-20%)
  • Unknown: ${(metrics.intentRatio.unknown * 100).toFixed(1)}% (Min: <5%)

Operational Metrics:
  • Total Messages: ${metrics.totalMessages}
  • Deflection Rate: ${(metrics.deflectionRate * 100).toFixed(1)}%
  • Handoff Rate: ${(metrics.handoffRate * 100).toFixed(1)}%
  • Data Sanitization: ${(metrics.dataSanitizationRate * 100).toFixed(1)}%

Top Intents:
${this.formatIntentDistribution(metrics.intentDistribution)}

${alerts.length > 0 ? `⚠️  Alerts (${alerts.length}):\n${alerts.map(a => `  • [${a.severity.toUpperCase()}] ${a.message}`).join('\n')}` : '✅ No alerts'}
========================================
        `.trim();
    }

    /**
     * Format intent distribution for report
     */
    private formatIntentDistribution(distribution: Record<string, number>): string {
        const sorted = Object.entries(distribution)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        return sorted
            .map(([intent, ratio]) => `  • ${intent}: ${(ratio * 100).toFixed(1)}%`)
            .join('\n');
    }

    /**
     * Get empty metrics
     */
    private getEmptyMetrics(windowStart: Date, windowEnd: Date): ComplianceMetrics {
        return {
            intentRatio: {
                commercial: 0,
                offTopic: 0,
                unknown: 0
            },
            totalMessages: 0,
            deflectionRate: 0,
            handoffRate: 0,
            dataSanitizationRate: 0,
            isCompliant: false,
            windowStart,
            windowEnd,
            intentDistribution: {}
        };
    }

    /**
     * Reset metrics (for testing)
     */
    reset(): void {
        this.intentEvents = [];
        this.deflectionCount = 0;
        this.handoffCount = 0;
        this.sanitizedCount = 0;
    }
}

// Singleton instance
export const metaComplianceMetrics = new AIComplianceMetrics();

// Auto-report every hour in development
if (process.env.NODE_ENV === 'development') {
    setInterval(async () => {
        const report = await metaComplianceMetrics.getComplianceReport();
        console.log('\n' + report + '\n');
    }, 3600000); // 1 hour
}

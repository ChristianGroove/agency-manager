/**
 * Meta API Telemetry System
 * 
 * Monitors health, performance, and compliance metrics for WhatsApp Business API integration.
 * Critical for production monitoring and Meta App Review requirements.
 */

export interface APICallMetric {
    endpoint: string;
    method: string;
    statusCode: number;
    latencyMs: number;
    success: boolean;
    errorCode?: number;
    timestamp: Date;
    wabaId?: string;
}

export interface TelemetryMetrics {
    // Success Rate
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    successRate: number;

    // Performance
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;

    // Throughput
    messagesPerSecond: number;
    peakMessagesPerSecond: number;

    // Rate Limiting
    rateLimitHits: number;
    throttledRequests: number;

    // Errors
    errorDistribution: Record<number, number>; // errorCode -> count

    // Time window
    windowStart: Date;
    windowEnd: Date;
}

export class MetaTelemetry {
    private metrics: APICallMetric[] = [];
    private readonly maxMetricsSize = 10000; // Keep last 10k metrics
    private windowSize = 60000; // 1 minute window

    /**
     * Record an API call
     */
    recordCall(metric: APICallMetric): void {
        this.metrics.push(metric);

        // Keep metrics array bounded
        if (this.metrics.length > this.maxMetricsSize) {
            this.metrics.shift();
        }
    }

    /**
     * Get current metrics for a time window
     */
    getMetrics(windowMs: number = this.windowSize): TelemetryMetrics {
        const now = new Date();
        const windowStart = new Date(now.getTime() - windowMs);

        const windowMetrics = this.metrics.filter(
            m => m.timestamp >= windowStart
        );

        if (windowMetrics.length === 0) {
            return this.getEmptyMetrics(windowStart, now);
        }

        const successful = windowMetrics.filter(m => m.success);
        const failed = windowMetrics.filter(m => !m.success);
        const latencies = windowMetrics.map(m => m.latencyMs).sort((a, b) => a - b);

        // Calculate error distribution
        const errorDistribution: Record<number, number> = {};
        failed.forEach(m => {
            if (m.errorCode) {
                errorDistribution[m.errorCode] = (errorDistribution[m.errorCode] || 0) + 1;
            }
        });

        // Calculate throughput
        const windowSeconds = windowMs / 1000;
        const messagesPerSecond = windowMetrics.length / windowSeconds;

        // Calculate rate limit hits
        const rateLimitHits = windowMetrics.filter(
            m => m.errorCode === 4 // Rate limit error code
        ).length;

        return {
            totalCalls: windowMetrics.length,
            successfulCalls: successful.length,
            failedCalls: failed.length,
            successRate: (successful.length / windowMetrics.length) * 100,

            avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
            p50LatencyMs: this.percentile(latencies, 50),
            p95LatencyMs: this.percentile(latencies, 95),
            p99LatencyMs: this.percentile(latencies, 99),

            messagesPerSecond,
            peakMessagesPerSecond: this.calculatePeakThroughput(windowMetrics),

            rateLimitHits,
            throttledRequests: rateLimitHits,

            errorDistribution,

            windowStart,
            windowEnd: now,
        };
    }

    /**
     * Get metrics for specific WABA
     */
    getWABAMetrics(wabaId: string, windowMs: number = this.windowSize): TelemetryMetrics {
        const originalMetrics = this.metrics;
        this.metrics = this.metrics.filter(m => m.wabaId === wabaId);
        const result = this.getMetrics(windowMs);
        this.metrics = originalMetrics;
        return result;
    }

    /**
     * Check if system is healthy
     */
    isHealthy(thresholds: {
        minSuccessRate?: number;
        maxAvgLatency?: number;
        maxErrorRate?: number;
    } = {}): boolean {
        const metrics = this.getMetrics(60000); // Last minute

        const minSuccessRate = thresholds.minSuccessRate || 95;
        const maxAvgLatency = thresholds.maxAvgLatency || 2000; // 2 seconds
        const maxErrorRate = thresholds.maxErrorRate || 5;

        if (metrics.totalCalls === 0) return true; // No data = assume healthy

        const checks = [
            metrics.successRate >= minSuccessRate,
            metrics.avgLatencyMs <= maxAvgLatency,
            (metrics.failedCalls / metrics.totalCalls * 100) <= maxErrorRate,
        ];

        return checks.every(check => check);
    }

    /**
     * Get health status with details
     */
    getHealthStatus(): {
        healthy: boolean;
        metrics: TelemetryMetrics;
        issues: string[];
    } {
        const metrics = this.getMetrics(60000);
        const issues: string[] = [];

        if (metrics.successRate < 95) {
            issues.push(`Low success rate: ${metrics.successRate.toFixed(2)}%`);
        }

        if (metrics.avgLatencyMs > 2000) {
            issues.push(`High latency: ${metrics.avgLatencyMs.toFixed(0)}ms`);
        }

        if (metrics.messagesPerSecond > 900) {
            issues.push(`Approaching rate limit: ${metrics.messagesPerSecond.toFixed(0)} mps`);
        }

        if (metrics.rateLimitHits > 0) {
            issues.push(`Rate limit hits: ${metrics.rateLimitHits}`);
        }

        return {
            healthy: issues.length === 0,
            metrics,
            issues,
        };
    }

    /**
     * Get formatted report for logging/debugging
     */
    getReport(): string {
        const health = this.getHealthStatus();
        const m = health.metrics;

        return `
=== Meta API Telemetry Report ===
Status: ${health.healthy ? '✅ HEALTHY' : '⚠️  ISSUES DETECTED'}
Window: ${m.windowStart.toISOString()} to ${m.windowEnd.toISOString()}

Performance:
  • Total Calls: ${m.totalCalls}
  • Success Rate: ${m.successRate.toFixed(2)}%
  • Avg Latency: ${m.avgLatencyMs.toFixed(0)}ms
  • P95 Latency: ${m.p95LatencyMs.toFixed(0)}ms
  • P99 Latency: ${m.p99LatencyMs.toFixed(0)}ms

Throughput:
  • Current: ${m.messagesPerSecond.toFixed(2)} mps
  • Peak: ${m.peakMessagesPerSecond.toFixed(2)} mps
  • Target: 1,000 mps

Rate Limiting:
  • Rate Limit Hits: ${m.rateLimitHits}
  • Throttled Requests: ${m.throttledRequests}

Errors:
  • Failed Calls: ${m.failedCalls}
  • Error Distribution: ${JSON.stringify(m.errorDistribution, null, 2)}

${health.issues.length > 0 ? `⚠️  Issues:\n${health.issues.map(i => `  • ${i}`).join('\n')}` : ''}
================================
        `.trim();
    }

    /**
     * Clear all metrics (for testing)
     */
    clear(): void {
        this.metrics = [];
    }

    /**
     * Calculate percentile of sorted array
     */
    private percentile(sortedArray: number[], percentile: number): number {
        if (sortedArray.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, index)];
    }

    /**
     * Calculate peak throughput in 1-second windows
     */
    private calculatePeakThroughput(metrics: APICallMetric[]): number {
        if (metrics.length === 0) return 0;

        const oneSecondWindows: Record<number, number> = {};

        metrics.forEach(m => {
            const secondBucket = Math.floor(m.timestamp.getTime() / 1000);
            oneSecondWindows[secondBucket] = (oneSecondWindows[secondBucket] || 0) + 1;
        });

        return Math.max(...Object.values(oneSecondWindows));
    }

    /**
     * Get empty metrics for when no data available
     */
    private getEmptyMetrics(windowStart: Date, windowEnd: Date): TelemetryMetrics {
        return {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            successRate: 0,
            avgLatencyMs: 0,
            p50LatencyMs: 0,
            p95LatencyMs: 0,
            p99LatencyMs: 0,
            messagesPerSecond: 0,
            peakMessagesPerSecond: 0,
            rateLimitHits: 0,
            throttledRequests: 0,
            errorDistribution: {},
            windowStart,
            windowEnd,
        };
    }
}

// Singleton instance
export const metaTelemetry = new MetaTelemetry();

// Auto-log health report every 5 minutes in development
if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
        const health = metaTelemetry.getHealthStatus();
        if (!health.healthy || health.metrics.totalCalls > 0) {
            console.log(metaTelemetry.getReport());
        }
    }, 300000); // 5 minutes
}

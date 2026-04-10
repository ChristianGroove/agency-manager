/**
 * Circuit Breaker Pattern for Integration Health
 * 
 * Protects the system from cascading failures when external services are unstable.
 * States:
 * - CLOSED: Normal operation, everything works.
 * - OPEN: Failures exceeded threshold, calls are blocked for a cooldown period.
 * - HALF-OPEN: Cooldown finished, testing if service is recovered.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitConfig {
    failureThreshold: number;   // Number of failures before opening
    cooldownPeriod: number;    // Time in ms to stay OPEN
    onStateChange?: (service: string, from: CircuitState, to: CircuitState) => void;
}

interface CircuitStats {
    state: CircuitState;
    failureCount: number;
    lastFailureTime?: number;
}

export class CircuitBreaker {
    private circuits: Map<string, CircuitStats> = new Map();
    private config: CircuitConfig;

    constructor(config: Partial<CircuitConfig> = {}) {
        this.config = {
            failureThreshold: config.failureThreshold || 5,
            cooldownPeriod: config.cooldownPeriod || 30000, // 30 seconds default
            onStateChange: config.onStateChange
        };
    }

    /**
     * Executes an operation wrapped in the circuit breaker
     */
    async execute<T>(serviceKey: string, operation: () => Promise<T>): Promise<T> {
        this.updateState(serviceKey);
        const stats = this.getStats(serviceKey);

        if (stats.state === 'OPEN') {
            throw new Error(`Circuit Breaker: Service "${serviceKey}" is currently unavailable (OPEN)`);
        }

        try {
            const result = await operation();
            this.onSuccess(serviceKey);
            return result;
        } catch (error) {
            this.onFailure(serviceKey);
            throw error;
        }
    }

    /**
     * Get or create stats for a service
     */
    private getStats(serviceKey: string): CircuitStats {
        if (!this.circuits.has(serviceKey)) {
            this.circuits.set(serviceKey, { state: 'CLOSED', failureCount: 0 });
        }
        return this.circuits.get(serviceKey)!;
    }

    /**
     * Logic to transition states based on time and thresholds
     */
    private updateState(serviceKey: string): void {
        const stats = this.getStats(serviceKey);

        if (stats.state === 'OPEN' && stats.lastFailureTime) {
            const now = Date.now();
            if (now - stats.lastFailureTime > this.config.cooldownPeriod) {
                this.changeState(serviceKey, 'HALF_OPEN');
            }
        }
    }

    private onSuccess(serviceKey: string): void {
        const stats = this.getStats(serviceKey);
        if (stats.state === 'HALF_OPEN' || stats.state === 'OPEN') {
            this.changeState(serviceKey, 'CLOSED');
        }
        stats.failureCount = 0;
    }

    private onFailure(serviceKey: string): void {
        const stats = this.getStats(serviceKey);
        stats.failureCount++;
        stats.lastFailureTime = Date.now();

        if (stats.state === 'CLOSED' && stats.failureCount >= this.config.failureThreshold) {
            this.changeState(serviceKey, 'OPEN');
        } else if (stats.state === 'HALF_OPEN') {
            // Immediate return to OPEN on any failure in HALF_OPEN
            this.changeState(serviceKey, 'OPEN');
        }
    }

    private changeState(serviceKey: string, newState: CircuitState): void {
        const stats = this.getStats(serviceKey);
        const oldState = stats.state;

        if (oldState === newState) return;

        stats.state = newState;
        console.warn(`[CircuitBreaker] ${serviceKey} transitioned from ${oldState} to ${newState}`);

        if (this.config.onStateChange) {
            this.config.onStateChange(serviceKey, oldState, newState);
        }
    }

    /**
     * Public API to get current health of all services
     */
    getGlobalHealth() {
        return Array.from(this.circuits.entries()).map(([key, stats]) => ({
            service: key,
            ...stats
        }));
    }
}

// Singleton for global use across the app
export const globalCircuitBreaker = new CircuitBreaker();

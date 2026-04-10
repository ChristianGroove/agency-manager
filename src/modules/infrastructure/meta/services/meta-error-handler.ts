/**
 * Meta Graph API Error Handler
 * 
 * Centralizes error handling for Meta Graph API calls with specific
 * strategies for different error codes according to Meta 2026 standards.
 */

export interface MetaError {
    error: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        error_user_title?: string;
        error_user_msg?: string;
        error_data?: Record<string, any>;
        fbtrace_id?: string;
    };
}

export enum MetaErrorCode {
    // Rate Limiting
    RATE_LIMIT = 4,

    // Parameter Errors
    INVALID_PARAMETER = 100,
    HSM_PARAMETER_ERROR = 132018, // Nueva en 2026

    // Pagination Errors
    CURSOR_EXPIRED = 131059,

    // Authentication Errors
    INVALID_TOKEN = 190,
    TOKEN_EXPIRED = 190,

    // Permission Errors
    PERMISSION_DENIED = 200,

    // Resource Errors
    UNSUPPORTED_REQUEST = 100,
}

export enum ErrorStrategy {
    NO_RETRY = 'no_retry',
    EXPONENTIAL_BACKOFF = 'exponential_backoff',
    RESTART_OPERATION = 'restart_operation',
    REFRESH_TOKEN = 'refresh_token',
}

interface ErrorHandlingStrategy {
    strategy: ErrorStrategy;
    maxRetries?: number;
    baseDelay?: number; // milliseconds
    shouldLog: boolean;
    shouldAlert: boolean;
}

const ERROR_STRATEGIES: Record<number, ErrorHandlingStrategy> = {
    [MetaErrorCode.RATE_LIMIT]: {
        strategy: ErrorStrategy.EXPONENTIAL_BACKOFF,
        maxRetries: 5,
        baseDelay: 1000,
        shouldLog: true,
        shouldAlert: false,
    },
    [MetaErrorCode.HSM_PARAMETER_ERROR]: {
        strategy: ErrorStrategy.NO_RETRY,
        shouldLog: true,
        shouldAlert: true, // Critical: Template configuration error
    },
    [MetaErrorCode.CURSOR_EXPIRED]: {
        strategy: ErrorStrategy.RESTART_OPERATION,
        shouldLog: true,
        shouldAlert: false,
    },
    [MetaErrorCode.INVALID_TOKEN]: {
        strategy: ErrorStrategy.REFRESH_TOKEN,
        maxRetries: 1,
        shouldLog: true,
        shouldAlert: true,
    },
    [MetaErrorCode.INVALID_PARAMETER]: {
        strategy: ErrorStrategy.NO_RETRY,
        shouldLog: true,
        shouldAlert: false,
    },
};

export class MetaErrorHandler {
    private retryCount: Map<string, number> = new Map();

    /**
     * Handle Meta API error and return appropriate action
     */
    async handleError(
        error: MetaError,
        context: string,
        operationId?: string
    ): Promise<{
        shouldRetry: boolean;
        delayMs?: number;
        action?: string;
    }> {
        const errorCode = error.error.code;
        const strategy = ERROR_STRATEGIES[errorCode] || {
            strategy: ErrorStrategy.NO_RETRY,
            shouldLog: true,
            shouldAlert: false,
        };

        // Logging
        if (strategy.shouldLog) {
            this.logError(error, context);
        }

        // Alerting
        if (strategy.shouldAlert) {
            await this.sendAlert(error, context);
        }

        // Apply strategy
        switch (strategy.strategy) {
            case ErrorStrategy.NO_RETRY:
                return { shouldRetry: false };

            case ErrorStrategy.EXPONENTIAL_BACKOFF:
                return this.handleExponentialBackoff(strategy, operationId);

            case ErrorStrategy.RESTART_OPERATION:
                return {
                    shouldRetry: true,
                    action: 'restart_pagination',
                    delayMs: 0,
                };

            case ErrorStrategy.REFRESH_TOKEN:
                return {
                    shouldRetry: true,
                    action: 'refresh_token',
                    delayMs: 0,
                };

            default:
                return { shouldRetry: false };
        }
    }

    /**
     * Handle exponential backoff retry logic
     */
    private handleExponentialBackoff(
        strategy: ErrorHandlingStrategy,
        operationId?: string
    ): { shouldRetry: boolean; delayMs?: number } {
        if (!operationId) {
            return { shouldRetry: false };
        }

        const currentRetries = this.retryCount.get(operationId) || 0;

        if (currentRetries >= (strategy.maxRetries || 3)) {
            this.retryCount.delete(operationId);
            return { shouldRetry: false };
        }

        this.retryCount.set(operationId, currentRetries + 1);

        const baseDelay = strategy.baseDelay || 1000;
        const delayMs = baseDelay * Math.pow(2, currentRetries);

        return { shouldRetry: true, delayMs };
    }

    /**
     * Reset retry counter for an operation
     */
    resetRetries(operationId: string): void {
        this.retryCount.delete(operationId);
    }

    /**
     * Log error with structured format
     */
    private logError(error: MetaError, context: string): void {
        console.error('[MetaErrorHandler]', {
            context,
            errorCode: error.error.code,
            errorSubcode: error.error.error_subcode,
            message: error.error.message,
            userMessage: error.error.error_user_msg,
            traceId: error.error.fbtrace_id,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Send alert for critical errors
     * TODO: Integrate with alerting system (email, Slack, PagerDuty, etc.)
     */
    private async sendAlert(error: MetaError, context: string): Promise<void> {
        // Placeholder for alerting integration
        console.warn('[ALERT] Critical Meta API Error:', {
            context,
            errorCode: error.error.code,
            message: error.error.message,
            traceId: error.error.fbtrace_id,
        });

        // TODO: Send to monitoring system
        // await sendToMonitoring({ ... });
    }

    /**
     * Check if error is transient (can be retried)
     */
    isTransientError(errorCode: number): boolean {
        const strategy = ERROR_STRATEGIES[errorCode];
        return strategy?.strategy !== ErrorStrategy.NO_RETRY;
    }

    /**
     * Extract user-friendly error message
     */
    getUserMessage(error: MetaError): string {
        return (
            error.error.error_user_msg ||
            error.error.message ||
            'Ha ocurrido un error al comunicarse con WhatsApp'
        );
    }
}

// Singleton instance
export const metaErrorHandler = new MetaErrorHandler();

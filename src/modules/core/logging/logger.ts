export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
    requestId?: string
    organizationId?: string
    userId?: string
    [key: string]: any
}

function formatLog(level: LogLevel, message: string, context?: LogContext, error?: any) {
    const timestamp = new Date().toISOString()
    const payload: any = {
        timestamp,
        level,
        message,
        ...context
    }

    if (error) {
        if (error instanceof Error) {
            payload.error = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                // Supabase / PostgREST specific errors usually attach code or details
                ...(error as any).code ? { code: (error as any).code } : {},
                ...(error as any).details ? { details: (error as any).details } : {}
            }
        } else {
            payload.error = error
        }
    }

    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
        // Structured JSON logging for Datadog / Vercel
        return JSON.stringify(payload)
    } else {
        // Pretty local logging
        const contextStr = context && Object.keys(context).length > 0 ? `\nContext: ${JSON.stringify(context, null, 2)}` : ''
        const errorStr = error ? `\nError: ${error instanceof Error ? error.stack || error.message : JSON.stringify(error, null, 2)}` : ''
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}${errorStr}`
    }
}

export const logger = {
    debug: (message: string, context?: LogContext) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(formatLog('debug', message, context))
        }
    },
    info: (message: string, context?: LogContext) => {
        console.info(formatLog('info', message, context))
    },
    warn: (message: string, context?: LogContext, error?: any) => {
        console.warn(formatLog('warn', message, context, error))
    },
    error: (message: string, error?: any, context?: LogContext) => {
        console.error(formatLog('error', message, context, error))
    }
}

/**
 * A custom fetch interceptor for Supabase clients to log query performance and errors.
 */
export function createSupabaseFetchInterceptor(clientName: string): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const method = init?.method || 'GET'
        const startTime = Date.now()

        // Extract table or RPC name
        let target = 'unknown'
        try {
            const urlObj = new URL(urlStr)
            target = urlObj.pathname.split('/').pop() || 'unknown'
        } catch { }

        try {
            const response = await fetch(input, init)
            const durationMs = Date.now() - startTime

            // High latency warning
            if (durationMs > 1500) {
                logger.warn(`Slow Supabase Query [${clientName}]`, {
                    target,
                    method,
                    durationMs,
                    url: urlStr,
                })
            }

            if (!response.ok) {
                // To safely read the body without consuming the original response stream, we clone it
                const clonedResponse = response.clone()
                let errorBody = null
                try {
                    errorBody = await clonedResponse.json()
                } catch {
                    try {
                        errorBody = await clonedResponse.text()
                    } catch { }
                }

                logger.error(`Supabase Query Failed [${clientName}]`, errorBody, {
                    target,
                    method,
                    status: response.status,
                    durationMs,
                    url: urlStr,
                })
            }

            return response
        } catch (error) {
            const durationMs = Date.now() - startTime
            logger.error(`Supabase Network Error [${clientName}]`, error, {
                target,
                method,
                durationMs,
                url: urlStr,
            })
            throw error
        }
    }
}

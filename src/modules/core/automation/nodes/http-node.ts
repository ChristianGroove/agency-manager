import { ContextManager } from '../context-manager';

export interface HTTPNodeData {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: string; // JSON string
    timeout?: number; // milliseconds
    retries?: number;
}

export class HTTPNode {
    private data: HTTPNodeData;
    private contextManager: ContextManager;

    constructor(data: HTTPNodeData, contextManager: ContextManager) {
        this.data = data;
        this.contextManager = contextManager;
    }

    async execute(): Promise<void> {
        const maxRetries = this.data.retries ?? 0;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.makeRequest();

                // Store response in context
                this.contextManager.set('http_response', {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data,
                    headers: response.headers
                });

                console.log(`[HTTPNode] Request successful (attempt ${attempt + 1})`);
                return;
            } catch (error) {
                lastError = error as Error;
                console.warn(`[HTTPNode] Request failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

                if (attempt < maxRetries) {
                    // Wait before retry (exponential backoff)
                    await this.sleep(Math.pow(2, attempt) * 1000);
                }
            }
        }

        // All retries failed
        throw new Error(`HTTP request failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
    }

    private async makeRequest(): Promise<{
        status: number;
        statusText: string;
        data: unknown;
        headers: Record<string, string>;
    }> {
        // Resolve URL with context variables
        const resolvedUrl = this.contextManager.resolve(this.data.url);

        // Resolve headers
        const resolvedHeaders: Record<string, string> = {};
        if (this.data.headers) {
            for (const [key, value] of Object.entries(this.data.headers)) {
                resolvedHeaders[key] = this.contextManager.resolve(value);
            }
        }

        // Resolve body
        let resolvedBody: string | undefined;
        if (this.data.body && ['POST', 'PUT', 'PATCH'].includes(this.data.method)) {
            resolvedBody = this.contextManager.resolve(this.data.body);
        }

        // Make request
        const controller = new AbortController();
        const timeout = this.data.timeout ?? 30000; // 30s default
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(resolvedUrl, {
                method: this.data.method,
                headers: {
                    'Content-Type': 'application/json',
                    ...resolvedHeaders
                },
                body: resolvedBody,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Parse response
            let data: unknown;
            const contentType = response.headers.get('content-type');

            if (contentType?.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return {
                status: response.status,
                statusText: response.statusText,
                data,
                headers: Object.fromEntries(response.headers.entries())
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout}ms`);
            }

            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

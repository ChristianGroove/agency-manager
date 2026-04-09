'use server';

/**
 * Node Executor - Real Implementation
 * 
 * This module executes workflow nodes with actual integrations.
 * Used during real workflow execution (not testing/dry-run).
 */

import { sendEmail } from './email-service';
import { sendSMS } from './sms-service';
import { ContextManager } from '../context-manager';

interface WorkflowNodeData {
    label?: string;
    actionType?: string;
    message?: string;
    to?: string;
    subject?: string;
    body?: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    [key: string]: unknown;
}

interface ExecuteNodeResult {
    success: boolean;
    output: unknown;
    error?: string;
}

/**
 * Execute an email node
 */
export async function executeEmailNode(
    nodeData: WorkflowNodeData,
    contextManager: ContextManager
): Promise<ExecuteNodeResult> {
    const to = contextManager.resolve((nodeData.to as string) || '');
    const subject = contextManager.resolve((nodeData.subject as string) || '');
    const body = contextManager.resolve((nodeData.body as string) || '');

    if (!to || !subject || !body) {
        return {
            success: false,
            output: null,
            error: 'Email requires to, subject, and body fields'
        };
    }

    const result = await sendEmail({ to, subject, body });

    if (result.success) {
        contextManager.set('emailId', result.messageId);
        contextManager.set('emailSent', true);
    }

    return {
        success: result.success,
        output: result,
        error: result.error
    };
}

/**
 * Execute an SMS node
 */
export async function executeSMSNode(
    nodeData: WorkflowNodeData,
    contextManager: ContextManager
): Promise<ExecuteNodeResult> {
    const to = contextManager.resolve((nodeData.to as string) || '');
    const body = contextManager.resolve((nodeData.body as string) || '');

    if (!to || !body) {
        return {
            success: false,
            output: null,
            error: 'SMS requires to and body fields'
        };
    }

    const result = await sendSMS({ to, body });

    if (result.success) {
        contextManager.set('smsId', result.messageId);
        contextManager.set('smsSent', true);
        contextManager.set('smsStatus', result.status);
    }

    return {
        success: result.success,
        output: result,
        error: result.error
    };
}

/**
 * Execute an HTTP node
 */
export async function executeHTTPNode(
    nodeData: WorkflowNodeData,
    contextManager: ContextManager
): Promise<ExecuteNodeResult> {
    const method = (nodeData.method as string) || 'GET';
    const url = contextManager.resolve((nodeData.url as string) || '');
    const headers = nodeData.headers || {};
    const bodyData = nodeData.body ? contextManager.resolve(nodeData.body as string) : undefined;

    if (!url) {
        return {
            success: false,
            output: null,
            error: 'HTTP request requires a URL'
        };
    }

    try {
        // Resolve headers with context
        const resolvedHeaders: Record<string, string> = {};
        Object.entries(headers).forEach(([key, value]) => {
            resolvedHeaders[key] = contextManager.resolve(value);
        });

        const fetchOptions: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...resolvedHeaders
            }
        };

        if (bodyData && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            fetchOptions.body = bodyData;
        }

        const response = await fetch(url, fetchOptions);

        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        const result = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData
        };

        contextManager.set('http_response', result);
        contextManager.set('http_status', response.status);

        return {
            success: response.ok,
            output: result,
            error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        };
    } catch (error) {
        return {
            success: false,
            output: null,
            error: error instanceof Error ? error.message : 'HTTP request failed'
        };
    }
}

/**
 * Main node executor
 */
export async function executeNode(
    nodeType: string,
    nodeData: WorkflowNodeData,
    contextManager: ContextManager
): Promise<ExecuteNodeResult> {
    switch (nodeType) {
        case 'email':
            return executeEmailNode(nodeData, contextManager);
        case 'sms':
            return executeSMSNode(nodeData, contextManager);
        case 'http':
            return executeHTTPNode(nodeData, contextManager);
        default:
            return {
                success: true,
                output: { executed: true, nodeType }
            };
    }
}

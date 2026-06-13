import { createClient } from "@/modules/core/database/supabase-server";

export interface PermissionRequest {
    id: string;
    userId: string;
    phoneNumber: string;
    reason: string;
    requestedAt: Date;
    status: 'pending' | 'approved' | 'denied' | 'expired';
    approvedAt?: Date;
    expiresAt?: Date;
}

function isProductionRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function logCallPermissionInfo(label: string, details: Record<string, unknown>) {
    if (!isProductionRuntime()) {
        console.log(label, details);
        return;
    }

    console.log(label, sanitizeCallPermissionLogDetails(details));
}

function logCallPermissionError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error);
        return;
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error });
}

function sanitizeCallPermissionLogDetails(details: Record<string, unknown>) {
    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (key === 'conversationId' || key === 'permissionId') {
                return [`${key}Present`, Boolean(value)];
            }
            return [key, value];
        })
    );
}

/**
 * Call Permission Manager (Persistent version)
 */
export class CallPermissionManager {

    /**
     * Helper to get history from Supabase (using conversations table which HAS a metadata column)
     */
    private async getHistoryFromDb(conversationId: string): Promise<PermissionRequest[]> {
        try {
            const { data, error } = await (await createClient())
                .from('conversations')
                .select('metadata')
                .eq('id', conversationId)
                .single();

            if (error || !data) return [];

            const history = (data.metadata?.call_permissions || []) as any[];

            // Hydrate dates properly
            return history.map(item => ({
                ...item,
                requestedAt: new Date(item.requestedAt),
                approvedAt: item.approvedAt ? new Date(item.approvedAt) : undefined,
                expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined
            }));
        } catch (e) {
            logCallPermissionError('[CallPermission] Error fetching history:', e);
            return [];
        }
    }

    /**
     * Helper to save history to Supabase
     */
    private async saveHistoryToDb(conversationId: string, history: PermissionRequest[]) {
        try {
            // First get existing metadata to preserve other fields
            const { data: current } = await (await createClient())
                .from('conversations')
                .select('metadata')
                .eq('id', conversationId)
                .single();

            const existingMeta = current?.metadata || {};

            logCallPermissionInfo('[CallPermission] Writing history', { conversationId, items: history.length });
            const { error } = await (await createClient())
                .from('conversations')
                .update({
                    metadata: {
                        ...existingMeta,
                        call_permissions: history
                    }
                })
                .eq('id', conversationId);

            if (error) {
                logCallPermissionError('[CallPermission] DB Update Error:', error);
                throw error;
            }
            logCallPermissionInfo('[CallPermission] DB Update Success', { conversationId });
        } catch (e) {
            logCallPermissionError('[CallPermission] Error saving history:', e);
            throw e;
        }
    }

    /**
     * Check if can request call permission
     */
    async canRequestPermission(conversationId: string): Promise<{
        allowed: boolean;
        reason?: string;
        nextAllowedAt?: Date;
        requestsIn24h: number;
        requestsIn7d: number;
    }> {
        const history = await this.getHistoryFromDb(conversationId);

        // Check 24h limit (1 request max)
        const last24h = history.filter(p =>
            p.requestedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        if (last24h.length >= 1) {
            const nextAllowed = new Date(
                last24h[0].requestedAt.getTime() + 24 * 60 * 60 * 1000
            );

            return {
                allowed: false,
                reason: 'Rate limit: 1 request per 24 hours',
                nextAllowedAt: nextAllowed,
                requestsIn24h: last24h.length,
                requestsIn7d: 0
            };
        }

        // Check 7-day limit (max 2 requests)
        const last7d = history.filter(p =>
            p.requestedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );

        if (last7d.length >= 2) {
            const nextAllowed = new Date(
                last7d[0].requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000
            );

            return {
                allowed: false,
                reason: 'Rate limit: Maximum 2 requests in 7 days',
                nextAllowedAt: nextAllowed,
                requestsIn24h: last24h.length,
                requestsIn7d: last7d.length
            };
        }

        return {
            allowed: true,
            requestsIn24h: last24h.length,
            requestsIn7d: last7d.length
        };
    }

    /**
     * Send call permission request via HSM template
     */
    async requestPermission(params: {
        conversationId: string;
        phoneNumber: string;
        reason: string;
    }): Promise<{
        success: boolean;
        permissionId: string;
    }> {
        const { conversationId, phoneNumber, reason } = params;

        // Check if allowed
        const check = await this.canRequestPermission(conversationId);
        if (!check.allowed) {
            throw new Error(`Cannot request permission: ${check.reason}`);
        }

        logCallPermissionInfo('[CallPermission] Requesting permission for conversation', { conversationId });

        // Record permission request
        const permissionId = `perm_${Date.now()}_${conversationId.substring(0, 8)}`;
        const request: PermissionRequest = {
            id: permissionId,
            userId: conversationId, // Internal tracking
            phoneNumber,
            reason,
            requestedAt: new Date(),
            status: 'pending'
        };

        const history = await this.getHistoryFromDb(conversationId);
        history.push(request);
        await this.saveHistoryToDb(conversationId, history);

        logCallPermissionInfo('[CallPermission] Permission requested and saved', { permissionId });

        return { success: true, permissionId };
    }

    /**
     * Handle permission approval (from webhook button click)
     */
    async approvePermission(conversationId: string, permissionId: string): Promise<{
        success: boolean;
        expiresAt: Date;
    }> {
        const history = await this.getHistoryFromDb(conversationId);
        const request = history.find(r => r.id === permissionId);

        if (!request) {
            throw new Error(`Permission request not found: ${permissionId}`);
        }

        if (request.status !== 'pending') {
            throw new Error(`Permission already ${request.status}`);
        }

        // Approve with 72h expiration
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

        request.status = 'approved';
        request.approvedAt = now;
        request.expiresAt = expiresAt;

        await this.saveHistoryToDb(conversationId, history);

        logCallPermissionInfo('[CallPermission] Permission approved', {
            permissionId,
            expiresAt: expiresAt.toISOString()
        });

        return { success: true, expiresAt };
    }

    /**
     * Deny permission request
     */
    async denyPermission(conversationId: string, permissionId: string): Promise<{ success: boolean }> {
        const history = await this.getHistoryFromDb(conversationId);
        const request = history.find(r => r.id === permissionId);

        if (!request) {
            throw new Error(`Permission request not found: ${permissionId}`);
        }

        request.status = 'denied';
        await this.saveHistoryToDb(conversationId, history);

        logCallPermissionInfo('[CallPermission] Permission denied', { permissionId });

        return { success: true };
    }

    /**
     * Validate if can make call (within 72h approval window)
     */
    async canMakeCall(conversationId: string): Promise<{
        allowed: boolean;
        expiresAt?: Date;
        reason?: string;
    }> {
        const history = await this.getHistoryFromDb(conversationId);

        const approved = history
            .filter(r => r.status === 'approved')
            .sort((a, b) => (b.approvedAt?.getTime() || 0) - (a.approvedAt?.getTime() || 0));

        const approval = approved[0] || null;

        if (!approval) {
            return {
                allowed: false,
                reason: 'No approved permission found'
            };
        }

        const now = new Date();
        const expiresAt = approval.expiresAt!;

        if (now >= expiresAt) {
            // Update status to expired
            approval.status = 'expired';
            await this.saveHistoryToDb(conversationId, history);

            return {
                allowed: false,
                reason: 'Permission expired (72h window)',
                expiresAt
            };
        }

        return {
            allowed: true,
            expiresAt
        };
    }

    /**
     * Reset permission limits after successful call
     * (Meta 2026: Limits reset on connected call)
     */
    async resetLimitsAfterCall(conversationId: string): Promise<void> {
        logCallPermissionInfo('[CallPermission] Resetting limits for conversation', { conversationId });

        // Clear call_permissions in DB
        await this.saveHistoryToDb(conversationId, []);

        console.log('[CallPermission] Limits reset - user can request again');
    }

    /**
     * Get permission status for user
     */
    async getPermissionStatus(conversationId: string): Promise<{
        canRequest: boolean;
        canCall: boolean;
        requestsIn24h: number;
        requestsIn7d: number;
        latestApproval?: {
            id: string;
            expiresAt: Date;
            timeRemaining: string;
        };
    }> {
        const canRequestCheck = await this.canRequestPermission(conversationId);
        const canCallCheck = await this.canMakeCall(conversationId);

        // We need history for internal logic
        const history = await this.getHistoryFromDb(conversationId);
        const approved = history.find(r => r.status === 'approved' && r.expiresAt && r.expiresAt > new Date());

        const status: any = {
            canRequest: canRequestCheck.allowed,
            canCall: canCallCheck.allowed,
            requestsIn24h: canRequestCheck.requestsIn24h,
            requestsIn7d: canRequestCheck.requestsIn7d
        };

        if (approved && approved.expiresAt) {
            const timeRemaining = approved.expiresAt.getTime() - Date.now();
            const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));

            status.latestApproval = {
                id: approved.id,
                expiresAt: approved.expiresAt,
                timeRemaining: `${hoursRemaining}h remaining`
            };
        }

        return status;
    }
}

// Singleton instance
export const callPermissionManager = new CallPermissionManager();

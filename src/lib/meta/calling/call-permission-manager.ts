import { supabaseAdmin } from "@/lib/supabase-admin"

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

/**
 * Call Permission Manager (Persistent version)
 */
export class CallPermissionManager {

    /**
     * Helper to get history from Supabase
     */
    private async getHistoryFromDb(userId: string): Promise<PermissionRequest[]> {
        try {
            const { data, error } = await supabaseAdmin
                .from('leads')
                .select('metadata')
                .eq('id', userId)
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
            console.error('[CallPermission] Error fetching history:', e);
            return [];
        }
    }

    /**
     * Helper to save history to Supabase
     */
    private async saveHistoryToDb(userId: string, history: PermissionRequest[]) {
        try {
            // First get existing metadata to preserve other fields
            const { data: current } = await supabaseAdmin
                .from('leads')
                .select('metadata')
                .eq('id', userId)
                .single();

            const existingMeta = current?.metadata || {};

            const { error } = await supabaseAdmin
                .from('leads')
                .update({
                    metadata: {
                        ...existingMeta,
                        call_permissions: history
                    }
                })
                .eq('id', userId);

            if (error) throw error;
        } catch (e) {
            console.error('[CallPermission] Error saving history:', e);
            throw e;
        }
    }

    /**
     * Check if can request call permission
     */
    async canRequestPermission(userId: string): Promise<{
        allowed: boolean;
        reason?: string;
        nextAllowedAt?: Date;
        requestsIn24h: number;
        requestsIn7d: number;
    }> {
        const history = await this.getHistoryFromDb(userId);

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
        userId: string;
        phoneNumber: string;
        reason: string;
    }): Promise<{
        success: boolean;
        permissionId: string;
    }> {
        const { userId, phoneNumber, reason } = params;

        // Check if allowed
        const check = await this.canRequestPermission(userId);
        if (!check.allowed) {
            throw new Error(`Cannot request permission: ${check.reason}`);
        }

        console.log('[CallPermission] Requesting permission for user:', userId);

        // Record permission request
        const permissionId = `perm_${Date.now()}_${userId.substring(0, 8)}`;
        const request: PermissionRequest = {
            id: permissionId,
            userId,
            phoneNumber,
            reason,
            requestedAt: new Date(),
            status: 'pending'
        };

        const history = await this.getHistoryFromDb(userId);
        history.push(request);
        await this.saveHistoryToDb(userId, history);

        console.log('[CallPermission] Permission requested and saved:', permissionId);

        return { success: true, permissionId };
    }

    /**
     * Handle permission approval (from webhook button click)
     */
    async approvePermission(userId: string, permissionId: string): Promise<{
        success: boolean;
        expiresAt: Date;
    }> {
        const history = await this.getHistoryFromDb(userId);
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

        await this.saveHistoryToDb(userId, history);

        console.log('[CallPermission] Permission approved:', {
            permissionId,
            expiresAt: expiresAt.toISOString()
        });

        return { success: true, expiresAt };
    }

    /**
     * Deny permission request
     */
    async denyPermission(userId: string, permissionId: string): Promise<{ success: boolean }> {
        const history = await this.getHistoryFromDb(userId);
        const request = history.find(r => r.id === permissionId);

        if (!request) {
            throw new Error(`Permission request not found: ${permissionId}`);
        }

        request.status = 'denied';
        await this.saveHistoryToDb(userId, history);

        console.log('[CallPermission] Permission denied:', permissionId);

        return { success: true };
    }

    /**
     * Validate if can make call (within 72h approval window)
     */
    async canMakeCall(userId: string): Promise<{
        allowed: boolean;
        expiresAt?: Date;
        reason?: string;
    }> {
        const history = await this.getHistoryFromDb(userId);

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
            await this.saveHistoryToDb(userId, history);

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
    async resetLimitsAfterCall(userId: string): Promise<void> {
        console.log('[CallPermission] Resetting limits for user:', userId);

        // Clear call_permissions in DB
        await this.saveHistoryToDb(userId, []);

        console.log('[CallPermission] Limits reset - user can request again');
    }

    /**
     * Get permission status for user
     */
    async getPermissionStatus(userId: string): Promise<{
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
        const canRequestCheck = await this.canRequestPermission(userId);
        const canCallCheck = await this.canMakeCall(userId);

        // We need history for internal logic
        const history = await this.getHistoryFromDb(userId);
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

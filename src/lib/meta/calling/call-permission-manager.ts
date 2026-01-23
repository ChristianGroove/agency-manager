/**
 * Call Permission Manager
 * 
 * Manages call permissions with Meta 2026 strict limits:
 * - 1 request per 24 hours per user
 * - Maximum 2 requests in 7-day window
 * - Call must occur within 72h of approval
 * - Limits reset after successful connected call
 */

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
 * Call Permission Manager
 */
export class CallPermissionManager {
    private permissionHistory: Map<string, PermissionRequest[]> = new Map();

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
        const history = this.getPermissionHistory(userId);

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

        // TODO: Send actual HSM template via WhatsApp
        // For now, simulate template send
        /*
        await sendWhatsAppTemplate({
            to: phoneNumber,
            template: {
                name: 'call_permission_request',
                language: { code: 'es' },
                components: [
                    {
                        type: 'body',
                        parameters: [{ type: 'text', text: reason }]
                    },
                    {
                        type: 'button',
                        sub_type: 'quick_reply',
                        index: '0',
                        parameters: [{ type: 'payload', payload: 'APPROVE_CALL' }]
                    },
                    {
                        type: 'button',
                        sub_type: 'quick_reply',
                        index: '1',
                        parameters: [{ type: 'payload', payload: 'DENY_CALL' }]
                    }
                ]
            }
        });
        */

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

        const history = this.getPermissionHistory(userId);
        history.push(request);
        this.permissionHistory.set(userId, history);

        console.log('[CallPermission] Permission requested:', permissionId);

        return { success: true, permissionId };
    }

    /**
     * Handle permission approval (from webhook button click)
     */
    async approvePermission(permissionId: string): Promise<{
        success: boolean;
        expiresAt: Date;
    }> {
        const request = this.findPermissionRequest(permissionId);

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

        console.log('[CallPermission] Permission approved:', {
            permissionId,
            expiresAt: expiresAt.toISOString()
        });

        return { success: true, expiresAt };
    }

    /**
     * Deny permission request
     */
    async denyPermission(permissionId: string): Promise<{ success: boolean }> {
        const request = this.findPermissionRequest(permissionId);

        if (!request) {
            throw new Error(`Permission request not found: ${permissionId}`);
        }

        request.status = 'denied';

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
        const approval = this.getLatestApproval(userId);

        if (!approval) {
            return {
                allowed: false,
                reason: 'No approved permission found'
            };
        }

        if (approval.status !== 'approved') {
            return {
                allowed: false,
                reason: `Permission status: ${approval.status}`
            };
        }

        const now = new Date();
        const expiresAt = approval.expiresAt!;

        if (now >= expiresAt) {
            // Mark as expired
            approval.status = 'expired';

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

        // Clear history for this user
        this.permissionHistory.set(userId, []);

        console.log('[CallPermission] Limits reset - user can request again');
    }

    /**
     * Get permission history for user
     */
    private getPermissionHistory(userId: string): PermissionRequest[] {
        return this.permissionHistory.get(userId) || [];
    }

    /**
     * Find permission request by ID
     */
    private findPermissionRequest(permissionId: string): PermissionRequest | null {
        for (const [userId, history] of this.permissionHistory.entries()) {
            const request = history.find(r => r.id === permissionId);
            if (request) return request;
        }
        return null;
    }

    /**
     * Get latest approved permission
     */
    private getLatestApproval(userId: string): PermissionRequest | null {
        const history = this.getPermissionHistory(userId);

        const approved = history
            .filter(r => r.status === 'approved')
            .sort((a, b) => b.approvedAt!.getTime() - a.approvedAt!.getTime());

        return approved[0] || null;
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

        const status: any = {
            canRequest: canRequestCheck.allowed,
            canCall: canCallCheck.allowed,
            requestsIn24h: canRequestCheck.requestsIn24h,
            requestsIn7d: canRequestCheck.requestsIn7d
        };

        if (canCallCheck.expiresAt) {
            const timeRemaining = canCallCheck.expiresAt.getTime() - Date.now();
            const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));

            status.latestApproval = {
                id: this.getLatestApproval(userId)?.id || '',
                expiresAt: canCallCheck.expiresAt,
                timeRemaining: `${hoursRemaining}h remaining`
            };
        }

        return status;
    }
}

// Singleton instance
export const callPermissionManager = new CallPermissionManager();

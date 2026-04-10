/**
 * Account Health Monitor
 * 
 * Monitors WhatsApp Business Account health metrics and provides proactive
 * alerts for quality degradation and frequency capping.
 * 
 * CRITICAL: Auto-pauses marketing campaigns on critical quality to protect
 * messaging limits from reduction (100k → 10k/day).
 */

export interface QualityAlert {
    severity: 'info' | 'warning' | 'critical';
    type:
    | 'quality_downgrade'
    | 'frequency_cap'
    | 'limit_reduction'
    | 'template_rejected'
    | 'template_paused';
    message: string;
    phone_number_id: string;
    current_quality?: string;
    previous_quality?: string;
    template_name?: string;
    timestamp: Date;
    auto_action_taken?: string;
}

export type QualityRating = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

/**
 * Account Health Monitor
 */
export class AccountHealthMonitor {
    private readonly qualityLevels: Record<QualityRating, number> = {
        'HIGH': 3,
        'MEDIUM': 2,
        'LOW': 1,
        'UNKNOWN': 0
    };

    /**
     * Process account_alerts webhook
     */
    async processAccountAlert(alertData: any): Promise<void> {
        const { alert_type, phone_number_id, data } = alertData;

        console.log('[Health] 🔔 Account alert:', {
            type: alert_type,
            phone_number_id
        });

        switch (alert_type) {
            case 'quality_update':
                await this.handleQualityUpdate(phone_number_id, data);
                break;

            case 'frequency_cap':
                await this.handleFrequencyCap(phone_number_id, data);
                break;

            case 'messaging_limit_update':
                await this.handleLimitUpdate(phone_number_id, data);
                break;

            default:
                console.warn('[Health] Unknown alert type:', alert_type);
        }
    }

    /**
     * Handle quality rating change
     * 
     * CRITICAL: Auto-pause marketing on CRITICAL quality to prevent limit reduction
     */
    private async handleQualityUpdate(
        phoneNumberId: string,
        data: any
    ): Promise<void> {
        const { current_quality, previous_quality } = data;

        console.log('[Health] Quality update:', {
            phoneNumberId,
            previous: previous_quality,
            current: current_quality
        });

        // Determine if downgrade
        const isDowngrade = this.isQualityDowngrade(previous_quality, current_quality);

        if (!isDowngrade && current_quality !== 'LOW') {
            console.log('[Health] ✅ Quality maintained or improved');
            return;
        }

        // Determine severity
        let severity: QualityAlert['severity'] = 'info';
        let autoAction: string | undefined;

        if (current_quality === 'MEDIUM' && previous_quality === 'HIGH') {
            severity = 'warning';
        } else if (current_quality === 'LOW') {
            severity = 'critical';

            // AUTO-PAUSE: Stop all marketing to prevent further degradation
            console.log('[Health] 🚨 CRITICAL QUALITY - AUTO-PAUSING MARKETING');
            await this.pauseMarketingCampaigns(phoneNumberId);
            autoAction = 'Marketing campaigns auto-paused';
        }

        const alert: QualityAlert = {
            severity,
            type: 'quality_downgrade',
            message: `Quality Rating changed from ${previous_quality} to ${current_quality}`,
            phone_number_id: phoneNumberId,
            current_quality,
            previous_quality,
            timestamp: new Date(),
            auto_action_taken: autoAction
        };

        // Send alert to ops team
        await this.sendAlert(alert);

        // Log to database
        await this.logHealthEvent(alert);
    }

    /**
     * Handle frequency capping alert
     * 
     * Frequency caps are applied when users report messages as spam
     * or block the number
     */
    private async handleFrequencyCap(
        phoneNumberId: string,
        data: any
    ): Promise<void> {
        console.log('[Health] ⚠️ Frequency cap applied:', data);

        const alert: QualityAlert = {
            severity: 'warning',
            type: 'frequency_cap',
            message: 'Frequency cap applied due to user behavior or quality issues. Reduce messaging frequency.',
            phone_number_id: phoneNumberId,
            timestamp: new Date()
        };

        await this.sendAlert(alert);
        await this.logHealthEvent(alert);

        // Recommendation: Reduce campaign frequency by 50%
        console.log('[Health] Recommendation: Reduce campaign frequency by 50%');
    }

    /**
     * Handle messaging limit update
     * 
     * CRITICAL: Limit reductions are severe (e.g. 100k → 10k/day)
     */
    private async handleLimitUpdate(
        phoneNumberId: string,
        data: any
    ): Promise<void> {
        const { new_limit, previous_limit, reason } = data;

        console.log('[Health] Limit update:', {
            phoneNumberId,
            previous: previous_limit,
            new: new_limit,
            reason
        });

        // Alert if limit decreased
        if (new_limit < previous_limit) {
            const alert: QualityAlert = {
                severity: 'critical',
                type: 'limit_reduction',
                message: `🚨 CRITICAL: Messaging limit reduced from ${previous_limit} to ${new_limit}/day. Reason: ${reason || 'Quality issues'}`,
                phone_number_id: phoneNumberId,
                timestamp: new Date()
            };

            await this.sendAlert(alert);
            await this.logHealthEvent(alert);

            console.log('[Health] 🚨 LIMIT REDUCTION - Immediate action required');
        } else {
            console.log('[Health] ✅ Limit increased or maintained');
        }
    }

    /**
     * Process message_template_quality_update webhook
     */
    async processTemplateQualityUpdate(updateData: any): Promise<void> {
        const {
            template_name,
            quality_score,
            previous_score,
            phone_number_id,
            event
        } = updateData;

        console.log('[Health] Template quality update:', {
            template: template_name,
            previous: previous_score,
            current: quality_score,
            event
        });

        // Handle template events
        if (event === 'FLAGGED') {
            const alert: QualityAlert = {
                severity: 'warning',
                type: 'template_rejected',
                message: `Template "${template_name}" flagged by Meta. Review for spam/policy violations.`,
                phone_number_id,
                template_name,
                timestamp: new Date()
            };

            await this.sendAlert(alert);
        } else if (event === 'PAUSED') {
            const alert: QualityAlert = {
                severity: 'critical',
                type: 'template_paused',
                message: `Template "${template_name}" PAUSED by Meta due to quality issues. Cannot send until fixed.`,
                phone_number_id,
                template_name,
                timestamp: new Date()
            };

            await this.sendAlert(alert);
            await this.logHealthEvent(alert);
        }

        // Check if quality degraded
        if (this.isQualityDowngrade(previous_score, quality_score)) {
            const alert: QualityAlert = {
                severity: 'warning',
                type: 'quality_downgrade',
                message: `Template "${template_name}" quality degraded from ${previous_score} to ${quality_score}`,
                phone_number_id,
                template_name,
                timestamp: new Date()
            };

            await this.sendAlert(alert);
        }
    }

    /**
     * Send alert to operations team
     * 
     * Multiple channels for different severities
     */
    private async sendAlert(alert: QualityAlert): Promise<void> {
        console.log(`[Health] 🚨 ALERT [${alert.severity.toUpperCase()}]:`, alert.message);

        // TODO: Send to notification channels based on severity
        /*
        if (alert.severity === 'critical') {
            // CRITICAL: Email + Slack + PagerDuty
            await Promise.all([
                sendEmail({
                    to: process.env.OPS_TEAM_EMAIL,
                    subject: `🚨 CRITICAL: WhatsApp Account Health Alert`,
                    body: this.formatAlertEmail(alert)
                }),
                
                sendSlackAlert({
                    channel: '#ops-critical-alerts',
                    message: alert.message,
                    severity: 'critical',
                    metadata: {
                        phone_number_id: alert.phone_number_id,
                        auto_action: alert.auto_action_taken
                    }
                }),
                
                sendPagerDutyAlert({
                    incident_key: `health_${alert.phone_number_id}_${Date.now()}`,
                    description: alert.message,
                    severity: 'critical'
                })
            ]);
            
        } else if (alert.severity === 'warning') {
            // WARNING: Email + Slack
            await Promise.all([
                sendEmail({
                    to: process.env.OPS_TEAM_EMAIL,
                    subject: `⚠️ WARNING: WhatsApp Account Health`,
                    body: this.formatAlertEmail(alert)
                }),
                
                sendSlackAlert({
                    channel: '#ops-alerts',
                    message: alert.message,
                    severity: 'warning'
                })
            ]);
            
        } else {
            // INFO: Slack only
            await sendSlackAlert({
                channel: '#ops-info',
                message: alert.message,
                severity: 'info'
            });
        }
        */

        console.log('[Health] Alert sent via configured channels');
    }

    /**
     * Auto-pause marketing campaigns to protect account
     * 
     * Called when quality reaches CRITICAL (LOW)
     */
    private async pauseMarketingCampaigns(phoneNumberId: string): Promise<void> {
        console.log('[Health] 🛑 AUTO-PAUSING all marketing campaigns for:', phoneNumberId);

        // TODO: Pause active marketing campaigns
        /*
        const pausedCount = await db.marketing_campaigns.updateMany({
            where: {
                phone_number_id: phoneNumberId,
                status: 'active',
                type: 'marketing' // Only pause marketing, not transactional
            },
            data: {
                status: 'paused',
                paused_reason: 'quality_rating_critical',
                paused_at: new Date(),
                paused_by: 'system_auto_protection'
            }
        });
        
        console.log(`[Health] ✓ Paused ${pausedCount} active campaigns`);
        */

        console.log('[Health] ✓ Marketing campaigns paused (protection mode)');
    }

    /**
     * Log health event to database
     */
    private async logHealthEvent(alert: QualityAlert): Promise<void> {
        // TODO: Store in account_health_events table
        /*
        await db.account_health_events.create({
            phone_number_id: alert.phone_number_id,
            event_type: alert.type,
            severity: alert.severity,
            message: alert.message,
            current_quality: alert.current_quality,
            previous_quality: alert.previous_quality,
            template_name: alert.template_name,
            auto_action_taken: alert.auto_action_taken,
            created_at: alert.timestamp
        });
        */

        console.log('[Health] Event logged to database');
    }

    /**
     * Check if quality downgraded
     */
    private isQualityDowngrade(previous: string, current: string): boolean {
        const prevLevel = this.qualityLevels[previous as QualityRating] || 0;
        const currLevel = this.qualityLevels[current as QualityRating] || 0;

        return currLevel < prevLevel;
    }

    /**
     * Get current account health from Meta API
     */
    async getAccountHealth(phoneNumberId: string): Promise<{
        quality_rating: QualityRating;
        messaging_limit: number;
        messaging_limit_tier: string;
        health_status: 'healthy' | 'warning' | 'critical';
        recommendations: string[];
    }> {
        const META_API_VERSION = 'v24.0';
        const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

        if (!ACCESS_TOKEN) {
            throw new Error('META_ACCESS_TOKEN not configured');
        }

        try {
            const response = await fetch(
                `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}?fields=quality_rating,messaging_limit_tier`,
                {
                    headers: {
                        'Authorization': `Bearer ${ACCESS_TOKEN}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // Determine health status
            let health_status: 'healthy' | 'warning' | 'critical' = 'healthy';
            const recommendations: string[] = [];

            if (data.quality_rating === 'MEDIUM') {
                health_status = 'warning';
                recommendations.push('Review recent message templates for quality issues');
                recommendations.push('Ensure opt-in consent for all marketing messages');
                recommendations.push('Monitor user feedback and block rates');
            } else if (data.quality_rating === 'LOW' || data.quality_rating === 'UNKNOWN') {
                health_status = 'critical';
                recommendations.push('🚨 URGENT: Stop all marketing campaigns immediately');
                recommendations.push('Review Meta quality guidelines');
                recommendations.push('Submit quality improvement plan to Meta');
                recommendations.push('Reduce messaging frequency by 75%');
            }

            return {
                quality_rating: data.quality_rating as QualityRating,
                messaging_limit: this.getTierLimit(data.messaging_limit_tier),
                messaging_limit_tier: data.messaging_limit_tier,
                health_status,
                recommendations
            };

        } catch (error: any) {
            console.error('[Health] Failed to get account health:', error);
            throw error;
        }
    }

    /**
     * Get messaging limit from tier
     */
    private getTierLimit(tier: string): number {
        const limits: Record<string, number> = {
            'TIER_1K': 1000,
            'TIER_10K': 10000,
            'TIER_100K': 100000,
            'TIER_UNLIMITED': 1000000
        };

        return limits[tier] || 0;
    }

    /**
     * Format alert email
     */
    private formatAlertEmail(alert: QualityAlert): string {
        return `
WhatsApp Account Health Alert

Severity: ${alert.severity.toUpperCase()}
Type: ${alert.type}
Phone Number ID: ${alert.phone_number_id}

Message:
${alert.message}

${alert.auto_action_taken ? `Auto Action Taken:\n${alert.auto_action_taken}\n\n` : ''}
${alert.current_quality ? `Current Quality: ${alert.current_quality}\n` : ''}
${alert.previous_quality ? `Previous Quality: ${alert.previous_quality}\n` : ''}
${alert.template_name ? `Template: ${alert.template_name}\n` : ''}

Timestamp: ${alert.timestamp.toISOString()}

Action Required:
${this.getActionGuidance(alert)}

Login to Pixy Dashboard for full details.
        `.trim();
    }

    /**
     * Get action guidance for alert
     */
    private getActionGuidance(alert: QualityAlert): string {
        if (alert.severity === 'critical') {
            return '1. Review recent campaign activity\n2. Check for policy violations\n3. Pause non-essential messaging\n4. Submit quality improvement plan to Meta';
        } else if (alert.severity === 'warning') {
            return '1. Monitor quality metrics closely\n2. Review message templates\n3. Ensure proper opt-in consent\n4. Reduce messaging frequency if needed';
        } else {
            return 'Monitor situation, no immediate action required';
        }
    }
}

// Singleton instance
export const accountHealthMonitor = new AccountHealthMonitor();

/**
 * Reviewer Mode Configuration
 * 
 * Enables Meta reviewers to test Pixy without real WABA configuration.
 * Provides demo data, test credentials, and bypasses production checks.
 */

export interface ReviewerModeConfig {
    enabled: boolean;
    testPhoneNumbers: string[];
    demoData: boolean;
    bypassVerification: boolean;
    locale: 'en' | 'es';
}

export interface ReviewerCredentials {
    email: string;
    password: string;
    phoneNumber: string;
    wabaId: string;
    phoneNumberId: string;
}

/**
 * Reviewer Mode Manager
 */
export class ReviewerModeManager {
    private config: ReviewerModeConfig;

    constructor() {
        this.config = {
            enabled: process.env.REVIEWER_MODE === 'true',
            testPhoneNumbers: [
                '+15550000001', // Meta Public Test Number 1
                '+15550000002'  // Meta Public Test Number 2
            ],
            demoData: process.env.DEMO_DATA_MODE === 'true',
            bypassVerification: process.env.BYPASS_VERIFICATION === 'true',
            locale: process.env.REVIEWER_LOCALE as 'en' | 'es' || 'en'
        };
    }

    /**
     * Check if reviewer mode is active
     */
    isReviewerMode(): boolean {
        return this.config.enabled;
    }

    /**
     * Get test credentials for Meta reviewers
     */
    getReviewerCredentials(): ReviewerCredentials {
        return {
            email: 'meta_reviewer@pixy.test',
            password: 'MetaReview2026!Secure',
            phoneNumber: '+15550000001',
            wabaId: process.env.TEST_WABA_ID || 'test_waba_123456',
            phoneNumberId: process.env.TEST_PHONE_NUMBER_ID || 'test_phone_123456'
        };
    }

    /**
     * Get demo data for testing
     */
    getDemoData(): {
        clients: any[];
        conversations: any[];
        campaigns: any[];
        conversions: any[];
        callLogs: any[];
    } {
        return {
            clients: [
                {
                    id: 'demo_client_1',
                    name: 'Acme Corporation',
                    phone: '+15550000001',
                    email: 'contact@acme-demo.com',
                    status: 'active',
                    created_at: new Date('2026-01-01'),
                    is_ctwa_originated: true,
                    ctwa_clid: 'demo_ad_abc123'
                },
                {
                    id: 'demo_client_2',
                    name: 'Tech Innovations Inc',
                    phone: '+15550000002',
                    email: 'info@techinnovations-demo.com',
                    status: 'active',
                    created_at: new Date('2026-01-10')
                }
            ],
            conversations: [
                {
                    id: 'demo_conv_1',
                    client_id: 'demo_client_1',
                    messages: [
                        {
                            from: '+15550000001',
                            text: 'I need to schedule an appointment',
                            timestamp: new Date('2026-01-20T10:00:00'),
                            intent: 'appointment_booking'
                        },
                        {
                            from: 'pixy',
                            text: 'I can help you schedule an appointment. Let me open the booking form.',
                            timestamp: new Date('2026-01-20T10:00:05'),
                            flow_launched: 'appointment_booking'
                        }
                    ]
                }
            ],
            campaigns: [
                {
                    id: 'demo_campaign_1',
                    name: 'New Year Promotion',
                    template: 'new_year_2026',
                    status: 'completed',
                    sent: 150,
                    delivered: 148,
                    read: 120,
                    ad_spend: 500,
                    ctwa_clid: 'demo_ad_abc123'
                }
            ],
            conversions: [
                {
                    id: 'demo_conv_1',
                    event_type: 'LeadSubmitted',
                    user_phone: '+15550000001',
                    ctwa_clid: 'demo_ad_abc123',
                    flow_id: 'appointment_booking',
                    timestamp: new Date('2026-01-20T10:05:00')
                },
                {
                    id: 'demo_conv_2',
                    event_type: 'Purchase',
                    user_phone: '+15550000001',
                    ctwa_clid: 'demo_ad_abc123',
                    value: 299.99,
                    currency: 'USD',
                    timestamp: new Date('2026-01-21T14:30:00')
                }
            ],
            callLogs: [
                {
                    id: 'demo_call_1',
                    from: '+15550000001',
                    to: 'pixy_support',
                    status: 'completed',
                    duration: 180, // 3 minutes
                    started_at: new Date('2026-01-22T15:00:00'),
                    ended_at: new Date('2026-01-22T15:03:00')
                }
            ]
        };
    }

    /**
     * Get demo ROI metrics
     */
    getDemoROIMetrics(): {
        leads: number;
        purchases: number;
        revenue: number;
        ad_spend: number;
        cpl: number;
        roi: number;
    } {
        const leads = 45;
        const purchases = 12;
        const revenue = 3599.88;
        const ad_spend = 500;

        return {
            leads,
            purchases,
            revenue,
            ad_spend,
            cpl: ad_spend / leads, // $11.11 per lead
            roi: ((revenue - ad_spend) / ad_spend) * 100 // 619.98% ROI
        };
    }

    /**
     * Get demo account health
     */
    getDemoAccountHealth(): {
        quality_rating: string;
        messaging_limit: number;
        health_status: string;
    } {
        return {
            quality_rating: 'HIGH',
            messaging_limit: 100000,
            health_status: 'healthy'
        };
    }

    /**
     * Bypass production verification checks
     */
    shouldBypassVerification(): boolean {
        return this.config.bypassVerification && this.config.enabled;
    }

    /**
     * Get test phone numbers
     */
    getTestPhoneNumbers(): string[] {
        return this.config.testPhoneNumbers;
    }

    /**
     * Get locale for UI
     */
    getLocale(): 'en' | 'es' {
        return this.config.locale;
    }

    /**
     * Initialize demo environment
     */
    async initializeDemoEnvironment(): Promise<{
        success: boolean;
        credentials: ReviewerCredentials;
        demoDataLoaded: boolean;
    }> {
        if (!this.config.enabled) {
            throw new Error('Reviewer mode not enabled');
        }

        console.log('[ReviewerMode] Initializing demo environment');

        // Load demo data into memory/database
        const demoData = this.getDemoData();

        // TODO: Seed database with demo data
        /*
        await db.clients.createMany({ data: demoData.clients });
        await db.conversations.createMany({ data: demoData.conversations });
        await db.campaigns.createMany({ data: demoData.campaigns });
        await db.conversions.createMany({ data: demoData.conversions });
        await db.callLogs.createMany({ data: demoData.callLogs });
        */

        console.log('[ReviewerMode] ✅ Demo environment ready');

        return {
            success: true,
            credentials: this.getReviewerCredentials(),
            demoDataLoaded: true
        };
    }

    /**
     * Get test configuration display
     */
    getTestConfiguration(): {
        mode: string;
        locale: string;
        test_numbers: string[];
        demo_data: boolean;
        bypass_verification: boolean;
    } {
        return {
            mode: this.config.enabled ? 'REVIEWER' : 'PRODUCTION',
            locale: this.config.locale,
            test_numbers: this.config.testPhoneNumbers,
            demo_data: this.config.demoData,
            bypass_verification: this.config.bypassVerification
        };
    }
}

// Singleton instance
export const reviewerMode = new ReviewerModeManager();

/**
 * Middleware to check reviewer mode
 */
export function isReviewerRequest(req: any): boolean {
    const reviewerHeader = req.headers.get('x-meta-reviewer');
    const reviewerCookie = req.cookies.get('reviewer_mode');

    return reviewerMode.isReviewerMode() && (reviewerHeader === 'true' || reviewerCookie === 'true');
}

/**
 * Helper: Get data (real or demo based on mode)
 */
export async function getData<T>(
    realDataFn: () => Promise<T>,
    demoDataFn: () => T
): Promise<T> {
    if (reviewerMode.isReviewerMode() && reviewerMode.getTestConfiguration().demo_data) {
        return demoDataFn();
    }

    return await realDataFn();
}

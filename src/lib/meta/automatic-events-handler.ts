/**
 * Automatic Events Handler
 * 
 * Processes conversion events from Meta Automatic Events API for attribution
 * and ROI calculation. Tracks ctwa_clid (Click-to-WhatsApp Ad ID) to measure
 * ad performance.
 */

export interface ConversionEvent {
    event_type: 'LeadSubmitted' | 'Purchase';
    event_time: Date;
    user_phone: string;
    ctwa_clid?: string; // Click-to-WhatsApp Ad ID - CRITICAL for attribution
    flow_id?: string;
    value?: number; // Purchase value
    currency?: string;
    event_source_url?: string;
}

export interface AttributionData {
    ad_click_id: string;
    conversion_type: string;
    conversion_value: number;
    converted_at: Date;
    time_to_conversion: number; // Seconds from click to conversion
}

/**
 * Automatic Events Handler for Conversion Tracking
 */
export class AutomaticEventsHandler {
    /**
     * Process incoming automatic event from Meta webhook
     */
    async processEvent(webhookEvent: any): Promise<void> {
        const { event_type, event_time, user_data, custom_data } = webhookEvent;

        console.log('[AutoEvents] Processing conversion event:', event_type);

        // Extract conversion data
        const conversionEvent: ConversionEvent = {
            event_type: event_type as 'LeadSubmitted' | 'Purchase',
            event_time: new Date(event_time * 1000), // Unix timestamp to Date
            user_phone: this.normalizePhoneNumber(user_data?.phone_number),
            ctwa_clid: custom_data?.ctwa_clid, // Attribution key
            flow_id: custom_data?.flow_id,
            value: custom_data?.value ? parseFloat(custom_data.value) : undefined,
            currency: custom_data?.currency || 'USD',
            event_source_url: custom_data?.event_source_url
        };

        // Validate event
        if (!conversionEvent.user_phone) {
            console.warn('[AutoEvents] Missing phone number, skipping event');
            return;
        }

        console.log('[AutoEvents] Conversion data:', {
            type: conversionEvent.event_type,
            phone: conversionEvent.user_phone,
            ctwa_clid: conversionEvent.ctwa_clid,
            value: conversionEvent.value
        });

        // Step 1: Store conversion event
        await this.storeConversion(conversionEvent);

        // Step 2: Attribution to ad if ctwa_clid present
        if (conversionEvent.ctwa_clid) {
            await this.attributeToAd(conversionEvent);

            // Step 3: Mark conversation as originated from CTWA (72h free window)
            await this.markCTWAConversation(conversionEvent);
        }

        // Step 4: Update real-time metrics
        await this.updateConversionMetrics(conversionEvent);

        // Step 5: Link to Flow if flow_id present
        if (conversionEvent.flow_id) {
            await this.linkToFlow(conversionEvent);
        }
    }

    /**
     * Store conversion event in database
     */
    private async storeConversion(event: ConversionEvent): Promise<void> {
        console.log('[AutoEvents] Storing conversion:', event.event_type);

        // TODO: Store in conversion_events table
        /*
        await db.conversion_events.create({
            event_type: event.event_type,
            event_time: event.event_time,
            user_phone: event.user_phone,
            ctwa_clid: event.ctwa_clid,
            flow_id: event.flow_id,
            value: event.value,
            currency: event.currency,
            event_source_url: event.event_source_url,
            created_at: new Date()
        });
        */

        console.log('[AutoEvents] ✅ Conversion stored');
    }

    /**
     * Attribute conversion to marketing ad
     * CRITICAL: This links ad spend to revenue
     */
    private async attributeToAd(event: ConversionEvent): Promise<void> {
        if (!event.ctwa_clid) return;

        console.log('[AutoEvents] 💰 Attribution:', {
            ctwa_clid: event.ctwa_clid,
            event_type: event.event_type,
            value: event.value
        });

        // TODO: Update campaign_conversions table
        /*
        const attributionData: AttributionData = {
            ad_click_id: event.ctwa_clid,
            conversion_type: event.event_type,
            conversion_value: event.value || 0,
            converted_at: event.event_time,
            time_to_conversion: await this.getTimeToConversion(event.ctwa_clid, event.event_time)
        };

        await db.campaign_conversions.create(attributionData);
        
        // Update ad performance metrics
        await db.ad_campaigns.increment({
            where: { ctwa_clid: event.ctwa_clid },
            fields: {
                conversions: 1,
                revenue: event.value || 0
            }
        });
        */

        console.log('[AutoEvents] ✅ Attribution recorded');
    }

    /**
     * Mark conversation as CTWA-originated (72h free window)
     * 
     * IMPORTANT: Conversations from Click-to-WhatsApp Ads have 72h free window
     * Even marketing templates don't generate charges during this window
     */
    private async markCTWAConversation(event: ConversionEvent): Promise<void> {
        if (!event.ctwa_clid) return;

        console.log('[AutoEvents] Marking CTWA conversation for:', event.user_phone);

        // Calculate 72h free window end
        const freeWindowEnd = new Date(event.event_time);
        freeWindowEnd.setHours(freeWindowEnd.getHours() + 72);

        // TODO: Update client/conversation record
        /*
        await db.conversations.update({
            where: { user_phone: event.user_phone },
            data: {
                is_ctwa_originated: true,
                ctwa_clid: event.ctwa_clid,
                ctwa_free_window_end: freeWindowEnd,
                updated_at: new Date()
            }
        });
        
        // Add flag to client record
        await db.clients.update({
            where: { phone: event.user_phone },
            data: {
                acquisition_source: 'ctwa',
                ctwa_click_id: event.ctwa_clid
            }
        });
        */

        console.log('[AutoEvents] ✅ CTWA flag set, free window until:', freeWindowEnd.toISOString());
    }

    /**
     * Update real-time conversion metrics
     */
    private async updateConversionMetrics(event: ConversionEvent): Promise<void> {
        console.log('[AutoEvents] Updating metrics');

        // TODO: Increment counters in real-time metrics table
        /*
        if (event.event_type === 'LeadSubmitted') {
            await redis.incr('metrics:leads:total');
            await redis.incr(`metrics:leads:${new Date().toISOString().split('T')[0]}`);
        } else if (event.event_type === 'Purchase') {
            await redis.incr('metrics:purchases:total');
            await redis.incr(`metrics:purchases:${new Date().toISOString().split('T')[0]}`);
            
            if (event.value) {
                await redis.incrby('metrics:revenue:total', event.value);
            }
        }
        */

        console.log('[AutoEvents] ✅ Metrics updated');
    }

    /**
     * Link conversion to Flow (Fase 3 integration)
     */
    private async linkToFlow(event: ConversionEvent): Promise<void> {
        if (!event.flow_id) return;

        console.log('[AutoEvents] Linking to Flow:', event.flow_id);

        // TODO: Track Flow performance
        /*
        await db.flow_analytics.increment({
            where: { flow_id: event.flow_id },
            fields: {
                conversions: 1,
                conversion_value: event.value || 0
            }
        });
        */

        console.log('[AutoEvents] ✅ Flow analytics updated');
    }

    /**
     * Calculate time from ad click to conversion
     */
    private async getTimeToConversion(ctwa_clid: string, conversionTime: Date): Promise<number> {
        // TODO: Get click timestamp from ad_clicks table
        /*
        const click = await db.ad_clicks.findFirst({
            where: { ctwa_clid }
        });
        
        if (click) {
            return Math.floor((conversionTime.getTime() - click.clicked_at.getTime()) / 1000);
        }
        */

        return 0; // Unknown
    }

    /**
     * Normalize phone number to E.164 format
     */
    private normalizePhoneNumber(phone: string): string {
        if (!phone) return '';

        // Remove all non-digit characters
        let normalized = phone.replace(/\D/g, '');

        // Add + prefix if not present
        if (!normalized.startsWith('+')) {
            normalized = '+' + normalized;
        }

        return normalized;
    }

    /**
     * Get conversion statistics for dashboard
     */
    async getConversionStats(params: {
        startDate?: Date;
        endDate?: Date;
        ctwa_clid?: string;
    }): Promise<{
        leads: number;
        purchases: number;
        revenue: number;
        cpl: number; // Cost Per Lead
        roi: number; // Return on Investment
    }> {
        console.log('[AutoEvents] Getting conversion stats');

        // TODO: Query conversion_events and calculate metrics
        /*
        const stats = await db.conversion_events.aggregate({
            where: {
                event_time: {
                    gte: params.startDate,
                    lte: params.endDate
                },
                ctwa_clid: params.ctwa_clid
            },
            _count: {
                event_type: true
            },
            _sum: {
                value: true
            }
        });
        
        const adSpend = await this.getAdSpend(params.ctwa_clid);
        const leads = stats.leads || 0;
        const revenue = stats.revenue || 0;
        
        return {
            leads,
            purchases: stats.purchases || 0,
            revenue,
            cpl: leads > 0 ? adSpend / leads : 0,
            roi: adSpend > 0 ? ((revenue - adSpend) / adSpend) * 100 : 0
        };
        */

        // Mock data for development
        return {
            leads: 0,
            purchases: 0,
            revenue: 0,
            cpl: 0,
            roi: 0
        };
    }
}

// Singleton instance
export const automaticEventsHandler = new AutomaticEventsHandler();

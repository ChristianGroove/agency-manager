/**
 * WhatsApp Calling API Webhook Handler
 * 
 * Handles call events: ringing, accepted, rejected, terminated
 * Manages WebRTC signaling and real-time state updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { callingSignalingHandler } from '@/modules/infrastructure/meta/services/calling/calling-signaling-handler';
import { callPermissionManager } from '@/modules/infrastructure/meta/services/calling/call-permission-manager';
import { callHoursManager } from '@/modules/infrastructure/meta/services/calling/call-hours-manager';
import { isProductionRuntime, requireMetaWebhookSignature, requireProductionInternalAccess } from '@/app/api/_guards/request-guards';

/**
 * Call event types from Meta
 */
enum CallEventType {
    RINGING = 'ringing',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    TERMINATED = 'terminated',
    MISSED = 'missed'
}

/**
 * Call state tracker
 */
interface CallState {
    callId: string;
    from: string;
    to: string;
    status: CallEventType;
    startedAt: Date;
    answeredAt?: Date;
    endedAt?: Date;
    duration?: number;
    sdpOffer?: string;
    sdpAnswer?: string;
}

const activeCallStates = new Map<string, CallState>();

function logCallingWebhookError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error);
        return;
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error });
}

/**
 * Webhook endpoint for calling events
 */
export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signatureError = requireMetaWebhookSignature(req, rawBody);
        if (signatureError) return signatureError;

        let body: any;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        console.log('[Calling Webhook] Received event');

        // Step 2: Process webhook events
        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                // Handle calls field
                if (change.field === 'calls') {
                    await handleCallEvent(change.value);
                }

                // Handle account_settings_update field (Meta 2026)
                if (change.field === 'account_settings_update') {
                    await handleAccountSettingsUpdate(change.value);
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        logCallingWebhookError('[Calling Webhook] Error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

/**
 * Handle call event
 */
async function handleCallEvent(callData: any) {
    const { call_id, event_type, from, to, sdp_offer } = callData;

    console.log(`[Calling] Event: ${event_type} for call ${call_id}`);

    switch (event_type) {
        case CallEventType.RINGING:
            await handleRinging({ call_id, from, to, sdp_offer });
            break;

        case CallEventType.ACCEPTED:
            await handleAccepted({ call_id });
            break;

        case CallEventType.REJECTED:
            await handleRejected({ call_id });
            break;

        case CallEventType.TERMINATED:
            await handleTerminated({ call_id });
            break;

        case CallEventType.MISSED:
            await handleMissed({ call_id });
            break;

        default:
            console.warn('[Calling] Unknown event type:', event_type);
    }
}

/**
 * Handle RINGING state
 */
async function handleRinging(params: {
    call_id: string;
    from: string;
    to: string;
    sdp_offer: string;
}) {
    const { call_id, from, to, sdp_offer } = params;

    console.log('[Calling] Call ringing:', call_id);

    // Check call hours
    const hoursCheck = callHoursManager.isWithinCallHours();

    if (!hoursCheck.available) {
        console.log('[Calling] Outside business hours');

        // Handle out of hours
        await callHoursManager.handleOutOfHours({
            callId: call_id,
            fromPhoneNumber: from
        });

        // Reject call
        await rejectCall(call_id, 'outside_business_hours');
        return;
    }

    // Process SDP Offer and generate Answer
    try {
        const { sdpAnswer, callSetup } = await callingSignalingHandler.processOffer({
            callId: call_id,
            fromPhoneNumber: from,
            sdpOffer: sdp_offer
        });

        // Send SDP Answer to Meta
        await sendSDPAnswer(call_id, sdpAnswer);

        // Track call state
        const callState: CallState = {
            callId: call_id,
            from,
            to,
            status: CallEventType.RINGING,
            startedAt: new Date(),
            sdpOffer: sdp_offer,
            sdpAnswer
        };

        activeCallStates.set(call_id, callState);

        console.log('[Calling] ✅ SDP Answer sent, waiting for acceptance');

    } catch (error: any) {
        console.error('[Calling] Failed to process SDP:', error);
        await rejectCall(call_id, 'sdp_processing_failed');
    }
}

/**
 * Handle ACCEPTED state
 */
async function handleAccepted(params: { call_id: string }) {
    const { call_id } = params;

    const callState = activeCallStates.get(call_id);
    if (!callState) {
        console.warn('[Calling] Call state not found:', call_id);
        return;
    }

    callState.status = CallEventType.ACCEPTED;
    callState.answeredAt = new Date();

    console.log('[Calling] ✅ Call accepted:', call_id);

    // TODO: Update UI in real-time (via WebSocket/SSE)
    // await notifyAgentUI({ callId: call_id, status: 'connected' });

    // Reset permission limits after successful connection (Meta 2026)
    const userId = getUserIdFromPhone(callState.from);
    if (userId) {
        await callPermissionManager.resetLimitsAfterCall(userId);
        console.log('[Calling] Permission limits reset for user');
    }
}

/**
 * Handle REJECTED state
 */
async function handleRejected(params: { call_id: string }) {
    const { call_id } = params;

    const callState = activeCallStates.get(call_id);
    if (callState) {
        callState.status = CallEventType.REJECTED;
        callState.endedAt = new Date();
    }

    console.log('[Calling] Call rejected:', call_id);

    // Cleanup
    cleanupCall(call_id);
}

/**
 * Handle TERMINATED state
 */
async function handleTerminated(params: { call_id: string }) {
    const { call_id } = params;

    const callState = activeCallStates.get(call_id);
    if (callState) {
        callState.status = CallEventType.TERMINATED;
        callState.endedAt = new Date();

        if (callState.answeredAt) {
            callState.duration = Math.floor(
                (callState.endedAt.getTime() - callState.answeredAt.getTime()) / 1000
            );
        }

        console.log('[Calling] Call terminated:', {
            callId: call_id,
            duration: callState.duration ? `${callState.duration}s` : 'N/A'
        });
    }

    // Cleanup
    cleanupCall(call_id);

    // TODO: Store call record in database
}

/**
 * Handle MISSED state
 */
async function handleMissed(params: { call_id: string }) {
    const { call_id } = params;

    console.log('[Calling] Call missed:', call_id);

    // TODO: Send missed call notification
    // TODO: Offer callback option

    cleanupCall(call_id);
}

/**
 * Handle account settings update (Meta 2026 requirement)
 */
async function handleAccountSettingsUpdate(data: any) {
    console.log('[Calling] Account settings updated:', data);

    // Track changes in call icon visibility, calling status, etc.
    if (data.call_icon_visibility !== undefined) {
        console.log('[Calling] Call icon visibility changed:', data.call_icon_visibility);
    }

    if (data.status !== undefined) {
        console.log('[Calling] Calling API status changed:', data.status);
    }
}

/**
 * Send SDP Answer to Meta
 */
async function sendSDPAnswer(callId: string, sdpAnswer: string): Promise<void> {
    const META_API_VERSION = 'v24.0';
    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

    if (!ACCESS_TOKEN) {
        throw new Error('META_ACCESS_TOKEN not configured');
    }

    const response = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${callId}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sdp_answer: sdpAnswer
            })
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to send SDP Answer: ${JSON.stringify(error)}`);
    }

    console.log('[Calling] SDP Answer sent to Meta');
}

/**
 * Reject call
 */
async function rejectCall(callId: string, reason: string): Promise<void> {
    const META_API_VERSION = 'v24.0';
    const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

    await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${callId}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'reject',
                reason
            })
        }
    );

    console.log('[Calling] Call rejected:', reason);
}

/**
 * Cleanup call resources
 */
function cleanupCall(callId: string) {
    const callState = activeCallStates.get(callId);

    if (callState && callState.sdpAnswer) {
        // Release RTP port
        // Extract port from SDP (simplified)
        const portMatch = callState.sdpAnswer.match(/m=audio (\d+)/);
        if (portMatch) {
            const port = parseInt(portMatch[1]);
            callingSignalingHandler.releaseRTPPort(port);
        }
    }

    activeCallStates.delete(callId);
    console.log('[Calling] Call cleaned up:', callId);
}

/**
 * Helper: Get user ID from phone number
 */
function getUserIdFromPhone(phoneNumber: string): string | null {
    // TODO: Implement actual user lookup
    return `user_${phoneNumber.replace(/[^0-9]/g, '')}`;
}

/**
 * Get active calls statistics
 */
export async function GET(req: NextRequest) {
    const blocked = requireProductionInternalAccess(req);
    if (blocked) return blocked;

    const capacity = callingSignalingHandler.getAvailableCapacity();
    const activeCalls = Array.from(activeCallStates.values());

    return NextResponse.json({
        capacity,
        active_calls: activeCalls.length,
        calls: activeCalls.map(call => ({
            call_id: call.callId,
            from: call.from,
            to: call.to,
            status: call.status,
            duration: call.duration,
            started_at: call.startedAt
        }))
    });
}

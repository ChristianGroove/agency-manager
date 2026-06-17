/**
 * WhatsApp Flows Data Exchange Endpoint
 * 
 * Handles dynamic data requests from Flows with encryption and demo mode.
 * API: POST /api/whatsapp/flows
 */

import { NextRequest, NextResponse } from 'next/server';
import { flowsCrypto } from '@/modules/infrastructure/meta/services/flows/flows-crypto';
import { isProductionRuntime, requireMetaWebhookSignature } from '@/app/api/_guards/request-guards';

/**
 * Demo mode flag for screencasts (Fase 6)
 */
const IS_DEMO_MODE = process.env.FLOWS_DEMO_MODE === 'true';

/**
 * Mock data for CalendarPicker (demo/screencast)
 */
const DEMO_TIME_SLOTS: Record<string, Array<{ id: string; title: string }>> = {
    '2026-01-23': [
        { id: '09:00', title: '9:00 AM' },
        { id: '10:00', title: '10:00 AM' },
        { id: '14:00', title: '2:00 PM' },
        { id: '15:00', title: '3:00 PM' }
    ],
    '2026-01-24': [
        { id: '09:00', title: '9:00 AM' },
        { id: '11:00', title: '11:00 AM' },
        { id: '15:00', title: '3:00 PM' },
        { id: '16:00', title: '4:00 PM' }
    ],
    '2026-01-25': [
        { id: '10:00', title: '10:00 AM' },
        { id: '11:00', title: '11:00 AM' },
        { id: '14:00', title: '2:00 PM' },
        { id: '16:00', title: '4:00 PM' }
    ],
    '2026-01-26': [
        { id: '09:00', title: '9:00 AM' },
        { id: '13:00', title: '1:00 PM' },
        { id: '14:00', title: '2:00 PM' }
    ]
};

function sanitizeFlowLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'category',
        'consentType',
        'date',
        'description',
        'selectedDate',
        'ticketId',
        'urgency',
        'userEmail',
    ]);

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)];
            }

            return [key, value];
        })
    );
}

function summarizeFlowError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name };
    }

    if (error && typeof error === 'object') {
        return {
            type: 'object',
            code: (error as { code?: unknown }).code,
            hasMessage: typeof (error as { message?: unknown }).message === 'string',
        };
    }

    return { type: typeof error };
}

function logFlowInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isProductionRuntime()) {
        if (Object.keys(details).length > 0) console.log(label, details);
        else console.log(label);
        return;
    }

    if (Object.keys(details).length > 0) {
        console.log(label, sanitizeFlowLogDetails(details));
        return;
    }

    console.log(label);
}

function logFlowError(error: unknown, details: Record<string, unknown> = {}) {
    if (!isProductionRuntime()) {
        if (Object.keys(details).length > 0) console.error('[Flows Endpoint] Error:', error, details);
        else console.error('[Flows Endpoint] Error:', error);
        return;
    }

    console.error('[Flows Endpoint] Error:', {
        ...sanitizeFlowLogDetails(details),
        detail: summarizeFlowError(error),
    });
}

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

        logFlowInfo('[Flows Endpoint] Received request');

        logFlowInfo('[Flows Endpoint] Signature validated');

        // Step 2: Decrypt request
        const aesKey = flowsCrypto.extractAESKey(body.encrypted_aes_key);
        const iv = Buffer.from(body.initial_vector, 'base64');

        const decrypted = flowsCrypto.decryptRequest({
            encrypted_flow_data: body.encrypted_flow_data,
            encrypted_aes_key: body.encrypted_aes_key,
            initial_vector: body.initial_vector
        });

        logFlowInfo('[Flows Endpoint] Decrypted data:', {
            version: decrypted.version,
            screen: decrypted.screen,
            action: decrypted.action_payload?.action
        });

        // Step 3: Process action
        const actionPayload = decrypted.action_payload || {};
        const action = actionPayload.action;

        let responseData: any = {
            version: decrypted.version,
            screen: decrypted.screen,
            data: {}
        };

        // Handle different actions
        if (action === 'get_time_slots') {
            const selectedDate = actionPayload.selected_date;
            responseData.data = await getTimeSlots(selectedDate);
        }
        else if (action === 'log_consent') {
            await logConsent(actionPayload);
            responseData.data = { consent_logged: true };
        }
        else if (action === 'create_ticket') {
            const ticketId = await createSupportTicket(actionPayload);
            responseData.data = { ticket_id: ticketId };
        }

        // Step 4: Encrypt response
        const encryptedResponse = flowsCrypto.encryptResponse(
            responseData,
            aesKey,
            iv
        );

        logFlowInfo('[Flows Endpoint] Sending encrypted response');

        return NextResponse.json({
            version: '3.0',
            data: responseData.data,
            encrypted_data: encryptedResponse
        });

    } catch (error: any) {
        logFlowError(error);

        return NextResponse.json(
            {
                error: 'Data exchange failed'
            },
            { status: 500 }
        );
    }
}

/**
 * Get available time slots for a date
 * Ensures YYYY-MM-DD format as required by CalendarPicker
 */
async function getTimeSlots(date: string): Promise<{
    time_slots: Array<{ id: string; title: string }>;
}> {
    logFlowInfo('[Flows] Getting time slots', { date });

    // Validate YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        logFlowError(new Error('invalid_date_format'), { date });
        return { time_slots: [] };
    }

    // Demo mode: return mock data
    if (IS_DEMO_MODE) {
        // Mock logic: 
        // If date is weekend, return fewer slots
        // If date is past, return empty
        const day = new Date(date).getDay();
        if (day === 0 || day === 6) { // Weekend
            return {
                time_slots: [
                    { id: '10:00', title: '10:00 AM (Weekend)' },
                    { id: '11:00', title: '11:00 AM (Weekend)' }
                ]
            };
        }

        const slots = DEMO_TIME_SLOTS[date] || [
            { id: '09:00', title: '09:00 AM' },
            { id: '10:00', title: '10:00 AM' },
            { id: '11:00', title: '11:00 AM' },
            { id: '14:00', title: '02:00 PM' },
            { id: '15:00', title: '03:00 PM' },
            { id: '16:00', title: '04:00 PM' }
        ];
        return { time_slots: slots };
    }

    // Production: Query real availability from database
    // TODO: Implement real database query
    // const slots = await db.query(...)

    return {
        time_slots: [
            { id: '09:00', title: '09:00 AM' },
            { id: '15:00', title: '03:00 PM' }
        ]
    };
}

/**
 * Log user consent (GDPR/Meta 2026 compliance)
 */
async function logConsent(payload: any): Promise<void> {
    logFlowInfo('[Flows] Logging consent request:', {
        consentType: payload?.consent_type,
        userEmail: payload?.user_email
    });

    // TODO: Store consent in database
    // await db.consents.create({
    //   user_email: payload.user_email,
    //   consent_type: payload.consent_type,
    //   granted: true,
    //   timestamp: new Date()
    // });

    // For now, just log
    logFlowInfo('[Flows] Consent logged (placeholder)');
}

/**
 * Create support ticket
 */
async function createSupportTicket(payload: any): Promise<string> {
    logFlowInfo('[Flows] Creating support ticket:', {
        category: payload?.category,
        urgency: payload?.urgency,
        description: payload?.description
    });

    // Generate ticket ID
    const ticketId = `TICKET-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // TODO: Store ticket in database
    // await db.tickets.create({
    //   ticket_id: ticketId,
    //   category: payload.category,
    //   description: payload.description,
    //   urgency: payload.urgency,
    //   created_at: new Date()
    // });

    logFlowInfo('[Flows] Ticket created', { ticketId });

    return ticketId;
}

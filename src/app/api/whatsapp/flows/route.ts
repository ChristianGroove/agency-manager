/**
 * WhatsApp Flows Data Exchange Endpoint
 * 
 * Handles dynamic data requests from Flows with encryption and demo mode.
 * API: POST /api/whatsapp/flows
 */

import { NextRequest, NextResponse } from 'next/server';
import { flowsCrypto } from '@/lib/meta/flows/flows-crypto';

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

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const body = JSON.parse(rawBody);

        console.log('[Flows Endpoint] Received request');

        // Step 1: Validate signature (CRITICAL for App Review)
        const signature = req.headers.get('x-hub-signature-256');

        if (!signature) {
            console.error('[Flows Endpoint] Missing signature header');
            return NextResponse.json(
                { error: 'Missing signature' },
                { status: 401 }
            );
        }

        const isValid = flowsCrypto.validateSignature(rawBody, signature);

        if (!isValid) {
            console.error('[Flows Endpoint] Invalid signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 403 }
            );
        }

        console.log('[Flows Endpoint] ✅ Signature validated');

        // Step 2: Decrypt request
        const aesKey = flowsCrypto.extractAESKey(body.encrypted_aes_key);
        const iv = Buffer.from(body.initial_vector, 'base64');

        const decrypted = flowsCrypto.decryptRequest({
            encrypted_flow_data: body.encrypted_flow_data,
            encrypted_aes_key: body.encrypted_aes_key,
            initial_vector: body.initial_vector
        });

        console.log('[Flows Endpoint] Decrypted data:', {
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

        console.log('[Flows Endpoint] ✅ Sending encrypted response');

        return NextResponse.json({
            version: '3.0',
            data: responseData.data,
            encrypted_data: encryptedResponse
        });

    } catch (error: any) {
        console.error('[Flows Endpoint] Error:', error);

        return NextResponse.json(
            {
                error: 'Data exchange failed',
                message: error.message
            },
            { status: 500 }
        );
    }
}

/**
 * Get available time slots for a date
 */
async function getTimeSlots(date: string): Promise<{
    time_slots: Array<{ id: string; title: string }>;
}> {
    console.log(`[Flows] Getting time slots for ${date}`);

    // Demo mode: return mock data
    if (IS_DEMO_MODE) {
        const slots = DEMO_TIME_SLOTS[date] || DEMO_TIME_SLOTS['2026-01-23'];
        return { time_slots: slots };
    }

    // Production: Query real availability from database
    // TODO: Implement real database query
    // const slots = await db.query(...)

    // For now, return demo data
    const slots = DEMO_TIME_SLOTS[date] || [
        { id: '09:00', title: '9:00 AM' },
        { id: '14:00', title: '2:00 PM' }
    ];

    return { time_slots: slots };
}

/**
 * Log user consent (GDPR/Meta 2026 compliance)
 */
async function logConsent(payload: any): Promise<void> {
    console.log('[Flows] Logging consent:', payload);

    // TODO: Store consent in database
    // await db.consents.create({
    //   user_email: payload.user_email,
    //   consent_type: payload.consent_type,
    //   granted: true,
    //   timestamp: new Date()
    // });

    // For now, just log
    console.log('[Flows] ✅ Consent logged (placeholder)');
}

/**
 * Create support ticket
 */
async function createSupportTicket(payload: any): Promise<string> {
    console.log('[Flows] Creating support ticket:', payload);

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

    console.log(`[Flows] ✅ Ticket created: ${ticketId}`);

    return ticketId;
}

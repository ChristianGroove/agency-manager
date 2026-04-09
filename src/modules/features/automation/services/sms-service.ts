'use server';

/**
 * SMS Service - Twilio Integration
 * 
 * This service handles sending SMS messages using the Twilio API.
 * Environment variables required:
 * - TWILIO_ACCOUNT_SID: Your Twilio account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio auth token
 * - TWILIO_PHONE_NUMBER: Your Twilio phone number (sender)
 */

interface SendSMSParams {
    to: string;
    body: string;
    from?: string;
}

interface SendSMSResult {
    success: boolean;
    messageId?: string;
    status?: string;
    error?: string;
}

export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const defaultFrom = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken) {
        console.error('[SMSService] Twilio credentials not configured');
        return {
            success: false,
            error: 'SMS service not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.'
        };
    }

    if (!defaultFrom && !params.from) {
        console.error('[SMSService] Twilio phone number not configured');
        return {
            success: false,
            error: 'SMS sender not configured. Please set TWILIO_PHONE_NUMBER environment variable.'
        };
    }

    const fromNumber = params.from || defaultFrom!;

    try {
        // Format phone number (ensure E.164 format)
        const toNumber = formatPhoneNumber(params.to);

        if (!toNumber) {
            return {
                success: false,
                error: 'Invalid phone number format. Please use E.164 format (e.g., +1234567890)'
            };
        }

        console.log('[SMSService] Sending SMS:', {
            to: toNumber,
            from: fromNumber,
            bodyLength: params.body.length
        });

        // Twilio API URL
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

        // Create form data
        const formData = new URLSearchParams();
        formData.append('To', toNumber);
        formData.append('From', fromNumber);
        formData.append('Body', params.body);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[SMSService] Twilio API error:', data);
            return {
                success: false,
                error: data.message || `HTTP ${response.status}: ${response.statusText}`
            };
        }

        console.log('[SMSService] SMS sent successfully:', data.sid);

        return {
            success: true,
            messageId: data.sid,
            status: data.status
        };
    } catch (error) {
        console.error('[SMSService] Failed to send SMS:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error sending SMS'
        };
    }
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string | null {
    // Allow template variables like {{lead.phone}}
    if (phone.includes('{{') && phone.includes('}}')) {
        return phone;
    }

    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with +, keep it
    if (cleaned.startsWith('+')) {
        // Validate length (E.164 max 15 digits)
        if (cleaned.length >= 8 && cleaned.length <= 16) {
            return cleaned;
        }
    }

    // If it's a local number (10 digits for US), add +1
    if (cleaned.length === 10 && !cleaned.startsWith('+')) {
        return `+1${cleaned}`;
    }

    // If it's 11 digits starting with 1 (US), add +
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    }

    // Return null if invalid
    return null;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
    // Allow template variables
    if (phone.includes('{{') && phone.includes('}}')) {
        return true;
    }
    return formatPhoneNumber(phone) !== null;
}

/**
 * Get SMS character count info
 * Standard SMS is 160 chars, but special characters reduce this
 */
export function getSMSInfo(body: string): { segments: number; charsPerSegment: number; totalChars: number } {
    const totalChars = body.length;

    // Check if message contains non-GSM characters
    const hasUnicode = /[^\x00-\x7F]/.test(body);

    const charsPerSegment = hasUnicode ? 70 : 160;
    const segments = Math.ceil(totalChars / charsPerSegment);

    return { segments, charsPerSegment, totalChars };
}

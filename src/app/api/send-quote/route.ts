import { NextResponse } from 'next/server';
import { getQuoteEmailHtml } from '@/modules/infrastructure/notifications/services/email-templates';
import { EmailService } from '@/modules/features/notifications/email.service';

import { getEffectiveBranding } from '@/modules/core/branding/actions';
import { createClient } from '@/modules/core/database/supabase-server';
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions';
import { isProductionRuntime } from '@/app/api/_guards/request-guards';

const MAX_QUOTE_PDF_BYTES = 10 * 1024 * 1024;
const PUBLIC_SEND_QUOTE_ERROR = 'Error sending email';
const PUBLIC_SEND_QUOTE_INTERNAL_ERROR = 'Internal Server Error';

function logSendQuoteError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error);
        return;
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error });
}

function sendQuoteErrorMessage(error: unknown, fallback: string) {
    if (isProductionRuntime()) {
        return fallback;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message;
    }

    return fallback;
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { email, quoteNumber, clientName, total, date, pdfBase64, organizationId } = await request.json();

        if (!email || !quoteNumber || !pdfBase64 || !organizationId) {
            return NextResponse.json(
                { error: 'Missing required fields (email, quoteNumber, pdfBase64, organizationId)' },
                { status: 400 }
            );
        }

        const currentOrgId = await getCurrentOrganizationId();
        if (!currentOrgId || currentOrgId !== organizationId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get effective branding
        const brandingData = await getEffectiveBranding(organizationId);

        // Map to EmailBranding interface
        const emailBranding = {
            agency_name: brandingData.name,
            primary_color: brandingData.colors.primary,
            secondary_color: brandingData.colors.secondary,
            logo_url: brandingData.logos.main || undefined,
            website_url: brandingData.website || 'https://www.pixy.com.co',
            footer_text: `© ${new Date().getFullYear()} ${brandingData.name}. Todos los derechos reservados.`
        };

        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64');
        if (pdfBuffer.byteLength > MAX_QUOTE_PDF_BYTES) {
            return NextResponse.json({ error: 'PDF attachment is too large' }, { status: 413 });
        }

        const linkUrl = brandingData.website || 'https://pixy.com.co'; // Fallback link
        const emailHtml = getQuoteEmailHtml(clientName, quoteNumber, total || '$0', date || 'N/A', linkUrl, emailBranding);

        const result = await EmailService.send({
            to: email,
            subject: `Cotización N° ${quoteNumber} - ${clientName}`,
            html: emailHtml,
            organizationId,
            userId: user.id,
            attachments: [
                {
                    filename: `Cotizacion_${quoteNumber}.pdf`,
                    content: pdfBuffer,
                },
            ],
            tags: [{ name: 'type', value: 'quote' }]
        });

        if (!result.success) {
            logSendQuoteError('Quote email send failed:', result.error);
            return NextResponse.json({ error: sendQuoteErrorMessage(result.error, PUBLIC_SEND_QUOTE_ERROR) }, { status: 500 });
        }

        return NextResponse.json({ data: result.data });
    } catch (error: any) {
        logSendQuoteError('Internal Server Error:', error);
        return NextResponse.json({ error: sendQuoteErrorMessage(error, PUBLIC_SEND_QUOTE_INTERNAL_ERROR) }, { status: 500 });
    }
}

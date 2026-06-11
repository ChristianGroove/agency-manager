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

type QuoteEmailContact = {
    email?: string | null;
    name?: string | null;
};

type QuoteEmailRecord = {
    id: string;
    number: string;
    total: number | string | null;
    date: string | null;
    client?: QuoteEmailContact | null;
    lead?: QuoteEmailContact | null;
};

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

function normalizeEmail(email: unknown) {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function formatQuoteTotal(total: QuoteEmailRecord['total']) {
    const amount = Number(total ?? 0);
    if (!Number.isFinite(amount)) return '$0';

    return `$${amount.toLocaleString('es-CO')}`;
}

function parsePdfBase64(pdfBase64: unknown) {
    if (typeof pdfBase64 !== 'string' || !pdfBase64.startsWith('data:application/pdf;base64,')) {
        return null;
    }

    const encodedPdf = pdfBase64.split(',')[1];
    if (!encodedPdf) return null;

    return Buffer.from(encodedPdf, 'base64');
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { quoteId, email, pdfBase64, organizationId } = await request.json();

        if (!quoteId || !email || !pdfBase64 || !organizationId) {
            return NextResponse.json(
                { error: 'Missing required fields (quoteId, email, pdfBase64, organizationId)' },
                { status: 400 }
            );
        }

        const currentOrgId = await getCurrentOrganizationId();
        if (!currentOrgId || currentOrgId !== organizationId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data: quoteData, error: quoteError } = await supabase
            .from('quotes')
            .select('id, number, total, date, client:leads!client_id(name, email), lead:leads!lead_id(name, email)')
            .eq('id', quoteId)
            .eq('organization_id', organizationId)
            .is('deleted_at', null)
            .single();

        if (quoteError || !quoteData) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        const quote = quoteData as QuoteEmailRecord;
        const quoteContact = quote.client || quote.lead;
        const recipientEmail = normalizeEmail(quoteContact?.email);

        if (!recipientEmail) {
            return NextResponse.json({ error: 'Quote recipient email unavailable' }, { status: 400 });
        }

        if (normalizeEmail(email) !== recipientEmail) {
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
        const pdfBuffer = parsePdfBase64(pdfBase64);
        if (!pdfBuffer) {
            return NextResponse.json({ error: 'Invalid PDF attachment' }, { status: 400 });
        }

        if (pdfBuffer.byteLength > MAX_QUOTE_PDF_BYTES) {
            return NextResponse.json({ error: 'PDF attachment is too large' }, { status: 413 });
        }

        const linkUrl = brandingData.website || 'https://pixy.com.co'; // Fallback link
        const quoteNumber = quote.number;
        const clientName = quoteContact?.name || 'Cliente';
        const total = formatQuoteTotal(quote.total);
        const date = quote.date || 'N/A';
        const emailHtml = getQuoteEmailHtml(clientName, quoteNumber, total, date, linkUrl, emailBranding);

        const result = await EmailService.send({
            to: recipientEmail,
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

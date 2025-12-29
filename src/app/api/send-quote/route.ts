import { NextResponse } from 'next/server';
import { getQuoteEmailHtml } from '@/lib/email-templates';
import { EmailService } from '@/modules/core/notifications/email.service';

export async function POST(request: Request) {
    try {
        const { email, quoteNumber, clientName, total, date, pdfBase64, organizationId } = await request.json();

        if (!email || !quoteNumber || !pdfBase64 || !organizationId) {
            return NextResponse.json(
                { error: 'Missing required fields (email, quoteNumber, pdfBase64, organizationId)' },
                { status: 400 }
            );
        }

        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64');
        const emailHtml = getQuoteEmailHtml(clientName, quoteNumber, total || '$0', date || 'N/A');

        const result = await EmailService.send({
            to: email,
            subject: `Cotización N° ${quoteNumber} - ${clientName}`,
            html: emailHtml,
            organizationId,
            attachments: [
                {
                    filename: `Cotizacion_${quoteNumber}.pdf`,
                    content: pdfBuffer,
                },
            ],
            tags: [{ name: 'type', value: 'quote' }]
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error?.message || 'Error sending email' }, { status: 500 });
        }

        return NextResponse.json({ data: result.data });
    } catch (error: any) {
        console.error('Internal Server Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

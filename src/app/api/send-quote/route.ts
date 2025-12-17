import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getQuoteEmailHtml } from '@/lib/email-templates';

export async function POST(request: Request) {
    try {
        const apiKey = process.env.RESEND_API_KEY;

        if (!apiKey) {
            console.error('RESEND_API_KEY is missing');
            return NextResponse.json(
                { error: 'Server configuration error: Missing RESEND_API_KEY' },
                { status: 500 }
            );
        }

        const resend = new Resend(apiKey);
        const { email, quoteNumber, clientName, total, date, pdfBase64 } = await request.json();

        if (!email || !quoteNumber || !pdfBase64) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64');
        const emailHtml = getQuoteEmailHtml(clientName, quoteNumber, total || '$0', date || 'N/A');

        const { data, error } = await resend.emails.send({
            from: 'Pixy <cotizaciones@billing.pixy.com.co>',
            to: [email],
            subject: `Cotización N° ${quoteNumber} - ${clientName}`,
            html: emailHtml,
            attachments: [
                {
                    filename: `Cotizacion_${quoteNumber}.pdf`,
                    content: pdfBuffer,
                },
            ],
        });

        if (error) {
            console.error('Resend API Error:', error);
            return NextResponse.json({ error: error.message || 'Error sending email', details: error }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('Internal Server Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getInvoiceEmailHtml } from '@/lib/email-templates';

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
        const { email, invoiceNumber, clientName, amount, dueDate, concept, pdfBase64 } = await request.json();

        if (!email || !invoiceNumber || !pdfBase64) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64');
        const emailHtml = getInvoiceEmailHtml(clientName, invoiceNumber, amount || '$0', dueDate || 'N/A', concept || 'Servicios Profesionales');

        const { data, error } = await resend.emails.send({
            from: 'Pixy <facturacion@billing.pixy.com.co>',
            to: [email],
            subject: `Cuenta de Cobro N° ${invoiceNumber} - ${clientName}`,
            html: emailHtml,
            attachments: [
                {
                    filename: `Cuenta_Cobro_${invoiceNumber}.pdf`,
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

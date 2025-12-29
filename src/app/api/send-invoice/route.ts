import { NextResponse } from 'next/server';
import { getInvoiceEmailHtml } from '@/lib/email-templates';
import { EmailService } from '@/modules/core/notifications/email.service';

export async function POST(request: Request) {
    try {
        const { email, invoiceNumber, clientName, amount, dueDate, concept, pdfBase64, organizationId } = await request.json();

        if (!email || !invoiceNumber || !pdfBase64 || !organizationId) {
            return NextResponse.json(
                { error: 'Missing required fields (email, invoiceNumber, pdfBase64, organizationId)' },
                { status: 400 }
            );
        }

        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64');
        const emailHtml = getInvoiceEmailHtml(clientName, invoiceNumber, amount || '$0', dueDate || 'N/A', concept || 'Servicios Profesionales');

        const result = await EmailService.send({
            to: email,
            subject: `Cuenta de Cobro N° ${invoiceNumber} - ${clientName}`,
            html: emailHtml,
            organizationId,
            attachments: [
                {
                    filename: `Cuenta_Cobro_${invoiceNumber}.pdf`,
                    content: pdfBuffer,
                },
            ],
            tags: [{ name: 'type', value: 'invoice' }]
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

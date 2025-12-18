
export const getInvoiceEmailHtml = (clientName: string, invoiceNumber: string, amount: string, dueDate: string, concept: string) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva Factura de Pixy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Logo/Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #111827; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">¡TOC, TOC!</h1>
        </div>

        <!-- Main Card -->
        <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <!-- Greeting -->
            <h2 style="color: #111827; margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 600;">Hola, ${clientName}</h2>
            
            <p style="color: #374151; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
                Adjunto encontrarás tu factura <strong>#${invoiceNumber}</strong> por concepto de <strong>${concept}</strong>.
            </p>

            <!-- Invoice Details Box -->
            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding-bottom: 8px; color: #6b7280; font-size: 14px;">Total a Pagar</td>
                        <td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; text-align: right;">Vencimiento</td>
                    </tr>
                    <tr>
                        <td style="color: #111827; font-size: 24px; font-weight: 700;">${amount}</td>
                        <td style="color: #111827; font-size: 16px; font-weight: 600; text-align: right;">${dueDate}</td>
                    </tr>
                </table>
            </div>

            <p style="color: #374151; font-size: 16px; line-height: 24px; margin-bottom: 30px;">
                Agradecemos tu confianza en nuestros servicios. Si tienes alguna pregunta sobre esta factura, no dudes en responder a este correo.
            </p>

            <div style="text-align: center;">
                <a href="https://pay.pixy.com.co" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px;">Métodos de pago</a>
                <div style="margin-top: 12px;">
                    <a href="https://www.pixy.com.co" style="color: #9ca3af; font-size: 12px; text-decoration: none;">www.pixy.com.co</a>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 30px;">
            <!-- Confidentiality -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Confidencialidad y Protección de Datos</h3>
                <p style="color: #9ca3af; font-size: 11px; line-height: 16px; margin: 0;">
                    Este mensaje y sus adjuntos son confidenciales y pueden contener información privilegiada. Si no es el destinatario previsto, está prohibida su difusión. Si lo recibió por error, por favor notifíquenos y elimínelo.
                </p>
            </div>

            <!-- Data Protection -->
            <div>
                <h3 style="color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Protección de Información</h3>
                <p style="color: #9ca3af; font-size: 11px; line-height: 16px; margin: 0;">
                    En <strong>Pixy PDS</strong>, valoramos su privacidad. Tratamos la información con estricta confidencialidad y conforme a normativas internacionales. Para más información sobre nuestras prácticas, puede responder a este correo.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <p style="color: #d1d5db; font-size: 12px;">&copy; 2026 Pixy PDS. Todos los derechos reservados.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `
}

export const getQuoteEmailHtml = (clientName: string, quoteNumber: string, total: string, date: string) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva Cotización de Pixy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Logo/Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #111827; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">¡HOLA!</h1>
        </div>

        <!-- Main Card -->
        <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <!-- Greeting -->
            <h2 style="color: #111827; margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 600;">Hola, ${clientName}</h2>
            
            <p style="color: #374151; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
                Adjunto encontrarás la cotización <strong>#${quoteNumber}</strong> que hemos preparado para ti.
            </p>

            <!-- Quote Details Box -->
            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding-bottom: 8px; color: #6b7280; font-size: 14px;">Total Estimado</td>
                        <td style="padding-bottom: 8px; color: #6b7280; font-size: 14px; text-align: right;">Fecha</td>
                    </tr>
                    <tr>
                        <td style="color: #111827; font-size: 24px; font-weight: 700;">${total}</td>
                        <td style="color: #111827; font-size: 16px; font-weight: 600; text-align: right;">${date}</td>
                    </tr>
                </table>
            </div>

            <p style="color: #374151; font-size: 16px; line-height: 24px; margin-bottom: 30px;">
                Esta propuesta tiene una validez de 15 días. Si tienes alguna duda o deseas ajustar algún detalle, estamos atentos a tus comentarios.
            </p>

            <div style="text-align: center;">
                <div style="margin-top: 12px;">
                    <a href="https://www.pixy.com.co" style="color: #9ca3af; font-size: 12px; text-decoration: none;">www.pixy.com.co</a>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 30px;">
            <!-- Confidentiality -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Confidencialidad y Protección de Datos</h3>
                <p style="color: #9ca3af; font-size: 11px; line-height: 16px; margin: 0;">
                    Este mensaje y sus adjuntos son confidenciales y pueden contener información privilegiada. Si no es el destinatario previsto, está prohibida su difusión. Si lo recibió por error, por favor notifíquenos y elimínelo.
                </p>
            </div>

            <!-- Data Protection -->
            <div>
                <h3 style="color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Protección de Información</h3>
                <p style="color: #9ca3af; font-size: 11px; line-height: 16px; margin: 0;">
                    En <strong>Pixy PDS</strong>, valoramos su privacidad. Tratamos la información con estricta confidencialidad y conforme a normativas internacionales. Para más información sobre nuestras prácticas, puede responder a este correo.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <p style="color: #d1d5db; font-size: 12px;">&copy; 2026 Pixy PDS. Todos los derechos reservados.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `
}

export const getBriefingSubmissionEmailHtml = (clientName: string, templateName: string, briefingLink: string) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nuevo Briefing Recibido</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Logo/Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #111827; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -1px;">NUEVO BRIEFING</h1>
        </div>

        <!-- Main Card -->
        <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <!-- Greeting -->
            <h2 style="color: #111827; margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 600;">¡Hola Equipo!</h2>
            
            <p style="color: #374151; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
                El cliente <strong>${clientName}</strong> ha completado y enviado el briefing: <strong>${templateName}</strong>.
            </p>

            <!-- Action Button -->
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="${briefingLink}" style="display: inline-block; background-color: #F205E2; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px;">Ver Respuestas</a>
            </div>

            <p style="color: #374151; font-size: 14px; line-height: 20px; margin-bottom: 10px; text-align: center;">
                O copia y pega este enlace:
            </p>
            <p style="color: #6b7280; font-size: 12px; line-height: 16px; margin-bottom: 0; text-align: center; word-break: break-all;">
                <a href="${briefingLink}" style="color: #6b7280;">${briefingLink}</a>
            </p>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; text-align: center;">
            <p style="color: #d1d5db; font-size: 12px;">&copy; ${new Date().getFullYear()} Agency Manager. Notificación automática.</p>
        </div>
    </div>
</body>
</html>
    `
}

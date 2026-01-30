
export type EmailStyle = 'minimal' | 'corporate' | 'bold' | 'neo' | 'swiss'

export interface EmailBranding {
    agency_name: string
    primary_color: string
    secondary_color: string
    logo_url?: string
    website_url?: string
    footer_text?: string
    legal_footer?: string
}

/**
 * Main wrapper that applies the style structure.
 */
function getBaseHtml(title: string, content: string, branding: EmailBranding, style: EmailStyle): string {
    const primary = branding.primary_color || '#000000'
    const secondary = branding.secondary_color || '#666666'

    // Default Footer Logic
    const footerContent = branding.footer_text || `© ${new Date().getFullYear()} ${branding.agency_name}.`
    const legalContent = branding.legal_footer ||
        "Este mensaje y sus archivos adjuntos son confidenciales y están dirigidos exclusivamente a su destinatario. " +
        "Si usted ha recibido este correo por error, por favor notifíquelo inmediatamente y elimínelo de su sistema. " +
        "Consulte nuestra Política de Tratamiento de Datos en nuestro portal."

    let body = ''

    // --- STYLES ---

    if (style === 'minimal') {
        body = `
        <div style="font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 30px;">
                    ${branding.logo_url ? `<img src="${branding.logo_url}" alt="${branding.agency_name}" style="height: 48px; object-fit: contain;">` : `<h2 style="margin: 0; color: ${primary};">${branding.agency_name}</h2>`}
                </div>
                ${content}
                <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                    <p style="margin: 0 0 10px 0;">${footerContent}</p>
                    <p style="margin: 0; font-size: 10px; color: #cbd5e1; line-height: 1.4;">${legalContent}</p>
                </div>
            </div>
        </div>`
    }
    else if (style === 'corporate') {
        body = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb;">
                <div style="background-color: ${primary}; padding: 20px 40px; text-align: left;">
                    ${branding.logo_url ? `<img src="${branding.logo_url}" alt="${branding.agency_name}" style="height: 40px; filter: brightness(0) invert(1);">` : `<h2 style="margin: 0; color: #ffffff;">${branding.agency_name}</h2>`}
                </div>
                <div style="padding: 40px; color: #374151;">
                    ${content}
                </div>
                <div style="background-color: #f9fafb; padding: 20px 40px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
                    <p style="margin-bottom: 8px;">${footerContent}</p>
                    <p style="margin: 0; font-size: 10px; color: #9ca3af;">${legalContent}</p>
                </div>
            </div>
        </div>`
    }
    else if (style === 'bold') {
        body = `
        <div style="font-family: 'Arial Black', sans-serif; background-color: ${primary}; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 0px; box-shadow: 8px 8px 0px rgba(0,0,0,0.2);">
                <div style="padding: 40px 40px 20px 40px; background: #ffffff;">
                     ${branding.logo_url ? `<img src="${branding.logo_url}" alt="${branding.agency_name}" style="height: 60px;">` : `<h1 style="color: ${primary}; font-size: 28px; letter-spacing: -1px;">${branding.agency_name}</h1>`}
                </div>
                <div style="padding: 0 40px 40px 40px; color: #1f2937; font-family: 'Helvetica', sans-serif;">
                    ${content}
                </div>
                 <div style="background: #000000; color: #ffffff; padding: 30px 40px; font-family: 'Helvetica', sans-serif; font-size: 12px;">
                    <p style="margin-bottom: 15px; opacity: 0.8;">${footerContent}</p>
                    <p style="margin: 0; opacity: 0.4; font-size: 10px; line-height: 1.4;">${legalContent}</p>
                </div>
            </div>
        </div>`
    }
    else if (style === 'neo') {
        // Modern SaaS Look: Smooth gradients, rounded corners, "Glass" feel
        body = `
        <div style="font-family: 'Inter', system-ui, sans-serif; background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%); padding: 60px 20px;">
            <div style="max-width: 580px; margin: 0 auto; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 24px; padding: 48px; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 20px 40px -10px rgba(79, 70, 229, 0.1);">
                <div style="text-align: center; margin-bottom: 40px;">
                    ${branding.logo_url ?
                `<img src="${branding.logo_url}" alt="${branding.agency_name}" style="height: 52px; border-radius: 12px;">` :
                `<div style="display:inline-block; padding: 12px 24px; background: ${primary}; color: white; border-radius: 50px; font-weight: bold;">${branding.agency_name}</div>`
            }
                </div>
                <div style="color: #1e293b; font-size: 16px; line-height: 1.7;">
                    ${content}
                </div>
                <div style="margin-top: 50px; padding-top: 30px; border-top: 2px dashed #e2e8f0; text-align: center;">
                    <p style="color: #64748b; font-weight: 500; font-size: 13px; margin-bottom: 12px;">${footerContent}</p>
                    <p style="color: #94a3b8; font-size: 11px; max-width: 400px; margin: 0 auto; line-height: 1.5;">${legalContent}</p>
                </div>
            </div>
        </div>`
    }
    else if (style === 'swiss') {
        // International Style: Grid, Helvetica, High Contrast, Stark sizing
        body = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto;">
                
                <!-- Heavy Top Border -->
                <div style="border-top: 10px solid ${primary}; margin-bottom: 40px;"></div>

                <!-- Header Grid -->
                <div style="display: table; width: 100%; margin-bottom: 60px;">
                    <div style="display: table-cell; vertical-align: top;">
                         ${branding.logo_url ? `<img src="${branding.logo_url}" alt="${branding.agency_name}" style="height: 60px;">` : `<h1 style="font-size: 48px; line-height: 1; letter-spacing: -2px; margin: 0; color: #000;">${branding.agency_name}</h1>`}
                    </div>
                    <div style="display: table-cell; vertical-align: top; text-align: right; width: 150px;">
                        <span style="display: block; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Notificación</span>
                        <span style="display: block; font-size: 12px; color: #666;">${new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                <!-- Content -->
                <div style="font-size: 18px; line-height: 1.5; color: #000; margin-bottom: 80px;">
                    ${content}
                </div>

                <!-- Footer Grid -->
                <div style="border-top: 2px solid #000; padding-top: 20px; display: table; width: 100%;">
                    <div style="display: table-cell; width: 50%; vertical-align: top;">
                        <p style="font-size: 14px; font-weight: bold; margin: 0;">${footerContent}</p>
                    </div>
                    <div style="display: table-cell; width: 50%; vertical-align: top; text-align: right;">
                        <a href="${branding.website_url}" style="color: #000; text-decoration: underline; font-size: 14px;">Visit Website</a>
                    </div>
                </div>
                
                <!-- Legal -->
                <div style="margin-top: 40px; font-size: 11px; color: #888; text-align: justify; line-height: 1.4;">
                    ${legalContent}
                </div>
            </div>
        </div>`
    }

    return `<!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <style> @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'); </style>
    </head>
    <body style="margin:0; padding:0; -webkit-text-size-adjust:100%;">
        ${body}
    </body>
    </html>`
}

// --- GENERATORS -------------------------------------------------------------

export function getInvoiceEmailHtml(clientName: string, invoiceNumber: string, amount: string, dueDate: string, concept: string, branding: EmailBranding, style: EmailStyle = 'minimal'): string {
    const isNeo = style === 'neo';
    const isSwiss = style === 'swiss';

    // Style-specific component styling
    const amountStyle = isSwiss ?
        `font-size: 64px; line-height: 1; font-weight: bold; margin: 20px 0; letter-spacing: -3px;` :
        `font-size: 36px; font-weight: bold; color: ${branding.primary_color}; margin: 10px 0;`;

    const buttonStyle = isSwiss ?
        `display: inline-block; background: #000; color: #fff; padding: 20px 40px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 30px;` :
        `display: inline-block; background: ${branding.primary_color}; color: #ffffff; padding: 16px 32px; border-radius: ${isNeo ? '50px' : '6px'}; text-decoration: none; font-weight: 600; margin-top: 24px; box-shadow: ${isNeo ? '0 10px 20px -5px ' + branding.primary_color + '66' : 'none'};`;

    const content = `
        <p style="margin-bottom: 24px;">Hola <strong>${clientName}</strong>,</p>
        <p style="margin-bottom: 24px;">Adjunto encontrarás tu nueva factura <strong>#${invoiceNumber}</strong>.</p>
        
        <div style="background: ${isSwiss ? '#ffffff' : (isNeo ? 'rgba(255,255,255,0.7)' : '#f8fafc')}; border: ${isSwiss ? '2px solid #000' : 'none'}; padding: ${isSwiss ? '30px' : '24px'}; border-radius: ${isNeo ? '16px' : (isSwiss ? '0' : '8px')}; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 12px; color: ${isSwiss ? '#000' : '#64748b'}; text-transform: uppercase; letter-spacing: 1px;">Total a Pagar</p>
            <h1 style="${amountStyle}">${amount}</h1>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid ${isSwiss ? '#000' : '#e2e8f0'}; display: table; width: 100%;">
                <div style="display: table-cell;">
                    <span style="display: block; font-size: 11px; color: #64748b;">Vencimiento</span>
                    <span style="font-weight: 600; color: #1e293b;">${dueDate}</span>
                </div>
                <div style="display: table-cell;">
                    <span style="display: block; font-size: 11px; color: #64748b;">Concepto</span>
                    <span style="font-weight: 600; color: #1e293b;">${concept}</span>
                </div>
            </div>
        </div>

        <div style="text-align: center;">
            <a href="{{link_url}}" style="${buttonStyle}">
                Pagar Factura
            </a>
            <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">
                O copia este link: <a href="{{link_url}}" style="color: ${branding.primary_color};">{{link_url}}</a>
            </p>
        </div>
    `
    return getBaseHtml(`Nueva Factura #${invoiceNumber}`, content, branding, style)
}

export function getInvoiceSummaryEmailHtml(clientName: string, totalAmount: string, count: number, linkUrl: string, branding: EmailBranding, style: EmailStyle = 'minimal'): string {
    const isNeo = style === 'neo';
    const isSwiss = style === 'swiss';

    // Customized for "Account Statement"
    // Swiss style uses stark contrasts
    const content = `
        <div style="text-align: center; margin-bottom: 30px;">
            <p style="margin: 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Estado de Cuenta</p>
            
            ${isSwiss ?
            `<h1 style="font-size: 80px; margin: 10px 0; letter-spacing: -4px;">${totalAmount}</h1>` :
            `<h1 style="font-size: 42px; margin: 10px 0; color: ${branding.primary_color};">${totalAmount}</h1>`
        }
            
            <div style="display: inline-block; background: ${isSwiss ? '#000' : '#e0e7ff'}; color: ${isSwiss ? '#fff' : branding.primary_color}; padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: bold;">
                ${count} Facturas Pendientes
            </div>
        </div>
        
        <p style="margin-bottom: 24px;">Hola <strong>${clientName}</strong>,</p>
        <p>Te enviamos un resumen de tu saldo pendiente con <strong>${branding.agency_name}</strong>. Puedes ver el detalle completo y realizar el pago desde tu portal de cliente.</p>

        <div style="text-align: center; margin: 40px 0;">
            <a href="${linkUrl}" style="${isSwiss ? 'background:#000; color:#fff; font-size:18px; padding:20px 50px; text-decoration:none; font-weight:bold;' : `background-color: ${branding.primary_color}; color: #ffffff; padding: 16px 40px; border-radius: ${isNeo ? '50px' : '8px'}; text-decoration: none; font-weight: 600; display: inline-block; box-shadow: ${isNeo ? '0 10px 20px -5px ' + branding.primary_color + '66' : '0 4px 6px -1px rgba(0,0,0,0.1)'};`}">
                Ver Estado de Cuenta
            </a>
        </div>
    `
    return getBaseHtml(`Estado de Cuenta`, content, branding, style)
}

export function getQuoteEmailHtml(clientName: string, quoteNumber: string, amount: string, date: string, branding: EmailBranding, style: EmailStyle = 'minimal'): string {
    const isSwiss = style === 'swiss';
    const isNeo = style === 'neo';

    // Swiss/Neo specific layout items
    const containerStyle = isSwiss ?
        `border-left: 4px solid #000; padding-left: 20px; margin: 30px 0;` :
        (isNeo ? `background: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.8); border-radius: 12px; padding: 24px; margin: 24px 0;` : `border-left: 4px solid ${branding.secondary_color}; padding-left: 20px; margin: 30px 0;`);

    const titleColor = isSwiss ? '#000' : (isNeo ? '#334155' : '#1e293b');
    const amountColor = isSwiss ? '#000' : branding.primary_color;

    const content = `
        <p>Hola <strong>${clientName}</strong>,</p>
        <p>Hemos preparado la siguiente propuesta comercial para ti:</p>

        <div style="${containerStyle}">
            <p style="font-size: 12px; text-transform: uppercase; color: #64748b; margin: 0 0 4px 0; letter-spacing: 1px;">Propuesta Comercial</p>
            <h2 style="margin: 0; color: ${titleColor}; font-size: 20px;">Cotización #${quoteNumber}</h2>
            <p style="font-size: 32px; font-weight: bold; color: ${amountColor}; margin: 12px 0; letter-spacing: -1px;">${amount}</p>
            <p style="font-size: 12px; color: #64748b;">Generada el ${date}</p>
        </div>

        <p>Esta propuesta incluye el detalle completo de los servicios y condiciones. Quedamos atentos a tus comentarios.</p>

        <div style="margin-top: 32px; text-align: ${isSwiss ? 'left' : 'center'};">
             <a href="{{link_url}}" style="${isSwiss ? 'background:#000; color:#fff; padding:16px 32px; text-decoration:none; font-weight:bold; display:inline-block;' : `background-color: ${branding.primary_color}; color: #ffffff; padding: 14px 28px; border-radius: ${isNeo ? '50px' : '6px'}; text-decoration: none; font-weight: 600; display: inline-block; box-shadow: ${isNeo ? '0 10px 20px -5px ' + branding.primary_color + '66' : '0 2px 4px rgba(0,0,0,0.1)'};`}">
                Ver Propuesta Completa
            </a>
        </div>
    `
    return getBaseHtml(`Cotización #${quoteNumber}`, content, branding, style)
}

export function getBriefingSubmissionEmailHtml(clientName: string, templateName: string, linkUrl: string, branding: EmailBranding, style: EmailStyle = 'minimal'): string {
    const isSwiss = style === 'swiss';
    const isNeo = style === 'neo';

    const content = `
        <p>Hola <strong>${clientName}</strong>,</p>
        <p>Hemos recibido correctamente tu briefing: <strong>${templateName}</strong>.</p>
        
        <div style="${isSwiss ? 'border: 1px solid #000; padding: 20px; margin: 20px 0;' : (isNeo ? 'background: #eff6ff; border-radius: 12px; padding: 20px; margin: 24px 0;' : 'background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0;')}">
            <p style="margin: 0; font-size: 14px; color: ${isSwiss ? '#000' : '#475569'};">
                Nuestro equipo revisará la información para proceder con los siguientes pasos del proyecto.
            </p>
        </div>

        <p>Puedes revisar o editar las respuestas en el portal:</p>
        <div style="margin: 32px 0; text-align: ${isSwiss ? 'left' : 'center'};">
             <a href="${linkUrl}" style="${isSwiss ? 'background:#000; color:#fff; padding:14px 28px; text-decoration:none; font-weight:bold; display:inline-block;' : `background-color: ${branding.primary_color}; color: #ffffff; padding: 12px 24px; border-radius: ${isNeo ? '50px' : '6px'}; text-decoration: none; font-weight: 600; display:inline-block; box-shadow: ${isNeo ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'};`}">
                Ver Briefing
            </a>
        </div>
    `
    return getBaseHtml(`Briefing Recibido`, content, branding, style)
}

export function getPortalInviteEmailHtml(clientName: string, portalUrl: string, branding: EmailBranding, style: EmailStyle = 'minimal'): string {
    const isSwiss = style === 'swiss';
    const isNeo = style === 'neo';

    // Professional/Welcome Tone

    // Feature Grid items
    const features = [
        { icon: "📄", title: "Facturación Centralizada", desc: "Historial de pagos y facturas pendientes." },
        { icon: "🚀", title: "Gestión de Servicios", desc: "Estado de tus productos y contratos activos." },
        { icon: "📂", title: "Documentos Compartidos", desc: "Acceso seguro a contratos y entregables." }
    ];

    const featureHtml = features.map(f => `
        <div style="margin-bottom: 20px; display: table; width: 100%;">
            <div style="display: table-cell; width: 40px; vertical-align: top; font-size: 24px;">${f.icon}</div>
            <div style="display: table-cell; vertical-align: top;">
                <h4 style="margin: 0 0 4px 0; color: ${isSwiss ? '#000' : '#1e293b'}; font-size: 14px;">${f.title}</h4>
                <p style="margin: 0; font-size: 12px; color: #64748b;">${f.desc}</p>
            </div>
        </div>
    `).join('');

    const content = `
        <h2 style="margin-top: 0; color: ${isSwiss ? '#000' : '#1e293b'}; font-size: 24px;">Bienvenido a tu Portal de Cliente</h2>
        <p>Hola <strong>${clientName}</strong>,</p>
        <p>En <strong>${branding.agency_name}</strong> hemos preparado un espacio exclusivo para ti. Aquí podrás gestionar toda tu relación comercial con nosotros de forma transparente, segura y eficiente.</p>

        <div style="margin: 30px 0; padding: ${isSwiss ? '20px 0' : '20px'}; background: ${isSwiss ? 'transparent' : (isNeo ? 'rgba(255,255,255,0.5)' : '#ffffff')}; border-radius: ${isNeo ? '16px' : '0'};">
            ${featureHtml}
        </div>

        <p>Accede ahora y descubre todo lo que hemos preparado para impulsar tu negocio.</p>

        <div style="margin: 40px 0; text-align: ${isSwiss ? 'left' : 'center'};">
             <a href="${portalUrl}" style="${isSwiss ? 'background:#000; color:#fff; padding:18px 36px; text-decoration:none; font-weight:bold; display:inline-block; font-size: 16px;' : `background-color: ${branding.primary_color}; color: #ffffff; padding: 16px 32px; border-radius: ${isNeo ? '50px' : '6px'}; text-decoration: none; font-weight: 600; display:inline-block; box-shadow: ${isNeo ? '0 10px 20px -5px ' + branding.primary_color + '66' : '0 4px 6px rgba(0,0,0,0.1)'}; transition: transform 0.2s;`}">
                Ingresar al Portal
            </a>
        </div>
        
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px;">
            Si tienes problemas para acceder, responde a este correo y te ayudaremos.
        </p>
    `
    return getBaseHtml(`Bienvenido a ${branding.agency_name}`, content, branding, style)
}

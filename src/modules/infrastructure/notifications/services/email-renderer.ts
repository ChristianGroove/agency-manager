
import { EmailBlock, EmailBlockStyle, ContentHeader, ContentText, ContentButton, ContentImage, ContentSocial } from "./types";
import { EmailBranding } from "./email-templates";

const BASE_STYLES = {
    fontFamily: "'Inter', Arial, sans-serif",
    maxWidth: '600px'
};

/**
 * Converts a style object to CSS string
 */
function styleToString(style: EmailBlockStyle = {}): string {
    return Object.entries(style).map(([k, v]) => {
        const key = k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
        return `${key}:${typeof v === 'number' ? `${v}px` : v}`;
    }).join(';');
}

/**
 * Renders individual blocks
 */
function renderBlock(block: EmailBlock, branding: EmailBranding): string {
    const s = `style="${styleToString(block.style)}"`

    switch (block.type) {
        case 'header':
            const h = block.content as ContentHeader;
            if (h.logoUrl) {
                return `<div ${s}><img src="${h.logoUrl}" alt="${branding.agency_name}" style="height: 40px; display:block; margin: 0 auto;"></div>`;
            }
            return `<h${h.level} ${s} style="color: ${branding.primary_color}; margin: 0;">${h.text}</h${h.level}>`;

        case 'text':
            const t = block.content as ContentText;
            return `<div ${s} style="line-height: 1.6; color: #334155;">${t.html}</div>`;

        case 'button':
            const b = block.content as ContentButton;
            const bg = b.variant === 'primary' ? branding.primary_color : (b.variant === 'secondary' ? branding.secondary_color : 'transparent');
            const color = b.variant === 'outline' ? branding.primary_color : '#ffffff';
            const border = b.variant === 'outline' ? `2px solid ${branding.primary_color}` : 'none';

            return `
            <div style="text-align: ${block.style?.textAlign || 'center'}; margin: 20px 0;">
                <a href="${b.url}" style="background: ${bg}; color: ${color}; border: ${border}; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${b.text}</a>
            </div>`;

        case 'image':
            const img = block.content as ContentImage;
            return `<div ${s}><img src="${img.url}" alt="${img.alt}" style="width: 100%; max-width: 100%; height: auto; border-radius: 8px;"></div>`;

        case 'divider':
            return `<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">`;

        case 'spacer':
            return `<div style="height: 30px;"></div>`;

        case 'footer':
            const year = new Date().getFullYear();
            return `
            <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                <p style="margin-bottom: 8px;">${branding.footer_text || `&copy; ${year} ${branding.agency_name}`}</p>
                <div style="font-size: 10px; color: #cbd5e1;">${branding.legal_footer || ''}</div>
            </div>`;

        default:
            return '';
    }
}

/**
 * Main Render Function
 */
export function renderEmailFromBlocks(blocks: EmailBlock[], branding: EmailBranding): string {
    const innerHtml = blocks.map(b => renderBlock(b, branding)).join('\n');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${branding.agency_name}</title>
         <style> @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'); </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center">
            <tr>
                <td align="center" style="padding: 40px 10px;">
                    <!-- Container -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <tr>
                            <td style="padding: 40px;">
                                ${innerHtml}
                            </td>
                        </tr>
                    </table>
                    <!-- End Container -->
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

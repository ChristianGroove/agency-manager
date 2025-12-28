import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Client } from "@/types";
import { Invoice } from "@/types/billing";
import { getDocumentTypeLabel } from "@/lib/billing-utils";

// Helper to load image
const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
        const data = await fetch(url);
        const blob = await data.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64data = reader.result;
                resolve(base64data as string);
            }
        });
    } catch (e) {
        console.warn("Failed to load image", e);
        return "";
    }
}

export const generateInvoicePDF = async (invoice: Invoice, client: Client | any, settings?: any): Promise<Blob> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const brandColor = settings?.brand_color || "#0F172A";

    // --- Header ---
    // Logo logic: Emitter Logo > Settings Logo > Default
    let logoUrl = invoice.emitter?.logo_url || settings?.invoice_logo_url || '/branding/logo dark.svg';

    if (logoUrl?.startsWith('/')) {
        logoUrl = `${window.location.origin}${logoUrl}`;
    }

    if (logoUrl) {
        const logoBase64 = await getBase64FromUrl(logoUrl);
        if (logoBase64) {
            doc.addImage(logoBase64, 'SVG', margin, 15, 40, 0, undefined, 'FAST');
        } else {
            // Fallback text
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text(invoice.emitter?.display_name || settings?.agency_name || "EMPRESA", margin, 30);
        }
    } else {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(invoice.emitter?.display_name || settings?.agency_name || "AGENCIA", margin, 30);
    }

    // Invoice Label (Strictly Derived)
    // Use the helper to ensure exact match with UI labels
    // Default to 'CUENTA DE COBRO' if not present, but should be strictly set now
    const docType = invoice.document_type || 'CUENTA_DE_COBRO';
    const docTitle = getDocumentTypeLabel(docType).toUpperCase();

    doc.setFontSize(20); // Slightly smaller to fit long titles
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor);
    doc.text(docTitle, pageWidth - margin, 30, { align: "right" });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`# ${invoice.number}`, pageWidth - margin, 38, { align: "right" });

    // Status Badge
    doc.setFontSize(10);
    if (invoice.status === 'paid') {
        doc.setTextColor(34, 197, 94); // Green
        doc.text("PAGADA", pageWidth - margin, 45, { align: "right" });
    } else {
        doc.setTextColor(239, 68, 68); // Red
        doc.text("PENDIENTE", pageWidth - margin, 45, { align: "right" });
    }

    // --- Agency/Emitter Info (Below Logo) ---
    let yPos = 55;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);

    // Use Emitter details strictly for Legal Identity
    // If no emitter is attached, we prefer to show nothing or a specific placeholder rather than mixing Agency Branding with Legal Data
    const issuerName = invoice.emitter?.legal_name || invoice.emitter?.display_name || "EMISOR NO IDENTIFICADO";

    // Construct ID string correctly
    let issuerIdString = "";
    if (invoice.emitter) {
        const idType = invoice.emitter.identification_type || "NIT";
        const idNum = invoice.emitter.identification_number;
        const dv = invoice.emitter.verification_digit;

        if (idType === 'NIT' && dv) {
            issuerIdString = `NIT: ${idNum}-${dv}`;
        } else {
            issuerIdString = `${idType}: ${idNum}`;
        }
    }
    // REMOVED LEGACY FALLBACK to settings.agency_nit per strict requirements

    const issuerAddress = invoice.emitter?.address;
    const issuerEmail = invoice.emitter?.email;
    const issuerPhone = invoice.emitter?.phone;

    // Only render if we have data
    doc.text(issuerName, margin, yPos); yPos += 5;
    if (issuerIdString) { doc.text(issuerIdString, margin, yPos); yPos += 5; }

    // Address (Multi-line support if needed, but simple for now)
    if (issuerAddress) { doc.text(issuerAddress, margin, yPos); yPos += 5; }

    if (issuerEmail) { doc.text(issuerEmail, margin, yPos); yPos += 5; }
    if (issuerPhone) { doc.text(issuerPhone, margin, yPos); yPos += 5; }


    // --- Client Info ---
    // "Bill To" Section
    const rightColX = pageWidth / 2 + 10;
    yPos = 55;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("CLIENTE:", rightColX, yPos);

    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(client.company_name || client.name, rightColX, yPos);

    yPos += 6;
    doc.setFontSize(9);
    doc.setTextColor(80);
    if (client.nit) { doc.text(`NIT: ${client.nit}`, rightColX, yPos); yPos += 5; }
    doc.text(client.address || "", rightColX, yPos); yPos += 5;
    doc.text(client.email || "", rightColX, yPos); yPos += 5;
    doc.text(client.phone || "", rightColX, yPos);

    // --- Dates ---
    const dateY = 95;
    doc.setDrawColor(230);
    doc.line(margin, dateY, pageWidth - margin, dateY);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("FECHA DE EMISIÓN", margin, dateY + 6);
    doc.text("FECHA DE VENCIMIENTO", rightColX, dateY + 6);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(new Date(invoice.date).toLocaleDateString(), margin, dateY + 12);
    if (invoice.due_date) {
        doc.text(new Date(invoice.due_date).toLocaleDateString(), rightColX, dateY + 12);
    }

    // --- Items Table ---
    const tableHeaderColor = settings?.brand_color ? settings.brand_color : [15, 23, 42];

    autoTable(doc, {
        startY: dateY + 20,
        head: [['DESCRIPCIÓN', 'CANT', 'PRECIO UNIT.', 'TOTAL']],
        body: invoice.items.map(item => [
            item.description,
            item.quantity,
            `$${item.price.toLocaleString()}`,
            `$${(item.quantity * item.price).toLocaleString()}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: tableHeaderColor, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: margin, right: margin }
    });

    // --- Footer / Totals ---
    // @ts-ignore
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    const summaryX = pageWidth - margin - 70;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Subtotal:", summaryX, finalY, { align: "left" });
    doc.setTextColor(0);
    doc.text(`$${invoice.total.toLocaleString()}`, pageWidth - margin, finalY, { align: "right" });

    finalY += 7;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor);
    doc.text("TOTAL", summaryX, finalY, { align: "left" });
    doc.text(`$${invoice.total.toLocaleString()}`, pageWidth - margin, finalY, { align: "right" });

    // Footer Text
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");

    const footerY = doc.internal.pageSize.getHeight() - 15;
    if (settings?.invoice_footer) {
        doc.text(settings.invoice_footer, pageWidth / 2, footerY - 5, { align: "center", maxWidth: pageWidth - 40 });
    }

    // Resolution Text if Juridica
    // TODO: Add resolution Number field to Emitter in future
    if (invoice.document_type === 'FACTURA_ELECTRONICA') {
        doc.text("Autorización Facturación Electrónica DIAN No. [PENDIENTE]", pageWidth / 2, footerY - 10, { align: "center" });
    }

    doc.text("Generado por Agency Manager", pageWidth / 2, footerY, { align: "center" });

    return doc.output('blob');
};

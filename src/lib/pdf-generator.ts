import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Ensure this is installed or use standard table
import { Client, Invoice } from "@/types";

// Helper to load image
const getBase64FromUrl = async (url: string): Promise<string> => {
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
}

export const generateInvoicePDF = async (invoice: Invoice, client: Client | any, settings?: any): Promise<Blob> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const brandColor = settings?.brand_color || "#0F172A"; // Default slate-900

    // --- Header ---
    // Logo - Use invoice_logo_url if set, otherwise fallback to default Pixy dark logo
    let logoUrl = settings?.invoice_logo_url || '/branding/logo dark.svg';

    // Ensure the URL is absolute for fetch to work properly
    if (logoUrl.startsWith('/')) {
        logoUrl = `${window.location.origin}${logoUrl}`;
    }

    if (logoUrl) {
        try {
            const logoBase64 = await getBase64FromUrl(logoUrl);
            doc.addImage(logoBase64, 'SVG', margin, 15, 40, 0, undefined, 'FAST'); // Auto height
        } catch (e) {
            console.warn("Could not load logo for PDF", e);
            // Fallback text if logo fails to load
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text(settings?.agency_name || "AGENCIA", margin, 30);
        }
    } else {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(settings?.agency_name || "AGENCIA", margin, 30);
    }

    // Invoice Label & Number
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor);
    doc.text("FACTURA", pageWidth - margin, 30, { align: "right" });

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

    // --- Agency Info (Below Logo) ---
    let yPos = 55;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(settings?.agency_name || "", margin, yPos); yPos += 5;
    if (settings?.agency_nit) { doc.text(`NIT: ${settings.agency_nit}`, margin, yPos); yPos += 5; }
    if (settings?.agency_address) { doc.text(settings.agency_address, margin, yPos); yPos += 5; }
    if (settings?.agency_email) { doc.text(settings.agency_email, margin, yPos); yPos += 5; }
    if (settings?.agency_phone) { doc.text(settings.agency_phone, margin, yPos); yPos += 5; }

    // --- Client Info (Right Side or Below) ---
    // Let's align "Facturar a" below agency info but perhaps column 2?
    // Modern layout: Left side Agency, Right side Client? Or Top/Bottom.
    // Let's do Standard: Left: From, Right: To (below Header)

    // "Bill To" Section
    const rightColX = pageWidth / 2 + 10;
    yPos = 55;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("FACTURAR A:", rightColX, yPos);

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
    const tableHeaderColor = settings?.brand_color ? settings.brand_color : [15, 23, 42]; // RGB or Hex

    // Using autoTable for better layout
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
            0: { cellWidth: 'auto' }, // Description
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: margin, right: margin }
    });

    // --- Footer / Totals ---
    // @ts-ignore
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals Block
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
    doc.text("Generado por Agency Manager", pageWidth / 2, footerY, { align: "center" });

    return doc.output('blob');
};

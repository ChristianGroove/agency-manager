import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface PlatformInvoiceData {
    invoice_number: string;
    organization_name: string;
    amount: number;
    currency: string;
    billing_period: string;
    issue_date: Date;
    transaction_reference?: string;
    payment_method?: string;
    // Client legal details
    client_tax_id?: string;
    client_address?: string;
    client_legal_name?: string;
    // Tax details
    include_tax?: boolean;
    tax_rate?: number;
    tax_amount?: number;
    amount_subtotal?: number;
    // New: Dynamic payment methods
    payment_methods?: {
        title: string;
        instructions?: string | null;
        details?: any;
    }[];
}

export const generatePlatformInvoicePDF = async (data: PlatformInvoiceData): Promise<Blob> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const brandColor = "#0F172A"; // Dark Navy
    const accentColor = "#EC4899"; // Pixy Pink

    // --- Background Decoration ---
    doc.setFillColor(249, 250, 251);
    doc.rect(0, 0, 5, doc.internal.pageSize.getHeight(), 'F');
    doc.setFillColor(brandColor);
    doc.rect(0, 0, 5, 40, 'F');

    // --- Header ---
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor);
    doc.text("PIXY SPACES", margin, 25);
    
    // Remitente (Pixy Spaces / Emisor Legal)
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("SERVICIO DE LICENCIAMIENTO DE SOFTWARE", margin, 31);

    // Document Label
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor);
    doc.text("CUENTA DE COBRO", pageWidth - margin, 25, { align: "right" });

    doc.setFontSize(12);
    doc.setTextColor(accentColor);
    doc.text(`No: ${data.invoice_number}`, pageWidth - margin, 32, { align: "right" });

    // --- Dividers ---
    doc.setDrawColor(240);
    doc.line(margin, 40, pageWidth - margin, 40);

    // --- Info Sections ---
    let yPos = 55;
    
    // DEBE A (Issuer)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor);
    doc.text("DEBE A:", margin, yPos);
    
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70);
    const issuerInfo = [
        "Cristian Camilo Gomez Penagos",
        "NIT: 1110458437",
        "Ibague, Colombia",
        "Actividad: Desarrollo y Licenciamiento de Software"
    ];
    issuerInfo.forEach(line => {
        doc.text(line, margin, yPos);
        yPos += 5;
    });

    // PARA (Recipient)
    const rightColX = pageWidth / 2 + 10;
    yPos = 55;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor);
    doc.text("PARA:", rightColX, yPos);

    yPos += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70);
    
    const clientName = data.client_legal_name || data.organization_name;
    doc.text(clientName, rightColX, yPos); 
    
    if (data.client_tax_id) {
        yPos += 5;
        doc.text(`NIT: ${data.client_tax_id}`, rightColX, yPos);
    }
    
    if (data.client_address) {
        yPos += 5;
        doc.setFontSize(8);
        doc.text(data.client_address, rightColX, yPos, { maxWidth: pageWidth - rightColX - margin });
        doc.setFontSize(9);
    }
    
    yPos += 5;
    doc.text("Licencia de Uso de Software Pixy Spaces", rightColX, yPos);

    // --- Secondary Details Bar ---
    yPos = 95;
    doc.setFillColor(250, 251, 252);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 15, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.setFont("helvetica", "bold");
    doc.text("FECHA DE EMISIÓN", margin + 5, yPos + 6);
    doc.text("MÉTODO DE PAGO", rightColX, yPos + 6);

    doc.setFontSize(9);
    doc.setTextColor(brandColor);
    doc.text(format(data.issue_date, 'PPPP', { locale: es }), margin + 5, yPos + 11);
    doc.text(data.payment_method || "Transferencia / Pago Electrónico", rightColX, yPos + 11);

    // --- Main Concept Table ---
    yPos += 25;
    
    const currencyFormatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: data.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const formattedAmount = `${currencyFormatter.format(data.amount)} ${data.currency}`;
    const formattedSubtotal = `${currencyFormatter.format(data.amount_subtotal || data.amount)} ${data.currency}`;
    const formattedTax = `${currencyFormatter.format(data.tax_amount || 0)} ${data.currency}`;

    const conceptText = `Licencia de uso de software SaaS – Pixy Spaces\nPeriodo: ${data.billing_period}\nOrganización: ${data.organization_name}`;

    autoTable(doc, {
        startY: yPos,
        head: [['DESCRIPCIÓN DEL SERVICIO', 'VALOR']],
        body: [[conceptText, data.include_tax ? formattedSubtotal : formattedAmount]],
        theme: 'striped',
        headStyles: { 
            fillColor: [15, 23, 42], 
            textColor: 255, 
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 5
        },
        styles: { 
            fontSize: 9, 
            cellPadding: 6,
            textColor: 50,
            lineColor: [240, 240, 240],
            lineWidth: 0.1,
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin }
    });

    // --- Totals Section ---
    // @ts-ignore
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    const summaryWidth = 75;
    const summaryX = pageWidth - margin - summaryWidth;
    
    // Background for total
    doc.setFillColor(15, 23, 42);
    doc.rect(summaryX, finalY, summaryWidth, data.include_tax ? 35 : 18, 'F');
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180);

    if (data.include_tax) {
        doc.text("SUBTOTAL:", summaryX + 5, finalY + 7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255);
        doc.text(formattedSubtotal, summaryX + summaryWidth - 5, finalY + 7, { align: "right" });

        finalY += 8;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(180);
        doc.text(`IVA (${data.tax_rate}%):`, summaryX + 5, finalY + 7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255);
        doc.text(formattedTax, summaryX + summaryWidth - 5, finalY + 7, { align: "right" });

        finalY += 10;
        doc.setDrawColor(50);
        doc.line(summaryX + 5, finalY - 2, summaryX + summaryWidth - 5, finalY - 2);
    }
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180);
    doc.text("TOTAL A PAGAR", summaryX + 5, finalY + 7);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255);
    doc.text(formattedAmount, summaryX + summaryWidth - 5, finalY + 13, { align: "right" });

    // --- Payment Methods Section (PDF) ---
    if (data.payment_methods && data.payment_methods.length > 0) {
        finalY += 30;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(brandColor);
        doc.text("MÉTODOS DE PAGO PARA TRANSFERENCIA:", margin, finalY);

        finalY += 6;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(70);

        data.payment_methods.forEach(m => {
            const details = Object.entries(m.details || {}).map(([k, v]) => `${v}`).join(' ');
            const methodText = `${m.title}: ${m.instructions || ''} ${details}`;
            doc.text(methodText, margin, finalY);
            finalY += 5;
        });
    }

    // --- Legal Footer ---
    const footerY = doc.internal.pageSize.getHeight() - 30;
    
    doc.setDrawColor(240);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");
    
    const legalText = "Documento equivalente a cuenta de cobro por licenciamiento de software. Se emite bajo los lineamientos legales vigentes en Colombia.";
    
    doc.text(legalText, pageWidth / 2, footerY + 8, { align: "center", maxWidth: pageWidth - 60 });
    
    doc.setFont("helvetica", "bold");
    doc.text("PIXY SPACES", pageWidth / 2, footerY + 18, { align: "center" });

    return doc.output('blob');
};

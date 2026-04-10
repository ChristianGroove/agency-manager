import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdvancedReportData } from '@/modules/features/crm/services/logic/analytics-actions';
import { BrandingConfig } from '@/types/branding';

interface ReportExportData {
    reportData: AdvancedReportData;
    branding: BrandingConfig;
    dateRange: { from: Date; to: Date };
}

/**
 * Converts a URL to a base64 string for jsPDF using Canvas for better CORS handling
 */
/**
 * Converts a URL or Data URI to a base64 string for jsPDF
 */
async function getBase64ImageFromURL(url: string): Promise<string> {
    if (url.startsWith('data:')) return url;
    
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        // Add cache busting
        const targetUrl = url.includes('?') 
            ? `${url}&t=${Date.now()}` 
            : `${url}?t=${Date.now()}`;

        img.onload = async () => {
            try {
                if ('decode' in img) {
                    await img.decode();
                }
                const canvas = document.createElement('canvas');
                // Use a high-density canvas for better logo quality
                const scale = 2; 
                canvas.width = (img.naturalWidth || img.width || 300) * scale;
                canvas.height = (img.naturalHeight || img.height || 100) * scale;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/png'));
                } else {
                    resolve("");
                }
            } catch (e) {
                console.error("Image processing failed:", e);
                resolve("");
            }
        };

        img.onerror = () => {
            console.error("Error loading image for PDF:", targetUrl);
            resolve("");
        };

        img.src = targetUrl;
    });
}

const margin = 20;
const darkNavy = "#0F172A";
const mutedText = "#64748B";

function drawHeader(doc: jsPDF, branding: BrandingConfig, dateRange: { from: Date; to: Date }) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor = branding.colors.primary || "#4F46E5";
    let yPos = 20;

    // Report Title (Right-Aligned)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkNavy);
    doc.text("REPORTE DE RENDIMIENTO CRM", pageWidth - margin, yPos + 4, { align: "right" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedText);
    doc.text(
        `Periodo de Análisis`,
        pageWidth - margin,
        yPos + 9,
        { align: "right" }
    );
    doc.text(
        `${format(dateRange.from, 'dd MMM yyyy', { locale: es })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: es })}`,
        pageWidth - margin,
        yPos + 13,
        { align: "right" }
    );

    yPos += 22;
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    return yPos;
}

function drawFooter(doc: jsPDF, branding: BrandingConfig, pageNum: number, totalPages?: number) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 15;
    
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.1);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    doc.setFontSize(7);
    doc.setTextColor(mutedText);
    doc.text(`${branding.name.toUpperCase()} - COMMAND CENTER`, margin, footerY);
    
    const pageText = totalPages ? `Página ${pageNum} de ${totalPages}` : `Página ${pageNum}`;
    doc.text(pageText, pageWidth - margin, footerY, { align: "right" });
}

export const generateCRMReportPDF = async (data: ReportExportData): Promise<Blob> => {
    const { reportData, branding, dateRange } = data;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const primaryColor = branding.colors.primary || "#4F46E5";

    // Helper to ensure space for a section
    const ensureSpace = (doc: jsPDF, heightNeeded: number, currentY: number): number => {
        if (currentY + heightNeeded > pageHeight - 30) {
            doc.addPage();
            return drawHeader(doc, branding, dateRange);
        }
        return currentY;
    };

    // Initial Page
    let yPos = drawHeader(doc, branding, dateRange);

    // --- KPI Summary Bar ---
    yPos += 15;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 22, 3, 3, 'F');
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.1);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 22);

    const kpiWidth = (pageWidth - (margin * 2)) / 5;
    const kpis = [
        { label: "LEADS TOTALES", val: reportData.summary.total_leads.toString() },
        { label: "CONVERSIÓN", val: `${reportData.summary.conversion_rate}%` },
        { label: "PIPELINE", val: `$${(reportData.summary.pipeline_value / 1000000).toFixed(1)}M` },
        { label: "TIEMPO RESP.", val: `${Math.round(reportData.summary.avg_response_time / 60)}m` },
        { label: "ABANDONO", val: reportData.summary.abandoned_leads.toString() }
    ];

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(mutedText);
    kpis.forEach((kpi, i) => {
        const x = margin + (i * kpiWidth) + (kpiWidth / 2);
        doc.text(kpi.label, x, yPos + 8, { align: "center" });
        doc.setFontSize(11);
        doc.setTextColor(primaryColor);
        doc.text(kpi.val, x, yPos + 16, { align: "center" });
        doc.setFontSize(7);
        doc.setTextColor(mutedText);
    });

    // --- Rankings Section ---
    yPos = ensureSpace(doc, 60, yPos + 40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkNavy);
    const rankingsTitle = "RANKINGS DE RENDIMIENTO";
    doc.text(rankingsTitle, margin, yPos);
    doc.setFillColor(primaryColor);
    doc.rect(margin, yPos + 2, doc.getTextWidth(rankingsTitle), 1.5, 'F');

    const topByConversion = [...reportData.agent_performance]
        .sort((a, b) => {
            const convA = a.leads_assigned > 0 ? a.deals_won / a.leads_assigned : 0;
            const convB = b.leads_assigned > 0 ? b.deals_won / b.leads_assigned : 0;
            return convB - convA;
        }).slice(0, 3);

    const slaLeaders = [...reportData.agent_performance]
        .sort((a, b) => b.sla_met_percentage - a.sla_met_percentage).slice(0, 3);

    yPos += 12;
    const hexToRgb = (hex: string): [number, number, number] => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    };
    const primaryRGB = hexToRgb(primaryColor);

    autoTable(doc, {
        startY: yPos,
        head: [['LIDERES EN CONVERSIÓN', 'WON', 'RATIO']],
        body: topByConversion.map(a => [
            a.agent_name, a.deals_won.toString(), 
            `${a.leads_assigned > 0 ? Math.round((a.deals_won / a.leads_assigned) * 100) : 0}%`
        ]),
        theme: 'plain',
        headStyles: { fillColor: [241, 245, 249], textColor: primaryRGB, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: margin, right: pageWidth / 2 + 5 }
    });

    autoTable(doc, {
        startY: yPos,
        head: [['LIDERES EN AGILIDAD (SLA)', 'AVG', 'SLA']],
        body: slaLeaders.map(a => [
            a.agent_name, `${Math.round(a.avg_response_time / 60)}m`, `${a.sla_met_percentage}%`
        ]),
        theme: 'plain',
        headStyles: { fillColor: [241, 245, 249], textColor: primaryRGB, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: pageWidth / 2 + 5, right: margin }
    });

    // --- Main Performance Table ---
    yPos = ensureSpace(doc, 40, (doc as any).lastAutoTable.finalY + 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkNavy);
    const detailTitle = "DETALLE GENERAL DE EQUIPO";
    doc.text(detailTitle, margin, yPos);
    doc.setFillColor(primaryColor);
    doc.rect(margin, yPos + 2, doc.getTextWidth(detailTitle), 1.5, 'F');

    yPos += 10;
    autoTable(doc, {
        startY: yPos,
        head: [['AGENTE', 'LEADS', 'WON', 'CONV', 'RESP (AVG)', 'SLA (< 5m)', 'TIEMPO LABOR']],
        body: reportData.agent_performance.map(a => [
            a.agent_name, a.leads_assigned.toString(), a.deals_won.toString(),
            `${a.leads_assigned > 0 ? Math.round((a.deals_won / a.leads_assigned) * 100) : 0}%`,
            `${Math.round(a.avg_response_time / 60)}m`, `${a.sla_met_percentage}%`,
            formatDuration(a.connection_time_seconds)
        ]),
        headStyles: { fillColor: primaryRGB, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 4, halign: 'center' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        margin: { left: margin, right: margin }
    });

    // --- Abandoned Leads Section ---
    if (reportData.abandoned_leads_list.length > 0) {
        yPos = ensureSpace(doc, 40, (doc as any).lastAutoTable.finalY + 20);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text("ALERTAS DE ABANDONO CRÍTICO (>24h)", margin, yPos);
        yPos += 5;
        autoTable(doc, {
            startY: yPos,
            head: [['LEAD', 'TIEMPO DE ESPERA', 'AGENTE ASIGNADO']],
            body: reportData.abandoned_leads_list.slice(0, 10).map(l => [
                l.name, formatDuration(l.waiting_seconds), l.assigned_agent
            ]),
            headStyles: { fillColor: [254, 242, 242], textColor: [153, 27, 27], fontSize: 8, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3 },
            margin: { left: margin, right: margin }
        });
    }

    // --- Final Step: Add footers to all pages ---
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(doc, branding, i, totalPages);
    }

    return doc.output('blob');
};

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

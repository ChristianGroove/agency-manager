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

export interface AgentReportExportData {
    agentId: string;
    reportData: AdvancedReportData;
    branding: BrandingConfig;
    dateRange: { from: Date; to: Date };
}

export const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
};

export const generateAgentReportPDF = async (data: AgentReportExportData): Promise<Blob> => {
    const { agentId, reportData, branding, dateRange } = data;
    const agent = reportData.agent_performance.find(a => a.agent_id === agentId);
    if (!agent) throw new Error("Agent not found in report data");

    const team = reportData.agent_performance;
    const totalTeamLeads = team.reduce((acc, a) => acc + a.leads_assigned, 0);
    const totalTeamWon = team.reduce((acc, a) => acc + a.deals_won, 0);
    const teamConversion = totalTeamLeads > 0 ? (totalTeamWon / totalTeamLeads) * 100 : 0;
    
    const validResponseTimes = team.filter(a => a.avg_response_time > 0);
    const teamAvgResponseTime = validResponseTimes.length > 0 
        ? validResponseTimes.reduce((acc, a) => acc + a.avg_response_time, 0) / validResponseTimes.length 
        : 0;

    const teamSla = team.length > 0 
        ? team.reduce((acc, a) => acc + a.sla_met_percentage, 0) / team.length 
        : 0;

    // Derived metrics for agent
    const agentConversion = agent.leads_assigned > 0 ? (agent.deals_won / agent.leads_assigned) * 100 : 0;
    const connectionHours = agent.connection_time_seconds / 3600;
    const leadsPerHour = connectionHours > 0 ? (agent.leads_assigned / connectionHours) : 0;
    const slaBreaches = Math.round(agent.leads_assigned * ((100 - agent.sla_met_percentage) / 100));

    const maxConversion = Math.max(...team.map(a => a.leads_assigned > 0 ? (a.deals_won / a.leads_assigned) * 100 : 0), 1);
    const maxVolume = Math.max(...team.map(a => a.leads_assigned), 1);
    const score = (
        ((agentConversion / maxConversion) * 40) +
        ((agent.sla_met_percentage / 100) * 40) +
        ((agent.leads_assigned / maxVolume) * 20)
    );
    const performanceScore = Math.min(Math.round(score), 100);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const primaryColor = branding.colors.primary || "#4F46E5";

    const ensureSpace = (doc: jsPDF, heightNeeded: number, currentY: number): number => {
        if (currentY + heightNeeded > pageHeight - 30) {
            doc.addPage();
            return drawHeader(doc, branding, dateRange);
        }
        return currentY;
    };

    let yPos = drawHeader(doc, branding, dateRange);

    // --- Header title ---
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("REPORTE DE RENDIMIENTO", margin, yPos);
    
    yPos += 8;
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    
    const nameStr = agent.agent_name.toUpperCase();
    const maxNameWidth = pageWidth - margin - margin - 40;
    let truncatedName = nameStr;
    if (doc.getTextWidth(nameStr) > maxNameWidth) {
        truncatedName = nameStr.substring(0, 25) + "...";
    }
    doc.text(truncatedName, margin, yPos);
    
    // Performance Score Badge
    doc.setFillColor(primaryColor);
    doc.roundedRect(pageWidth - margin - 35, yPos - 8, 35, 12, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`SCORE: ${performanceScore}/100`, pageWidth - margin - 17.5, yPos - 1, { align: "center" });

    // --- KPIs vs Team ---
    yPos += 15;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 3, 3, 'F');
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.1);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 25);

    const kpiWidth = (pageWidth - (margin * 2)) / 5;
    const kpis = [
        { label: "LEADS ATENDIDOS", val: agent.leads_assigned.toString(), sub: `Promedio: ${Math.round(totalTeamLeads / team.length)}` },
        { label: "CONVERSIÓN", val: `${Math.round(agentConversion)}%`, sub: `Equipo: ${Math.round(teamConversion)}%` },
        { label: "DEALS WON", val: agent.deals_won.toString(), sub: `Promedio: ${Math.round(totalTeamWon / team.length)}` },
        { label: "TIEMPO RESP.", val: `${Math.round(agent.avg_response_time / 60)}m`, sub: `Equipo: ${Math.round(teamAvgResponseTime / 60)}m` },
        { label: "AGILIDAD (SLA)", val: `${agent.sla_met_percentage}%`, sub: `Equipo: ${Math.round(teamSla)}%` }
    ];

    kpis.forEach((kpi, i) => {
        const x = margin + (i * kpiWidth) + (kpiWidth / 2);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(kpi.label, x, yPos + 8, { align: "center" });
        
        doc.setFontSize(14);
        doc.setTextColor(primaryColor);
        doc.text(kpi.val, x, yPos + 16, { align: "center" });
        
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(kpi.sub, x, yPos + 22, { align: "center" });
    });

    // --- Bullet Charts (Agent vs Team) ---
    yPos += 45;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("ANÁLISIS DE DESEMPEÑO VS EQUIPO", margin, yPos);
    doc.setFillColor(primaryColor);
    doc.rect(margin, yPos + 2, doc.getTextWidth("ANÁLISIS DE DESEMPEÑO VS EQUIPO"), 1.5, 'F');

    yPos += 15;
    

    const pRGB = hexToRgb(primaryColor);

    const drawBullet = (y: number, label: string, agentVal: number, teamVal: number, maxVal: number, isInverted: boolean, unit: string) => {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(label, margin, y);
        
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        const formattedAgent = unit === '%' ? Math.round(agentVal) : agentVal.toFixed(1);
        const formattedTeam = unit === '%' ? Math.round(teamVal) : teamVal.toFixed(1);
        doc.text(`Agente: ${formattedAgent}${unit} | Eq: ${formattedTeam}${unit}`, margin, y + 5);

        const barWidth = pageWidth - margin - margin - 60;
        const startX = margin + 60;
        
        // Background track
        doc.setFillColor(241, 245, 249); // slate-100
        doc.roundedRect(startX, y - 3, barWidth, 6, 3, 3, 'F');

        // Team Average Marker (background filled bar)
        const safeMax = maxVal <= 0 ? 1 : maxVal;
        const teamPct = Math.min(teamVal / safeMax, 1);
        doc.setFillColor(203, 213, 225); // slate-300
        doc.roundedRect(startX, y - 3, barWidth * teamPct, 6, 3, 3, 'F');

        // Agent Bar
        const agentPct = Math.min(agentVal / safeMax, 1);
        doc.setFillColor(pRGB[0], pRGB[1], pRGB[2]);
        doc.roundedRect(startX, y - 1.5, barWidth * agentPct, 3, 1.5, 1.5, 'F');

        // Team target line
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.5);
        doc.line(startX + (barWidth * teamPct), y - 4, startX + (barWidth * teamPct), y + 4);
    };

    const maxVolume2 = Math.max(agent.leads_assigned, totalTeamLeads / team.length, 1);
    const maxConv2 = Math.max(agentConversion, teamConversion, 1);
    const maxSla2 = 100;
    const maxResp2 = Math.max(agent.avg_response_time, teamAvgResponseTime, 1);

    drawBullet(yPos, "VOLUMEN (Leads)", agent.leads_assigned, totalTeamLeads / team.length, maxVolume2 * 1.2, false, "");
    yPos += 15;
    drawBullet(yPos, "EFECTIVIDAD (Conv)", agentConversion, teamConversion, maxConv2 * 1.2, false, "%");
    yPos += 15;
    drawBullet(yPos, "AGILIDAD (SLA)", agent.sla_met_percentage, teamSla, 100, false, "%");
    yPos += 15;
    // For response time, lower is better, but bullet chart just shows magnitude
    drawBullet(yPos, "VELOCIDAD RESP.", agent.avg_response_time / 60, teamAvgResponseTime / 60, (maxResp2 / 60) * 1.2, true, "m");

    yPos += 10;

    // --- Advanced Derived Metrics ---
    yPos += 20;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("MÉTRICAS DE PRODUCTIVIDAD", margin, yPos);
    doc.setFillColor(primaryColor);
    doc.rect(margin, yPos + 2, doc.getTextWidth("MÉTRICAS DE PRODUCTIVIDAD"), 1.5, 'F');

    yPos += 15;

    const primaryRGB = hexToRgb(primaryColor);

    autoTable(doc, {
        startY: yPos,
        head: [['TIEMPO EN LÍNEA', 'LEADS POR HORA', 'DEALS PERDIDOS', 'FALLAS SLA (> 5m)']],
        body: [[
            formatDuration(agent.connection_time_seconds),
            leadsPerHour.toFixed(1),
            (agent.leads_assigned - agent.deals_won).toString(),
            slaBreaches.toString()
        ]],
        headStyles: { fillColor: primaryRGB, textColor: 255, fontSize: 9, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 11, cellPadding: 6, halign: 'center', fontStyle: 'bold', textColor: [51, 65, 85] },
        margin: { left: margin, right: margin }
    });

    // --- Abandoned Leads Section ---
    const agentAbandoned = reportData.abandoned_leads_list.filter(l => l.assigned_agent === agent.agent_name);
    
    yPos = ensureSpace(doc, 40, (doc as any).lastAutoTable.finalY + 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("GESTIÓN DE RIESGO: ABANDONO CRÍTICO (>24h)", margin, yPos);
    doc.setFillColor(primaryColor);
    doc.rect(margin, yPos + 2, doc.getTextWidth("GESTIÓN DE RIESGO: ABANDONO CRÍTICO (>24h)"), 1.5, 'F');

    yPos += 15;
    if (agentAbandoned.length > 0) {
        doc.setFillColor(254, 242, 242); // red-50
        doc.setDrawColor(252, 165, 165); // red-300
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 25, 3, 3, 'FD');
        
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38); // red-600
        const totalAbandoned = agentAbandoned.length.toString();
        const numWidth = doc.getTextWidth(totalAbandoned);
        doc.text(totalAbandoned, margin + 10, yPos + 17);
        
        doc.setFontSize(10);
        doc.setTextColor(153, 27, 27); // red-800
        doc.text("LEADS EN ABANDONO", margin + 15 + numWidth, yPos + 11);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(185, 28, 28); // red-700
        doc.text("Estos prospectos llevan más de 24 horas sin respuesta por parte del asesor.", margin + 15 + numWidth, yPos + 19);
    } else {
        doc.setFillColor(240, 253, 244); // green-50
        doc.setDrawColor(134, 239, 172); // green-300
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 20, 3, 3, 'FD');
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 101, 52); // green-800
        doc.text("0 LEADS ABANDONADOS", margin + 10, yPos + 12);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(21, 128, 61); // green-700
        doc.text("Excelente gestión. El asesor no tiene tickets críticos pendientes.", margin + 55, yPos + 12);
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(doc, branding, i, totalPages);
    }

    return doc.output('blob');
};

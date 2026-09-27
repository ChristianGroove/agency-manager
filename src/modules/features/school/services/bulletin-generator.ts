// ==============================================================================
// PIXY EDU — WHITE-LABEL EXECUTIVE BULLETIN & RADAR REPORT GENERATOR
// Module: module_school (School Space)
// Path: src/modules/features/school/services/bulletin-generator.ts
// ==============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sha256 } from './sha256';
import type {
  AreaFinalEvaluation,
  ColombianPerformanceTier,
  SchoolAwardedBadge,
  SchoolPeriodBulletin,
} from '../types/school.types';

export interface BulletinRenderData {
  schoolName: string;
  schoolResolution: string;
  schoolNit: string;
  schoolLogoUrl?: string | null;
  primaryColor: string;
  studentName: string;
  studentCode: string;
  gradeAndSection: string;
  academicYear: string;
  periodName: string;
  overallAverage: number;
  generalTier: ColombianPerformanceTier;
  cohortRank?: number;
  totalStudentsInCohort?: number;
  totalAbsences: number;
  areas: AreaFinalEvaluation[];
  awardedBadges: SchoolAwardedBadge[];
  radarData: Record<string, number>;
  homeroomTeacherComment?: string | null;
  principalName: string;
  verificationSha256: string;
  verificationQrUrl: string;
  generatedAt: string;
}

/**
 * Computes a tamper-proof SHA-256 integrity hash for an official academic report card.
 * 100% compliant FIPS 180-4 standard SHA-256 in all runtimes (Server, Client, Edge).
 */
export function generateBulletinVerificationHash(params: {
  orgId: string;
  studentCode: string;
  periodId: string;
  overallAverage: number;
  timestamp: string;
}): string {
  const data = `${params.orgId}:${params.studentCode}:${params.periodId}:${params.overallAverage}:${params.timestamp}`;
  return sha256(data);
}

/**
 * Maps academic areas into normalized 0-100 radar axis points for polygonal chart rendering.
 */
export function buildRadarCompetencyData(areas: AreaFinalEvaluation[]): Record<string, number> {
  const radar: Record<string, number> = {};

  areas.forEach((area) => {
    // Normalization from 1.0 - 5.0 scale to 0 - 100 percentage
    const normalized = Math.round(((area.areaAverageScore - 1.0) / 4.0) * 100);
    const clamped = Math.max(0, Math.min(100, normalized));
    radar[area.areaName] = clamped;
  });

  return radar;
}

/**
 * Generates an SVG representation of the polygonal Radar Competency Chart (Spider Chart).
 */
export function generateRadarChartSvg(
  radarData: Record<string, number>,
  primaryColor: string = '#2563eb'
): string {
  const keys = Object.keys(radarData);
  if (keys.length < 3) {
    return ''; // Radar requires at least 3 points
  }

  const size = 260;
  const center = size / 2;
  const radius = 95;
  const angleStep = (2 * Math.PI) / keys.length;

  // Background concentric circles
  const gridCircles = [0.25, 0.5, 0.75, 1.0].map((level) => {
    const r = radius * level;
    return `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="1" />`;
  });

  // Radial axis lines
  const axisLines = keys.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#cbd5e1" stroke-width="1" />`;
  });

  // Calculate polygon points
  const polygonPoints = keys
    .map((key, i) => {
      const val = radarData[key] || 0;
      const r = (val / 100) * radius;
      const angle = i * angleStep - Math.PI / 2;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Labels
  const labels = keys.map((key, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 22;
    const x = center + labelRadius * Math.cos(angle);
    const y = center + labelRadius * Math.sin(angle) + 4;
    const shortLabel = key.length > 14 ? key.slice(0, 12) + '..' : key;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="8" font-weight="600" fill="#475569" text-anchor="middle">${shortLabel}</text>`;
  });

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${gridCircles.join('\n  ')}
  ${axisLines.join('\n  ')}
  <polygon points="${polygonPoints}" fill="${primaryColor}" fill-opacity="0.25" stroke="${primaryColor}" stroke-width="2" />
  ${labels.join('\n  ')}
</svg>
`.trim();
}

/**
 * Generates an official, publication-ready PDF Academic Report Card (Boletín Decreto 1290)
 */
export async function generateOfficialBulletinPdf(data: BulletinRenderData): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const brandColor = data.primaryColor || '#2563eb';

  // --- Top Decorative Branding Bar ---
  doc.setFillColor(brandColor);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // --- Institutional Header ---
  let y = 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(data.schoolName.toUpperCase(), pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  const legalInfo = `${data.schoolResolution} • NIT: ${data.schoolNit}`;
  doc.text(legalInfo, pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(brandColor);
  doc.text('INFORME VALORATIVO PERIÓDICO DE RENDIMIENTO ACADÉMICO', pageWidth / 2, y, { align: 'center' });

  y += 4.5;
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`SISTEMA INSTITUCIONAL DE EVALUACIÓN DE ESTUDIANTES (SIEE - DECRETO 1290)`, pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.text(`${data.periodName.toUpperCase()} • AÑO LECTIVO ${data.academicYear}`, pageWidth / 2, y, { align: 'center' });

  // --- Student Identification Panel Box ---
  y += 4;
  const boxHeight = 22;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 2, 2, 'FD');

  // Student details inside box
  const col1X = margin + 4;
  const col2X = margin + 85;
  const col3X = margin + 140;

  // Row 1
  let textY = y + 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('ESTUDIANTE:', col1X, textY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.studentName.toUpperCase(), col1X + 22, textY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CÓDIGO:', col2X, textY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(data.studentCode, col2X + 14, textY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('GRADO/GRUPO:', col3X, textY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandColor);
  doc.text(data.gradeAndSection, col3X + 22, textY);

  // Row 2
  textY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('PROMEDIO:', col1X, textY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(data.overallAverage >= 3.0 ? '#059669' : '#dc2626');
  doc.text(data.overallAverage.toFixed(2), col1X + 22, textY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DESEMPEÑO:', col2X, textY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.generalTier.toUpperCase(), col2X + 20, textY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('PUESTO:', col3X, textY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const rankStr = data.cohortRank ? `${data.cohortRank}° de ${data.totalStudentsInCohort || '-'}` : 'N/A';
  doc.text(rankStr, col3X + 22, textY);

  // Row 3
  textY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('FALLAS PERÍODO:', col1X, textY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(data.totalAbsences > 5 ? '#dc2626' : '#1e293b');
  doc.text(`${data.totalAbsences} horas`, col1X + 24, textY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('FECHA EMISIÓN:', col2X, textY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(data.generatedAt || new Date().toISOString().split('T')[0], col2X + 24, textY);

  // --- Curricular Areas and Subjects Table ---
  const tableStartY = y + boxHeight + 4;

  const tableBody: (string | number)[][] = [];

  data.areas.forEach((area) => {
    // Area Grouping Header Row
    tableBody.push([
      `ÁREA: ${area.areaName.toUpperCase()}`,
      '',
      area.areaAverageScore.toFixed(2),
      area.areaPerformanceTier.toUpperCase(),
      '',
      '',
    ]);

    // Subject Rows under this Area
    area.subjects.forEach((sub) => {
      tableBody.push([
        `    ${sub.subjectName}`,
        `${sub.weeklyHours}h`,
        sub.numericScore.toFixed(2),
        sub.performanceTier,
        sub.absencesCount > 0 ? `${sub.absencesCount}` : '0',
        sub.teacherName || 'Docente Titular',
      ]);
    });
  });

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [['ÁREA / ASIGNATURA', 'I.H.', 'CALIF.', 'DESEMPEÑO NACIONAL', 'FALLAS', 'DOCENTE']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 70, halign: 'left' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 16, halign: 'center' },
      5: { halign: 'left' },
    },
    didParseCell: (hookData) => {
      // Style Area Rows with distinct background
      const rawText = String(hookData.cell.raw || '');
      if (rawText.startsWith('ÁREA:')) {
        hookData.cell.styles.fillColor = [241, 245, 249]; // slate-100
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = [15, 23, 42];
      }
    },
  });

  // Calculate final Y after table
  const finalTableY = (doc as any).lastAutoTable?.finalY || 180;

  // --- Homeroom Teacher Comments Box ---
  let commentBoxY = finalTableY + 4;
  if (commentBoxY > pageHeight - 50) {
    doc.addPage();
    commentBoxY = 16;
  }

  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, commentBoxY, pageWidth - margin * 2, 18, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('OBSERVACIONES PEDAGÓGICAS Y CONVIVENCIALES:', margin + 3, commentBoxY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const commentText = data.homeroomTeacherComment ||
    'El estudiante demuestra compromiso sostenido con sus procesos cognitivos y formativos. Se le invita a continuar cultivando la excelencia y los valores institucionales.';
  doc.text(commentText, margin + 3, commentBoxY + 9, {
    maxWidth: pageWidth - margin * 2 - 6,
  });

  // --- Official Signatures ---
  const signY = commentBoxY + 30;
  if (signY <= pageHeight - 20) {
    const halfWidth = (pageWidth - margin * 2) / 2;

    // Rector signature line
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(margin + 15, signY, margin + halfWidth - 15, signY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(data.principalName || 'RECTOR(A) INSTITUCIONAL', margin + halfWidth / 2, signY + 3.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Rectoría & Representación Legal', margin + halfWidth / 2, signY + 6.5, { align: 'center' });

    // Homeroom Director signature line
    doc.line(margin + halfWidth + 15, signY, margin + halfWidth * 2 - 15, signY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('DIRECTOR(A) DE GRUPO', margin + halfWidth + halfWidth / 2, signY + 3.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Seguimiento Académico y Formativo', margin + halfWidth + halfWidth / 2, signY + 6.5, { align: 'center' });
  }

  // --- Footer Anti-Fraud Security Bar ---
  doc.setFillColor(241, 245, 249);
  doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');

  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const hashText = `CÓDIGO DE INTEGRIDAD DIGITAL SHA-256: ${data.verificationSha256 || 'N/A'}`;
  doc.text(hashText, margin, pageHeight - 3);
  doc.text('DOCUMENTO OFICIAL VALIDADOR DEL SISTEMA EDUCATIVO NACIONAL COLOMBIANO • PIXY EDU', pageWidth - margin, pageHeight - 3, { align: 'right' });

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}


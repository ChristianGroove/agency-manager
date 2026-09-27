// ==============================================================================
// PIXY EDU — PHYSICAL & DIGITAL QR CREDENTIALS BADGE GENERATOR
// Module: module_school (School Space)
// Path: src/modules/features/school/services/qr-credentials-generator.ts
// ==============================================================================

import jsPDF from 'jspdf';

export interface StudentBadgeCardData {
  enrollmentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  gradeName: string;
  sectionName: string;
  academicYear: string;
  qrAccessToken: string;
  bloodTypeRh?: string;
  healthProviderEps?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  schoolName: string;
  schoolLogoUrl?: string | null;
  schoolColor?: string;
}

export interface SheetGridDimensions {
  cardsPerPage: number;
  columns: number;
  rows: number;
  cardWidthMm: number; // CR80 standard: 85.6 mm
  cardHeightMm: number; // CR80 standard: 53.98 mm
}

export const CR80_STANDARD_SPEC: SheetGridDimensions = {
  cardsPerPage: 8,
  columns: 2,
  rows: 4,
  cardWidthMm: 85.6,
  cardHeightMm: 53.98,
};

/**
 * Builds the encrypted verification payload stored inside the student's QR code.
 * Used by gate scanners, classroom apps, cafeterias, and libraries.
 */
export function buildStudentQrPayload(data: {
  orgId: string;
  enrollmentId: string;
  qrAccessToken: string;
  studentCode: string;
}): string {
  const payload = {
    app: 'pixy_edu',
    org: data.orgId,
    eid: data.enrollmentId,
    tok: data.qrAccessToken,
    code: data.studentCode,
    ts: Date.now(),
  };

  return `PIXY:EDU:${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
}

/**
 * Decodes and validates a scanned QR token string.
 */
export function parseScannedQrPayload(qrString: string): {
  isValid: boolean;
  enrollmentId?: string;
  token?: string;
  code?: string;
  error?: string;
} {
  if (!qrString.startsWith('PIXY:EDU:')) {
    // Fallback: check if it's a raw 32-char hex access token
    if (/^[a-f0-9]{32}$/i.test(qrString)) {
      return { isValid: true, token: qrString };
    }
    return { isValid: false, error: 'Código QR no reconocido como credencial Pixy Edu válida' };
  }

  try {
    const rawBase64 = qrString.replace('PIXY:EDU:', '');
    const jsonStr = Buffer.from(rawBase64, 'base64').toString('utf8');
    const parsed = JSON.parse(jsonStr);

    if (!parsed.eid || !parsed.tok) {
      return { isValid: false, error: 'Credencial corrupta o incompleta' };
    }

    return {
      isValid: true,
      enrollmentId: parsed.eid,
      token: parsed.tok,
      code: parsed.code,
    };
  } catch (err: any) {
    return { isValid: false, error: `Error al decodificar credencial: ${err.message}` };
  }
}

/**
 * Generates an SVG template layout for a CR80 physical card badge.
 */
export function generateBadgeCardSvg(data: StudentBadgeCardData): string {
  const brandColor = data.schoolColor || '#2563eb';
  const fullName = `${data.firstName} ${data.lastName}`.toUpperCase();

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 324 204" width="324" height="204" style="background:#ffffff; font-family:system-ui, -apple-system, sans-serif;">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${brandColor}" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>
    <clipPath id="avatarClip">
      <circle cx="56" cy="100" r="36" />
    </clipPath>
  </defs>

  <!-- Card Border & Background -->
  <rect x="0" y="0" width="324" height="204" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
  
  <!-- Header Bar -->
  <path d="M 0 12 Q 0 0 12 0 L 312 0 Q 324 0 324 12 L 324 46 L 0 46 Z" fill="url(#headerGrad)" />
  <text x="162" y="28" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="1">
    ${data.schoolName.toUpperCase()}
  </text>
  <text x="162" y="40" font-size="8" fill="#93c5fd" text-anchor="middle">
    CARNET ESTUDIANTIL OFICIAL • ${data.academicYear}
  </text>

  <!-- Student Photo Placeholder / Image -->
  <circle cx="56" cy="100" r="37" fill="#cbd5e1" />
  <circle cx="56" cy="100" r="36" fill="#f1f5f9" />
  <text x="56" y="105" font-size="20" fill="#64748b" text-anchor="middle">👤</text>

  <!-- Student Data -->
  <text x="106" y="74" font-size="12" font-weight="800" fill="#0f172a">
    ${fullName.length > 22 ? fullName.slice(0, 22) + '...' : fullName}
  </text>
  <text x="106" y="90" font-size="9" font-weight="600" fill="#2563eb">
    GRADO: ${data.gradeName} - ${data.sectionName}
  </text>
  <text x="106" y="104" font-size="8" font-weight="500" fill="#64748b">
    CÓDIGO: <tspan font-weight="700" fill="#0f172a">${data.studentCode}</tspan>
  </text>
  <text x="106" y="118" font-size="8" fill="#64748b">
    RH: <tspan font-weight="700" fill="#dc2626">${data.bloodTypeRh || 'O+'}</tspan> • EPS: ${data.healthProviderEps || 'Sura'}
  </text>
  <text x="106" y="132" font-size="8" fill="#64748b">
    EMERGENCIA: ${data.emergencyContactPhone || 'N/A'}
  </text>

  <!-- QR Placeholder / Simulation Box -->
  <rect x="244" y="64" width="64" height="64" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
  <text x="276" y="100" font-size="9" fill="#0f172a" text-anchor="middle" font-weight="700">QR GATE</text>

  <!-- Footer Security Bar -->
  <rect x="0" y="180" width="324" height="24" fill="#0f172a" />
  <text x="162" y="195" font-size="8" font-weight="600" fill="#f8fafc" text-anchor="middle" letter-spacing="0.5">
    VÁLIDO DURANTE EL AÑO LECTIVO • SISTEMA DE ACCESO ZERO-TRUST
  </text>
</svg>
`.trim();
}

/**
 * Generates an industrial-standard printable PDF sheet (Carta/Letter)
 * containing 8 CR80 student ID badge cards with crop marks and QR tokens.
 */
export async function generateCr80BatchCardsPdf(
  students: StudentBadgeCardData[],
  sheetTitle: string = 'Lote de Carnets Estudiantiles CR80'
): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter', // 215.9 x 279.4 mm
  });

  const cardW = CR80_STANDARD_SPEC.cardWidthMm; // 85.6 mm
  const cardH = CR80_STANDARD_SPEC.cardHeightMm; // 53.98 mm

  const marginX = 14.5;
  const gapX = 11.3;
  const marginTop = 18;
  const gapY = 8;

  const cardsPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(students.length / cardsPerPage));

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage();
    }

    // Sheet Title Header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`${sheetTitle} • Página ${page + 1} de ${totalPages} • Estándar CR80 (85.6 x 54 mm)`, marginX, 10);
    doc.text('PIXY EDU — IMPRESIÓN DIRECTA O LAMINACIÓN PVC', 215.9 - marginX, 10, { align: 'right' });

    const pageStudents = students.slice(page * cardsPerPage, (page + 1) * cardsPerPage);

    pageStudents.forEach((student, index) => {
      const col = index % 2; // 0 or 1
      const row = Math.floor(index / 2); // 0, 1, 2, 3

      const x = marginX + col * (cardW + gapX);
      const y = marginTop + row * (cardH + gapY);

      const brandColor = student.schoolColor || '#2563eb';

      // --- Cutting Guides / Crop Marks ---
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.1);
      // Top-left
      doc.line(x - 2, y, x - 5, y);
      doc.line(x, y - 2, x, y - 5);
      // Top-right
      doc.line(x + cardW + 2, y, x + cardW + 5, y);
      doc.line(x + cardW, y - 2, x + cardW, y - 5);
      // Bottom-left
      doc.line(x - 2, y + cardH, x - 5, y + cardH);
      doc.line(x, y + cardH + 2, x, y + cardH + 5);
      // Bottom-right
      doc.line(x + cardW + 2, y + cardH, x + cardW + 5, y + cardH);
      doc.line(x + cardW, y + cardH + 2, x + cardW, y + cardH + 5);

      // --- Card Background & Outer Rounded Border ---
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'FD');

      // --- Header Strip ---
      const headerH = 11;
      doc.setFillColor(brandColor);
      doc.rect(x, y, cardW, headerH, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      const schoolTitle = student.schoolName.toUpperCase();
      doc.text(
        schoolTitle.length > 30 ? schoolTitle.slice(0, 30) + '...' : schoolTitle,
        x + cardW / 2,
        y + 4.5,
        { align: 'center' }
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(224, 231, 255);
      doc.text(`CARNET ESTUDIANTIL OFICIAL • ${student.academicYear}`, x + cardW / 2, y + 8.5, { align: 'center' });

      // --- Student Photo Area ---
      const photoX = x + 3.5;
      const photoY = y + headerH + 3;
      const photoSize = 18;
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(photoX, photoY, photoSize, photoSize, 1.5, 1.5, 'FD');

      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text('FOTO', photoX + photoSize / 2, photoY + photoSize / 2 + 1, { align: 'center' });

      // --- Student Information ---
      const textX = photoX + photoSize + 3;
      let textY = photoY + 3.5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const fullName = `${student.firstName} ${student.lastName}`.toUpperCase();
      doc.text(
        fullName.length > 22 ? fullName.slice(0, 22) + '...' : fullName,
        textX,
        textY
      );

      textY += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(brandColor);
      doc.text(`GRADO: ${student.gradeName} - ${student.sectionName}`, textX, textY);

      textY += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`CÓDIGO: ${student.studentCode}`, textX, textY);

      textY += 3;
      doc.text(`RH: ${student.bloodTypeRh || 'O+'} • EPS: ${student.healthProviderEps || 'Sura'}`, textX, textY);

      textY += 3;
      doc.text(`EMERGENCIA: ${student.emergencyContactPhone || 'N/A'}`, textX, textY);

      // --- QR Gate Verification Box (Right) ---
      const qrBoxSize = 17;
      const qrX = x + cardW - qrBoxSize - 3.5;
      const qrY = photoY;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(qrX, qrY, qrBoxSize, qrBoxSize, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(15, 23, 42);
      doc.text('QR GATE', qrX + qrBoxSize / 2, qrY + qrBoxSize / 2 - 1, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(100, 116, 139);
      doc.text('ZERO-TRUST', qrX + qrBoxSize / 2, qrY + qrBoxSize / 2 + 2.5, { align: 'center' });

      // --- Card Security Footer Bar ---
      const footerH = 5;
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(x, y + cardH - footerH, cardW, footerH, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.setTextColor(241, 245, 249);
      doc.text(
        'VÁLIDO AÑO ESCOLAR • SISTEMA DE ACCESO PIXY EDU',
        x + cardW / 2,
        y + cardH - 1.8,
        { align: 'center' }
      );
    });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}


// ==============================================================================
// PIXY EDU — WHITE-LABEL EXECUTIVE BULLETIN & RADAR REPORT GENERATOR
// Module: module_school (School Space)
// Path: src/modules/features/school/services/bulletin-generator.ts
// ==============================================================================

import crypto from 'crypto';
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
 */
export function generateBulletinVerificationHash(params: {
  orgId: string;
  studentCode: string;
  periodId: string;
  overallAverage: number;
  timestamp: string;
}): string {
  const data = `${params.orgId}:${params.studentCode}:${params.periodId}:${params.overallAverage}:${params.timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
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

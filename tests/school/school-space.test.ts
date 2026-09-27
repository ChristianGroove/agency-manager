// ==============================================================================
// PIXY EDU — SCHOOL SPACE AUTOMATED COMPREHENSIVE TEST SUITE
// Tests Decreto 1290 grading, Ley 115 observer, Ley 1620 convivencia, 
// Decreto 1421 PIAR, isomorphic SHA-256 (NIST), Wompi signature, 
// QR token crypto, tuition clearance, and Zod validation schemas.
// ==============================================================================

import { describe, it, expect } from 'vitest';
import {
  resolvePerformanceTier,
  calculateCourseWeightedScore,
  evaluateAbsenceThreshold,
  aggregateAreaEvaluations,
  calculateOverallAcademicAverage,
  DEFAULT_COLOMBIAN_GRADING_SCALE,
} from '@/modules/features/school/services/grading-calculator';
import {
  generateBulletinVerificationHash,
  buildRadarCompetencyData,
} from '@/modules/features/school/services/bulletin-generator';
import {
  buildStudentQrPayload,
  parseScannedQrPayload,
} from '@/modules/features/school/services/qr-credentials-generator';
import {
  sha256,
} from '@/modules/features/school/services/sha256';
import {
  formatColombianMobileNumber,
  generateWompiIntegritySignature,
  evaluateTuitionClearance,
} from '@/modules/features/school/services/tuition-billing-service';
import {
  SchoolGuardianSchema,
  SchoolObserverLogSchema,
  SchoolConvivenciaIncidentSchema,
  SchoolPiarPlanSchema,
  SchoolScheduleSchema,
  SchoolPeriodBulletinSchema,
} from '@/modules/features/school/schemas/school.schema';
import type {
  SchoolAssignment,
  SchoolGradeRecord,
  AreaFinalEvaluation,
  SchoolCourse,
  SchoolTuitionInvoice,
} from '@/modules/features/school/types/school.types';

describe('Pixy Edu — Zero-Dependency Isomorphic SHA-256 (FIPS 180-4 / NIST)', () => {
  it('hashes empty string matching NIST SHA-256 standard vector', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('hashes standard pangram matching NIST SHA-256 test vector', () => {
    const input = 'The quick brown fox jumps over the lazy dog';
    expect(sha256(input)).toBe('d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592');
  });

  it('hashes hello world correctly', () => {
    expect(sha256('hello world')).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('correctly hashes multi-byte UTF-8 Spanish text with accents and tildes', () => {
    const spanishText = 'Institución Educativa Británica — Bogotá, Colombia: Año Lectivo 2026 ñ á é í ó ú';
    const hash = sha256(spanishText);
    expect(hash).toHaveLength(64);
    // Must be deterministic
    expect(sha256(spanishText)).toBe(hash);
  });
});

describe('Pixy Edu — Colombian Decreto 1290 Grading Calculator', () => {
  it('resolves performance tiers accurately based on Colombian national scale', () => {
    expect(resolvePerformanceTier(5.0)).toBe('Superior');
    expect(resolvePerformanceTier(4.6)).toBe('Superior');
    expect(resolvePerformanceTier(4.5)).toBe('Alto');
    expect(resolvePerformanceTier(4.0)).toBe('Alto');
    expect(resolvePerformanceTier(3.8)).toBe('Básico');
    expect(resolvePerformanceTier(3.0)).toBe('Básico');
    expect(resolvePerformanceTier(2.9)).toBe('Bajo');
    expect(resolvePerformanceTier(1.0)).toBe('Bajo');
  });

  it('clamps scores outside the valid range [1.0, 5.0]', () => {
    expect(resolvePerformanceTier(5.5)).toBe('Superior');
    expect(resolvePerformanceTier(0.5)).toBe('Bajo');
  });

  it('calculates course weighted score correctly with multiple assignments', () => {
    const assignments: SchoolAssignment[] = [
      {
        id: 'a1',
        course_id: 'c1',
        period_id: 'p1',
        title: 'Taller 1',
        weight_percentage: 30,
        due_date: '2026-04-01',
        grading_type: 'numeric',
        created_by_teacher_id: 't1',
        organization_id: 'org1',
      },
      {
        id: 'a2',
        course_id: 'c1',
        period_id: 'p1',
        title: 'Evaluación Parcial',
        weight_percentage: 40,
        due_date: '2026-04-15',
        grading_type: 'numeric',
        created_by_teacher_id: 't1',
        organization_id: 'org1',
      },
      {
        id: 'a3',
        course_id: 'c1',
        period_id: 'p1',
        title: 'Proyecto Final',
        weight_percentage: 30,
        due_date: '2026-05-01',
        grading_type: 'numeric',
        created_by_teacher_id: 't1',
        organization_id: 'org1',
      },
    ];

    const grades: SchoolGradeRecord[] = [
      {
        id: 'g1',
        assignment_id: 'a1',
        enrollment_id: 'e1',
        score: 4.5,
        graded_by_teacher_id: 't1',
        organization_id: 'org1',
      },
      {
        id: 'g2',
        assignment_id: 'a2',
        enrollment_id: 'e1',
        score: 4.0,
        graded_by_teacher_id: 't1',
        organization_id: 'org1',
      },
      {
        id: 'g3',
        assignment_id: 'a3',
        enrollment_id: 'e1',
        score: 5.0,
        graded_by_teacher_id: 't1',
        organization_id: 'org1',
      },
    ];

    // 4.5*30 + 4.0*40 + 5.0*30 = 135 + 160 + 150 = 445 / 100 = 4.45
    const result = calculateCourseWeightedScore(assignments, grades);
    expect(result.score).toBe(4.45);
    expect(result.completedWeight).toBe(100);
  });

  it('properly excludes excused grades from weighted score calculation', () => {
    const assignments: SchoolAssignment[] = [
      {
        id: 'a1',
        course_id: 'c1',
        period_id: 'p1',
        title: 'Quiz 1',
        weight_percentage: 50,
        due_date: '2026-04-01',
        grading_type: 'numeric',
        created_by_teacher_id: 't1',
        organization_id: 'org1',
      },
      {
        id: 'a2',
        course_id: 'c1',
        period_id: 'p1',
        title: 'Quiz 2 (Excused due to illness)',
        weight_percentage: 50,
        due_date: '2026-04-15',
        grading_type: 'numeric',
        created_by_teacher_id: 't1',
        organization_id: 'org1',
      },
    ];

    const grades: SchoolGradeRecord[] = [
      {
        id: 'g1',
        assignment_id: 'a1',
        enrollment_id: 'e1',
        score: 4.8,
        graded_by_teacher_id: 't1',
        organization_id: 'org1',
      },
      {
        id: 'g2',
        assignment_id: 'a2',
        enrollment_id: 'e1',
        score: 1.0,
        is_excused: true,
        graded_by_teacher_id: 't1',
        organization_id: 'org1',
      },
    ];

    const result = calculateCourseWeightedScore(assignments, grades);
    // Only a1 is evaluated (weight 50, normalized to 4.8)
    expect(result.score).toBe(4.8);
    expect(result.completedWeight).toBe(50);
  });

  it('evaluates student absence thresholds under institutional policy', () => {
    // 40 hours total course, 10 absences = 25% (failing threshold at 20%)
    const evaluation = evaluateAbsenceThreshold(10, 40, 20);
    expect(evaluation.absenceRatePercentage).toBe(25);
    expect(evaluation.isFailingByAbsence).toBe(true);

    // 40 hours total course, 4 absences = 10%
    const evaluationPass = evaluateAbsenceThreshold(4, 40, 20);
    expect(evaluationPass.absenceRatePercentage).toBe(10);
    expect(evaluationPass.isFailingByAbsence).toBe(false);
  });

  it('aggregates multiple courses into Colombian Academic Areas with area_weight_percentage', () => {
    const courseMath: SchoolCourse = {
      id: 'c-math',
      organization_id: 'org1',
      section_id: 'sec1',
      area_id: 'area-math',
      subject_name: 'Álgebra y Trigonometría',
      lead_teacher_id: 't1',
      weekly_hours: 4,
      area_weight_percentage: 60,
      area: { id: 'area-math', organization_id: 'org1', name: 'Matemáticas y Geometría' } as any,
    };

    const courseGeometry: SchoolCourse = {
      id: 'c-geom',
      organization_id: 'org1',
      section_id: 'sec1',
      area_id: 'area-math',
      subject_name: 'Geometría Analítica',
      lead_teacher_id: 't1',
      weekly_hours: 2,
      area_weight_percentage: 40,
      area: { id: 'area-math', organization_id: 'org1', name: 'Matemáticas y Geometría' } as any,
    };

    const courseScience: SchoolCourse = {
      id: 'c-sci',
      organization_id: 'org1',
      section_id: 'sec1',
      area_id: 'area-sci',
      subject_name: 'Física Clásica',
      lead_teacher_id: 't2',
      weekly_hours: 4,
      area_weight_percentage: 100,
      area: { id: 'area-sci', organization_id: 'org1', name: 'Ciencias Naturales' } as any,
    };

    const coursesWithEvaluations = [
      { course: courseMath, numericScore: 4.0, absencesCount: 0, totalClasses: 40, teacherName: 'Prof. Alberto' },
      { course: courseGeometry, numericScore: 5.0, absencesCount: 0, totalClasses: 20, teacherName: 'Prof. Alberto' },
      { course: courseScience, numericScore: 4.5, absencesCount: 15, totalClasses: 40, teacherName: 'Prof. Claudia' }, // 15/40 = 37.5% absences -> failing by absence
    ];

    const areas = aggregateAreaEvaluations(coursesWithEvaluations);
    expect(areas).toHaveLength(2);

    const mathArea = areas.find((a) => a.areaId === 'area-math')!;
    expect(mathArea).toBeDefined();
    // 4.0 * 0.60 + 5.0 * 0.40 = 2.40 + 2.00 = 4.40
    expect(mathArea.areaAverageScore).toBe(4.4);
    expect(mathArea.areaPerformanceTier).toBe('Alto');

    const sciArea = areas.find((a) => a.areaId === 'area-sci')!;
    expect(sciArea).toBeDefined();
    // Subject has 37.5% absences -> forced to 'Bajo'
    expect(sciArea.subjects[0].isFailingByAbsence).toBe(true);
    expect(sciArea.subjects[0].performanceTier).toBe('Bajo');

    const overall = calculateOverallAcademicAverage(areas);
    // (4.4 + 4.5) / 2 = 4.45
    expect(overall.overallAverage).toBe(4.45);
    expect(overall.generalTier).toBe('Alto');
  });
});

describe('Pixy Edu — Bulletin Verification & Radar Normalization', () => {
  it('generates a 64-char standard SHA-256 tamper-proof verification hash', () => {
    const hash1 = generateBulletinVerificationHash({
      orgId: 'org-test-123',
      studentCode: '2026-0042',
      periodId: 'per-1',
      overallAverage: 4.65,
      timestamp: '2026-09-26T12:00:00Z',
    });

    const hash2 = generateBulletinVerificationHash({
      orgId: 'org-test-123',
      studentCode: '2026-0042',
      periodId: 'per-1',
      overallAverage: 4.65,
      timestamp: '2026-09-26T12:00:00Z',
    });

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);

    // Verify it matches sha256 output directly
    const directSha = sha256('org-test-123:2026-0042:per-1:4.65:2026-09-26T12:00:00Z');
    expect(hash1).toBe(directSha);

    // Different student must produce different hash
    const hashDiff = generateBulletinVerificationHash({
      orgId: 'org-test-123',
      studentCode: '2026-0099',
      periodId: 'per-1',
      overallAverage: 4.65,
      timestamp: '2026-09-26T12:00:00Z',
    });
    expect(hash1).not.toBe(hashDiff);
  });

  it('normalizes academic area scores to 0-100 radar competencies', () => {
    const areas: AreaFinalEvaluation[] = [
      {
        areaId: 'a1',
        areaName: 'Matemáticas',
        areaAverageScore: 5.0, // Should be 100
        areaPerformanceTier: 'Superior',
        subjects: [],
      },
      {
        areaId: 'a2',
        areaName: 'Ciencias',
        areaAverageScore: 3.0, // (3.0 - 1.0) / 4.0 * 100 = 50%
        areaPerformanceTier: 'Básico',
        subjects: [],
      },
      {
        areaId: 'a3',
        areaName: 'Humanidades',
        areaAverageScore: 1.0, // (1.0 - 1.0) / 4.0 * 100 = 0%
        areaPerformanceTier: 'Bajo',
        subjects: [],
      },
    ];

    const radar = buildRadarCompetencyData(areas);
    expect(radar['Matemáticas']).toBe(100);
    expect(radar['Ciencias']).toBe(50);
    expect(radar['Humanidades']).toBe(0);
  });
});

describe('Pixy Edu — Tuition Billing & Wompi Gateway Service', () => {
  it('formats Colombian mobile phone numbers to E.164 format without +', () => {
    expect(formatColombianMobileNumber('3105551234')).toBe('573105551234');
    expect(formatColombianMobileNumber('+57 (310) 555-1234')).toBe('573105551234');
    expect(formatColombianMobileNumber('573105551234')).toBe('573105551234');
  });

  it('generates SHA-256 HMAC integrity signature for Wompi checkout', () => {
    const ref = 'INV-2026-09-001';
    const amountInCents = 68000000; // $680,000 COP
    const currency = 'COP';
    const secret = 'prod_integrity_secret_test_xyz';

    const signature = generateWompiIntegritySignature(ref, amountInCents, currency, secret);
    expect(signature).toHaveLength(64);

    const expectedHash = sha256(`${ref}${amountInCents}${currency}${secret}`);
    expect(signature).toBe(expectedHash);
  });

  it('evaluates student tuition clearance accurately for report card locking', () => {
    const paidInvoices: SchoolTuitionInvoice[] = [
      {
        id: 'inv1',
        organization_id: 'org1',
        enrollment_id: 'enr1',
        concept: 'Pensión Agosto 2026',
        period_month: '2026-08',
        amount: 650000,
        late_fee_amount: 0,
        due_date: '2026-08-05',
        status: 'paid',
      },
    ];

    const clearedEval = evaluateTuitionClearance(paidInvoices);
    expect(clearedEval.isCleared).toBe(true);
    expect(clearedEval.totalDebtAmount).toBe(0);
    expect(clearedEval.overdueCount).toBe(0);

    const debtInvoices: SchoolTuitionInvoice[] = [
      ...paidInvoices,
      {
        id: 'inv2',
        organization_id: 'org1',
        enrollment_id: 'enr1',
        concept: 'Pensión Septiembre 2026',
        period_month: '2026-09',
        amount: 650000,
        late_fee_amount: 35000,
        due_date: '2026-09-05',
        status: 'late',
      },
    ];

    const debtEval = evaluateTuitionClearance(debtInvoices);
    expect(debtEval.isCleared).toBe(false);
    expect(debtEval.totalDebtAmount).toBe(685000);
    expect(debtEval.overdueCount).toBe(1);
  });
});

describe('Pixy Edu — QR Credentials Encoder & Scanner Decoder', () => {
  it('encodes and safely decodes QR payloads', () => {
    const original = {
      orgId: 'org-british-school',
      enrollmentId: 'enr-9941',
      qrAccessToken: 'f3a9b1c2d3e4f5061728394a5b6c7d8e',
      studentCode: '2026-001',
    };

    const qrToken = buildStudentQrPayload(original);
    expect(qrToken.startsWith('PIXY:EDU:')).toBe(true);

    const parsed = parseScannedQrPayload(qrToken);
    expect(parsed.isValid).toBe(true);
    expect(parsed.enrollmentId).toBe(original.enrollmentId);
    expect(parsed.token).toBe(original.qrAccessToken);
    expect(parsed.code).toBe(original.studentCode);
  });

  it('handles corrupted QR tokens without throwing unhandled exceptions', () => {
    const parsed = parseScannedQrPayload('PIXY:EDU:corrupted-base64-content!@#$');
    expect(parsed.isValid).toBe(false);
    expect(parsed.error).toBeDefined();

    const notPixy = parseScannedQrPayload('https://random-url.com');
    expect(notPixy.isValid).toBe(false);
  });
});

describe('Pixy Edu — Zod Schemas Validation (Colombian Regulations)', () => {
  it('validates SchoolGuardianSchema with multi-acudiente & DIAN responsibility', () => {
    const validGuardian = {
      student_id: 'e86b36a1-3ef5-49c0-99e2-63b784a96112',
      relationship: 'mother',
      first_name: 'Diana',
      last_name: 'Castro Morales',
      document_type: 'CC',
      document_number: '52890123',
      phone: '+573105551234',
      email: 'diana.castro@correo.com',
      is_primary_contact: true,
      is_financial_responsible: true,
    };

    const parsed = SchoolGuardianSchema.safeParse(validGuardian);
    expect(parsed.success).toBe(true);

    const invalidGuardian = {
      ...validGuardian,
      relationship: 'invalid_role',
    };
    expect(SchoolGuardianSchema.safeParse(invalidGuardian).success).toBe(false);
  });

  it('validates SchoolObserverLogSchema under Ley 115 requirements', () => {
    const validLog = {
      enrollment_id: 'e86b36a1-3ef5-49c0-99e2-63b784a96112',
      log_type: 'formative',
      title: 'Compromiso de puntualidad matutina',
      description: 'Llegada tarde reiterada en el primer bloque',
      student_commitment: 'Saldrá 15 minutos más temprano',
      is_resolved: false,
    };

    const parsed = SchoolObserverLogSchema.safeParse(validLog);
    expect(parsed.success).toBe(true);

    const missingTitle = {
      ...validLog,
      title: '',
    };
    expect(SchoolObserverLogSchema.safeParse(missingTitle).success).toBe(false);
  });

  it('validates SchoolConvivenciaIncidentSchema under Ley 1620 (Tipos I, II, III)', () => {
    const validIncident = {
      incident_type: 'tipo_2',
      title: 'Acoso cibernético en grupo escolar',
      description: 'Mensajes descalificatorios evidenciados en capturas de pantalla',
      date_occurred: new Date().toISOString(),
      involved_students: [{ enrollment_id: 'e86b36a1-3ef5-49c0-99e2-63b784a96112', role: 'victima' }],
    };

    const parsed = SchoolConvivenciaIncidentSchema.safeParse(validIncident);
    expect(parsed.success).toBe(true);

    const invalidType = {
      ...validIncident,
      incident_type: 'tipo_4', // Not allowed
    };
    expect(SchoolConvivenciaIncidentSchema.safeParse(invalidType).success).toBe(false);
  });

  it('validates SchoolPiarPlanSchema under Decreto 1421 de 2017', () => {
    const validPiar = {
      enrollment_id: 'e86b36a1-3ef5-49c0-99e2-63b784a96112',
      academic_year_id: '7b7b13a1-3ef5-49c0-99e2-63b784a96777',
      medical_diagnosis: 'TDAH subtipo inatento diagnosticado por neuropediatría',
      diagnosed_barriers: [
        {
          barrier_type: 'pedagogica',
          description: 'Atención en evaluaciones escritas de más de 30 minutos',
        },
      ],
      curricular_adaptations: [
        {
          course_id: 'e86b36a1-3ef5-49c0-99e2-63b784a96112',
          subject_name: 'Matemáticas',
          learning_objectives_adapted: 'Comprender operaciones básicas fraccionarias',
          methodology_adjustments: 'Uso de material concreto y software interactivo',
          evaluation_adjustments: 'Evaluaciones orales o fragmentadas en bloques de 20 minutos',
          reasonable_accommodations: ['Tiempo adicional del 50%'],
        },
      ],
      pedagogical_goals: [
        {
          period_number: 1,
          goal: 'Completar guías con apoyo visual sin penalización por tiempo',
          status: 'pending',
        },
      ],
      review_period: 'trimestral',
      status: 'active',
    };

    const parsed = SchoolPiarPlanSchema.safeParse(validPiar);
    expect(parsed.success).toBe(true);
  });

  it('validates SchoolScheduleSchema weekly blocks', () => {
    const validSchedule = {
      course_id: 'e86b36a1-3ef5-49c0-99e2-63b784a96112',
      day_of_week: 2, // Martes
      block_start_time: '07:00',
      block_end_time: '08:30',
      block_number: 1,
      classroom_location: 'Aula 201',
      recurrence: 'weekly',
    };

    const parsed = SchoolScheduleSchema.safeParse(validSchedule);
    expect(parsed.success).toBe(true);

    const invalidDay = {
      ...validSchedule,
      day_of_week: 8, // Out of bounds
    };
    expect(SchoolScheduleSchema.safeParse(invalidDay).success).toBe(false);
  });

  it('validates SchoolPeriodBulletinSchema with SHA-256 verification hash', () => {
    const validBulletin = {
      enrollment_id: 'e86b36a1-3ef5-49c0-99e2-63b784a96112',
      period_id: '7b7b13a1-3ef5-49c0-99e2-63b784a96777',
      overall_average: 4.45,
      cohort_ranking: 3,
      general_performance_tier: 'Alto',
      radar_competency_data: { Matemáticas: 85, Ciencias: 90 },
      total_absences: 2,
      homeroom_teacher_comment: 'Excelente compromiso formativo y rendimiento académico sostenido.',
      is_cleared_for_download: true,
      verification_sha256: 'd7a8fbb307d7809469ca9abced0006e0e9b252329329b3ffecf2a242a3804ec6',
    };

    const parsed = SchoolPeriodBulletinSchema.safeParse(validBulletin);
    expect(parsed.success).toBe(true);

    // Invalid SHA-256 hash length (must be 64 characters)
    const invalidHash = {
      ...validBulletin,
      verification_sha256: 'too-short-hash',
    };
    expect(SchoolPeriodBulletinSchema.safeParse(invalidHash).success).toBe(false);

    // Invalid score out of bounds
    const invalidScore = {
      ...validBulletin,
      overall_average: 5.5,
    };
    expect(SchoolPeriodBulletinSchema.safeParse(invalidScore).success).toBe(false);
  });
});

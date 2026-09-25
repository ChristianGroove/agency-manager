// ==============================================================================
// PIXY EDU — COLOMBIAN DECRETO 1290 GRADING & PERFORMANCE CALCULATOR
// Module: module_school (School Space)
// Path: src/modules/features/school/services/grading-calculator.ts
// ==============================================================================

import type {
  ColombianPerformanceTier,
  SchoolGradingScaleConfig,
  AreaFinalEvaluation,
  SubjectFinalEvaluation,
  SchoolAssignment,
  SchoolGradeRecord,
  SchoolCourse,
} from '../types/school.types';

export const DEFAULT_COLOMBIAN_GRADING_SCALE: SchoolGradingScaleConfig = {
  min: 1.0,
  max: 5.0,
  passing: 3.0,
  tiers: [
    { label: 'Superior', min: 4.6, max: 5.0, color: '#10b981' },
    { label: 'Alto', min: 4.0, max: 4.59, color: '#3b82f6' },
    { label: 'Básico', min: 3.0, max: 3.99, color: '#f59e0b' },
    { label: 'Bajo', min: 1.0, max: 2.99, color: '#ef4444' },
  ],
};

/**
 * Resolves the official Colombian qualitative performance tier (Decreto 1290)
 * based on a numeric score and scale configuration.
 */
export function resolvePerformanceTier(
  score: number,
  scale: SchoolGradingScaleConfig = DEFAULT_COLOMBIAN_GRADING_SCALE
): ColombianPerformanceTier {
  const normalized = Math.min(Math.max(score, scale.min), scale.max);

  for (const tier of scale.tiers) {
    if (normalized >= tier.min && normalized <= tier.max + 0.009) {
      return tier.label;
    }
  }

  return normalized >= scale.passing ? 'Básico' : 'Bajo';
}

/**
 * Calculates the weighted average numeric score for a subject course based on
 * its assignments and the student's grade records.
 */
export function calculateCourseWeightedScore(
  assignments: SchoolAssignment[],
  grades: SchoolGradeRecord[]
): { score: number; completedWeight: number } {
  if (!assignments || assignments.length === 0) {
    return { score: 0, completedWeight: 0 };
  }

  const gradeMap = new Map<string, SchoolGradeRecord>();
  grades.forEach((g) => gradeMap.set(g.assignment_id, g));

  let totalWeightedScore = 0;
  let totalEvaluatedWeight = 0;

  for (const assignment of assignments) {
    const grade = gradeMap.get(assignment.id);
    if (!grade || grade.is_excused) {
      continue;
    }

    if (grade.score !== undefined && grade.score !== null) {
      totalWeightedScore += grade.score * (assignment.weight_percentage / 100);
      totalEvaluatedWeight += assignment.weight_percentage;
    }
  }

  if (totalEvaluatedWeight === 0) {
    return { score: 0, completedWeight: 0 };
  }

  // Normalize score if some activities have not occurred yet
  const normalizedScore = (totalWeightedScore / totalEvaluatedWeight) * (totalEvaluatedWeight > 0 ? 1 : 0);
  const rounded = Math.round(normalizedScore * 100) / 100;

  return {
    score: rounded,
    completedWeight: totalEvaluatedWeight,
  };
}

/**
 * Evaluates absence rate against legal SIEE / Decreto 1290 threshold.
 * Under standard Colombian school regulations, missing 25% or more of classes
 * results in automatic subject failure regardless of numeric grades.
 */
export function evaluateAbsenceThreshold(
  absencesCount: number,
  totalScheduledClasses: number,
  legalMaxThresholdPercentage: number = 25.0
): { absenceRatePercentage: number; isFailingByAbsence: boolean } {
  if (totalScheduledClasses <= 0) {
    return { absenceRatePercentage: 0, isFailingByAbsence: false };
  }

  const rate = Math.round((absencesCount / totalScheduledClasses) * 10000) / 100;
  const isFailing = rate >= legalMaxThresholdPercentage;

  return {
    absenceRatePercentage: rate,
    isFailingByAbsence: isFailing,
  };
}

/**
 * Aggregates courses into Academic Areas according to Colombian Ley 115 / Decreto 1290,
 * weighting each child subject according to its `area_weight_percentage`.
 */
export function aggregateAreaEvaluations(
  coursesWithEvaluations: Array<{
    course: SchoolCourse;
    numericScore: number;
    absencesCount: number;
    totalClasses: number;
    teacherName: string;
  }>,
  scale: SchoolGradingScaleConfig = DEFAULT_COLOMBIAN_GRADING_SCALE
): AreaFinalEvaluation[] {
  const areaGroups = new Map<
    string,
    {
      areaId: string;
      areaName: string;
      subjects: SubjectFinalEvaluation[];
      totalWeightedScore: number;
      totalWeight: number;
    }
  >();

  for (const item of coursesWithEvaluations) {
    const areaId = item.course.area_id || 'unassigned';
    const areaName = item.course.area?.name || item.course.subject_name;

    const absenceEval = evaluateAbsenceThreshold(item.absencesCount, item.totalClasses);
    let subjectTier = resolvePerformanceTier(item.numericScore, scale);

    // If failing by absence, tier is forced to 'Bajo' per Colombian SIEE law
    if (absenceEval.isFailingByAbsence && subjectTier !== 'Bajo') {
      subjectTier = 'Bajo';
    }

    const subjectEval: SubjectFinalEvaluation = {
      courseId: item.course.id,
      subjectName: item.course.subject_name,
      areaId,
      areaName,
      weeklyHours: item.course.weekly_hours,
      numericScore: item.numericScore,
      performanceTier: subjectTier,
      absencesCount: item.absencesCount,
      absenceRatePercentage: absenceEval.absenceRatePercentage,
      isFailingByAbsence: absenceEval.isFailingByAbsence,
      teacherName: item.teacherName,
    };

    if (!areaGroups.has(areaId)) {
      areaGroups.set(areaId, {
        areaId,
        areaName,
        subjects: [],
        totalWeightedScore: 0,
        totalWeight: 0,
      });
    }

    const group = areaGroups.get(areaId)!;
    group.subjects.push(subjectEval);

    const weight = item.course.area_weight_percentage || 100;
    group.totalWeightedScore += item.numericScore * (weight / 100);
    group.totalWeight += weight;
  }

  const results: AreaFinalEvaluation[] = [];

  areaGroups.forEach((group) => {
    const rawAverage = group.totalWeight > 0 ? (group.totalWeightedScore / (group.totalWeight / 100)) : 0;
    const areaScore = Math.round(rawAverage * 100) / 100;
    const areaTier = resolvePerformanceTier(areaScore, scale);

    results.push({
      areaId: group.areaId,
      areaName: group.areaName,
      areaAverageScore: areaScore,
      areaPerformanceTier: areaTier,
      subjects: group.subjects,
    });
  });

  return results;
}

/**
 * Calculates the overall period average from evaluated areas.
 */
export function calculateOverallAcademicAverage(
  areas: AreaFinalEvaluation[],
  scale: SchoolGradingScaleConfig = DEFAULT_COLOMBIAN_GRADING_SCALE
): { overallAverage: number; generalTier: ColombianPerformanceTier } {
  if (!areas || areas.length === 0) {
    return { overallAverage: 0, generalTier: 'Bajo' };
  }

  const sum = areas.reduce((acc, curr) => acc + curr.areaAverageScore, 0);
  const avg = Math.round((sum / areas.length) * 100) / 100;

  return {
    overallAverage: avg,
    generalTier: resolvePerformanceTier(avg, scale),
  };
}

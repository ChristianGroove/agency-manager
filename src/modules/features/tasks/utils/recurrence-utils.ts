import type { RecurrenceInterval } from "../types";
import { addDays, addMonths, addYears, setDate } from "date-fns";

/**
 * Calculates the next recurrence date based on the interval, preferred day, and optional recurrence days
 * (e.g., [1, 2, 3, 4, 5] for Mon-Fri, [1, 3] for Mon & Wed)
 */
export function calculateNextRecurrence(
  interval: RecurrenceInterval,
  from: Date = new Date(),
  dayOfMonth: number = 1,
  recurrenceDays?: number[] | null
): Date {
  const base = new Date(from);

  // If specific recurrence days are provided (ISO 8601: 1=Mon, 2=Tue, ..., 7=Sun)
  if (recurrenceDays && Array.isArray(recurrenceDays) && recurrenceDays.length > 0) {
    const validDays = recurrenceDays
      .map(Number)
      .filter((d) => d >= 1 && d <= 7);

    if (validDays.length > 0) {
      const sortedDays = Array.from(new Set(validDays)).sort((a, b) => a - b);
      const jsDay = base.getDay();
      const currentIsoDay = jsDay === 0 ? 7 : jsDay;

      // Find the next day in the list strictly after current day
      const nextDay = sortedDays.find((d) => d > currentIsoDay);
      if (nextDay !== undefined) {
        return addDays(base, nextDay - currentIsoDay);
      }

      // Otherwise wrap around to the first day in the next cycle
      const firstDayNextWeek = sortedDays[0];
      const daysUntilNextWeek = 7 - currentIsoDay + firstDayNextWeek;
      return addDays(base, daysUntilNextWeek);
    }
  }

  switch (interval) {
    case "daily":
      return addDays(base, 1);
    case "weekly":
      return addDays(base, 7);
    case "biweekly":
      return addDays(base, 14);
    case "monthly": {
      const nextM = addMonths(base, 1);
      const safeDay = Math.min(Math.max(1, dayOfMonth || 1), 28);
      return setDate(nextM, safeDay);
    }
    case "quarterly": {
      const nextQ = addMonths(base, 3);
      const safeDay = Math.min(Math.max(1, dayOfMonth || 1), 28);
      return setDate(nextQ, safeDay);
    }
    case "biannual": {
      const nextB = addMonths(base, 6);
      const safeDay = Math.min(Math.max(1, dayOfMonth || 1), 28);
      return setDate(nextB, safeDay);
    }
    case "yearly":
      return addYears(base, 1);
    default:
      return addMonths(base, 1);
  }
}

export const ISO_DAY_NAMES: Record<number, { short: string; label: string }> = {
  1: { short: "Lun", label: "Lunes" },
  2: { short: "Mar", label: "Martes" },
  3: { short: "Mié", label: "Miércoles" },
  4: { short: "Jue", label: "Jueves" },
  5: { short: "Vie", label: "Viernes" },
  6: { short: "Sáb", label: "Sábado" },
  7: { short: "Dom", label: "Domingo" },
};

/**
 * Returns a human-friendly representation of recurrence schedule
 */
export function formatRecurrenceLabel(
  interval?: RecurrenceInterval | null,
  recurrenceDays?: number[] | null
): string {
  if (!interval) return "No recurrente";

  if (recurrenceDays && Array.isArray(recurrenceDays) && recurrenceDays.length > 0) {
    const valid = recurrenceDays.map(Number).filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
    if (valid.length === 5 && [1, 2, 3, 4, 5].every((d) => valid.includes(d))) {
      return "Días hábiles (Lun - Vie)";
    }
    const dayLabels = valid.map((d) => ISO_DAY_NAMES[d]?.short || `Día ${d}`).join(", ");
    return `Semanal (${dayLabels})`;
  }

  const map: Record<RecurrenceInterval, string> = {
    daily: "Diaria (Cada día)",
    weekly: "Semanal (Cada semana)",
    biweekly: "Quincenal (Cada 15 días)",
    monthly: "Mensual (Cada mes)",
    quarterly: "Trimestral (Cada 3 meses)",
    biannual: "Semestral (Cada 6 meses)",
    yearly: "Anual (Cada año)",
  };

  return map[interval] || "Recurrente";
}

export const RECURRENCE_SHORT_MAP: Record<RecurrenceInterval, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  biannual: "Semestral",
  yearly: "Anual",
};

/**
 * Returns formatted modality and recurrence badge label (e.g. "Reunión Virtual - Semanal")
 */
export function getMeetingModalityBadgeLabel(task: {
  meeting_modality?: string | null;
  recurrence_interval?: RecurrenceInterval | null;
  is_recurring?: boolean | null;
}): string {
  const modality =
    task.meeting_modality === "in_person"
      ? "Reunión Presencial"
      : task.meeting_modality === "hybrid"
      ? "Reunión Híbrida"
      : "Reunión Virtual";

  if (task.recurrence_interval && RECURRENCE_SHORT_MAP[task.recurrence_interval]) {
    return `${modality} - ${RECURRENCE_SHORT_MAP[task.recurrence_interval]}`;
  }

  if (task.is_recurring) {
    return `${modality} - Semanal`;
  }

  return modality;
}


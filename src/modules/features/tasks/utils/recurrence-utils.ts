import type { RecurrenceInterval } from "../types";
import { addDays, addMonths, addYears, setDate } from "date-fns";

/**
 * Calculates the next recurrence date based on the interval and preferred day
 */
export function calculateNextRecurrence(
  interval: RecurrenceInterval,
  from: Date = new Date(),
  dayOfMonth: number = 1
): Date {
  const base = new Date(from);
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

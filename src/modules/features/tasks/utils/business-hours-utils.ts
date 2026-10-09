import type { TaskItem } from "../types";

/**
 * Informacion resumida sobre el estado de estancamiento de una tarea.
 */
export interface TaskStalledInfo {
  isStalled: boolean;
  businessHours: number;
  formattedTime: string;
}

/**
 * Calcula las horas habiles transcurridas entre dos marcas de tiempo (descontando sabados y domingos).
 * Cada dia habil (lunes a viernes) contabiliza hasta 24 horas continuas de actividad operativa.
 *
 * @param startDate Fecha inicial (Date, string ISO o timestamp numerico en ms)
 * @param endDate Fecha final (Date, string ISO o timestamp numerico en ms, por defecto fecha actual)
 * @returns Horas habiles transcurridas con precision decimal
 */
export function calculateBusinessHours(
  startDate: Date | string | number,
  endDate: Date | string | number = new Date()
): number {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMs = start.getTime();
  const endMs = end.getTime();

  if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
    return 0;
  }

  let totalMs = 0;
  let current = new Date(startMs);

  while (current.getTime() < endMs) {
    const dayOfWeek = current.getDay(); // 0 = Domingo, 6 = Sabado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Medianoche del dia calendario siguiente (00:00:00.000)
    let nextMidnight = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + 1,
      0,
      0,
      0,
      0
    );

    // Salvaguarda absoluta contra anomalías de huso horario
    if (nextMidnight.getTime() <= current.getTime()) {
      nextMidnight = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }

    const sliceEndMs = Math.min(nextMidnight.getTime(), endMs);

    if (!isWeekend) {
      totalMs += sliceEndMs - current.getTime();
    }

    current = nextMidnight;
  }

  return totalMs / (1000 * 60 * 60);
}

/**
 * Formatea horas habiles en una representacion legible en espanol.
 * Ejemplos: "2d 4h habiles", "3d habiles", "5h habiles", "< 1h habiles".
 *
 * @param hours Cantidad de horas habiles transcurridas
 * @returns Cadena formateada en espanol
 */
export function formatBusinessHours(hours: number): string {
  if (isNaN(hours) || hours <= 0) {
    return "0h habiles";
  }

  if (hours < 1) {
    return "< 1h habiles";
  }

  const totalHours = Math.floor(hours);
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;

  if (days === 0) {
    return `${remainingHours}h habiles`;
  }

  if (remainingHours === 0) {
    return `${days}d habiles`;
  }

  return `${days}d ${remainingHours}h habiles`;
}

/**
 * Determina si una tarea se encuentra estancada segun los criterios operativos:
 * - Estado activo: in_progress, in_review o blocked.
 * - Excluye tipo reunion (meeting).
 * - Excluye tareas finalizadas, por hacer o en backlog (done, todo, backlog).
 * - Horas habiles transcurridas desde updated_at (o created_at) superiores al umbral (por defecto 48h).
 *
 * @param task Tarea o subconjunto de propiedades requeridas
 * @param now Fecha de referencia para el calculo (por defecto fecha actual)
 * @param thresholdHours Umbral de horas habiles de inactividad (por defecto 48)
 * @returns true si la tarea esta estancada, false en caso contrario
 */
export function isTaskStalled(
  task: Pick<TaskItem, "status" | "type" | "updated_at" | "created_at"> | null | undefined,
  now: Date = new Date(),
  thresholdHours: number = 48
): boolean {
  if (!task) return false;

  // Excluir reuniones sincronizadas
  if (task.type === "meeting") return false;

  // Excluir tareas terminadas, por hacer o en backlog
  if (task.status === "done" || task.status === "todo" || task.status === "backlog") {
    return false;
  }

  // Estado activo requerido
  const activeStatuses = ["in_progress", "in_review", "blocked"];
  if (!activeStatuses.includes(task.status)) {
    return false;
  }

  const referenceDate = task.updated_at || task.created_at;
  if (!referenceDate) return false;

  const safeThreshold =
    typeof thresholdHours === "number" && !isNaN(thresholdHours) && thresholdHours > 0
      ? thresholdHours
      : 48;

  const businessHours = calculateBusinessHours(referenceDate, now);
  return businessHours > safeThreshold;
}

/**
 * Obtiene la informacion completa de estancamiento para visualizacion en UI.
 *
 * @param task Tarea a evaluar
 * @param now Fecha de referencia
 * @param thresholdHours Umbral en horas habiles (por defecto 48)
 * @returns Objeto con isStalled, businessHours y formattedTime
 */
export function getTaskStalledInfo(
  task: Pick<TaskItem, "status" | "type" | "updated_at" | "created_at"> | null | undefined,
  now: Date = new Date(),
  thresholdHours: number = 48
): TaskStalledInfo {
  if (!task) {
    return { isStalled: false, businessHours: 0, formattedTime: "0h habiles" };
  }

  const safeThreshold =
    typeof thresholdHours === "number" && !isNaN(thresholdHours) && thresholdHours > 0
      ? thresholdHours
      : 48;

  const referenceDate = task.updated_at || task.created_at;
  const businessHours = referenceDate ? calculateBusinessHours(referenceDate, now) : 0;
  const isStalled = isTaskStalled(task, now, safeThreshold);
  const formattedTime = formatBusinessHours(businessHours);

  return {
    isStalled,
    businessHours,
    formattedTime,
  };
}

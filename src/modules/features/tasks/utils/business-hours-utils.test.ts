import { describe, expect, it } from "vitest";
import {
  calculateBusinessHours,
  formatBusinessHours,
  isTaskStalled,
  getTaskStalledInfo,
} from "./business-hours-utils";
import type { TaskItem } from "../types";

describe("calculateBusinessHours", () => {
  it("retorna 0 para fechas iguales o cuando la fecha inicial es posterior a la final", () => {
    const fecha = new Date(2026, 9, 5, 10, 0, 0); // Lunes 10:00
    expect(calculateBusinessHours(fecha, fecha)).toBe(0);

    const posterior = new Date(2026, 9, 5, 12, 0, 0);
    expect(calculateBusinessHours(posterior, fecha)).toBe(0);
  });

  it("retorna 0 si alguna fecha no es valida o es nula", () => {
    expect(calculateBusinessHours("invalido", new Date())).toBe(0);
    expect(calculateBusinessHours(new Date(), "invalido")).toBe(0);
    expect(calculateBusinessHours(null as any, new Date())).toBe(0);
    expect(calculateBusinessHours(new Date(), null as any)).toBe(0);
    expect(calculateBusinessHours(undefined as any, new Date())).toBe(0);
  });

  it("calcula horas continuas dentro del mismo dia habil", () => {
    const inicio = new Date(2026, 9, 5, 8, 0, 0); // Lunes 08:00
    const fin = new Date(2026, 9, 5, 17, 30, 0); // Lunes 17:30
    expect(calculateBusinessHours(inicio, fin)).toBe(9.5);
  });

  it("calcula minutos fraccionados con precision decimal", () => {
    const inicio = new Date(2026, 9, 6, 9, 0, 0); // Martes 09:00
    const fin = new Date(2026, 9, 6, 9, 15, 0); // Martes 09:15 (15 min = 0.25h)
    expect(calculateBusinessHours(inicio, fin)).toBe(0.25);
  });

  it("descuenta exactamente sabados y domingos completos", () => {
    // Viernes 18:00 a Lunes 09:00
    // Viernes: 18:00 a 24:00 = 6h
    // Sabado: 0h
    // Domingo: 0h
    // Lunes: 00:00 a 09:00 = 9h
    // Total: 15h
    const viernes = new Date(2026, 9, 9, 18, 0, 0); // Viernes 9 de Octubre 2026
    const lunes = new Date(2026, 9, 12, 9, 0, 0); // Lunes 12 de Octubre 2026
    expect(calculateBusinessHours(viernes, lunes)).toBe(15);
  });

  it("retorna 0 si el periodo ocurre completamente en fin de semana", () => {
    const sabado = new Date(2026, 9, 10, 10, 0, 0); // Sabado 10:00
    const domingo = new Date(2026, 9, 11, 20, 0, 0); // Domingo 20:00
    expect(calculateBusinessHours(sabado, domingo)).toBe(0);
  });

  it("contabiliza correctamente cuando la fecha inicial cae en fin de semana", () => {
    const sabado = new Date(2026, 9, 10, 12, 0, 0);
    const lunes = new Date(2026, 9, 12, 10, 0, 0);
    // Sabado y domingo = 0h, Lunes 00:00 a 10:00 = 10h
    expect(calculateBusinessHours(sabado, lunes)).toBe(10);
  });

  it("contabiliza correctamente cuando la fecha final cae en fin de semana", () => {
    const viernes = new Date(2026, 9, 9, 14, 0, 0); // Viernes 14:00
    const sabado = new Date(2026, 9, 10, 16, 0, 0); // Sabado 16:00
    // Viernes 14:00 a 24:00 = 10h, Sabado = 0h
    expect(calculateBusinessHours(viernes, sabado)).toBe(10);
  });

  it("calcula rangos de varios dias con fin de semana intermedio", () => {
    // Viernes 10:00 a Martes 14:00
    // Viernes: 10:00 a 24:00 = 14h
    // Sab/Dom: 0h
    // Lunes: 24h
    // Martes: 00:00 a 14:00 = 14h
    // Total: 14 + 24 + 14 = 52h
    const viernes = new Date(2026, 9, 9, 10, 0, 0);
    const martes = new Date(2026, 9, 13, 14, 0, 0);
    expect(calculateBusinessHours(viernes, martes)).toBe(52);
  });

  it("calcula periodos continuos de dias entre semana sin fin de semana", () => {
    // Lunes 09:00 a Miercoles 09:00 = 48h
    const lunes = new Date(2026, 9, 5, 9, 0, 0);
    const miercoles = new Date(2026, 9, 7, 9, 0, 0);
    expect(calculateBusinessHours(lunes, miercoles)).toBe(48);
  });
});

describe("formatBusinessHours", () => {
  it("formatea valores nulos o no positivos", () => {
    expect(formatBusinessHours(0)).toBe("0h habiles");
    expect(formatBusinessHours(-5)).toBe("0h habiles");
    expect(formatBusinessHours(NaN)).toBe("0h habiles");
  });

  it("formatea periodos menores a una hora", () => {
    expect(formatBusinessHours(0.5)).toBe("< 1h habiles");
    expect(formatBusinessHours(0.9)).toBe("< 1h habiles");
  });

  it("formatea horas dentro del mismo dia", () => {
    expect(formatBusinessHours(5)).toBe("5h habiles");
    expect(formatBusinessHours(23)).toBe("23h habiles");
  });

  it("formatea dias exactos sin horas residuales", () => {
    expect(formatBusinessHours(24)).toBe("1d habiles");
    expect(formatBusinessHours(48)).toBe("2d habiles");
    expect(formatBusinessHours(72)).toBe("3d habiles");
  });

  it("formatea combinacion de dias y horas residuales", () => {
    expect(formatBusinessHours(52)).toBe("2d 4h habiles");
    expect(formatBusinessHours(49)).toBe("2d 1h habiles");
    expect(formatBusinessHours(26)).toBe("1d 2h habiles");
  });
});

describe("isTaskStalled", () => {
  const baseTask: Pick<TaskItem, "status" | "type" | "updated_at" | "created_at"> = {
    status: "in_progress",
    type: "task",
    updated_at: "2026-10-05T10:00:00.000Z", // Lunes 10:00
    created_at: "2026-10-01T10:00:00.000Z",
  };

  it("retorna false para reuniones sin importar antiguedad", () => {
    const meetingTask = {
      ...baseTask,
      type: "meeting" as const,
      updated_at: "2026-09-01T10:00:00.000Z",
    };
    expect(isTaskStalled(meetingTask, new Date(2026, 9, 15))).toBe(false);
  });

  it("retorna false para tareas en done, todo o backlog", () => {
    const now = new Date(2026, 9, 15);
    expect(isTaskStalled({ ...baseTask, status: "done" }, now)).toBe(false);
    expect(isTaskStalled({ ...baseTask, status: "todo" }, now)).toBe(false);
    expect(isTaskStalled({ ...baseTask, status: "backlog" }, now)).toBe(false);
  });

  it("retorna false si no han transcurrido mas de 48 horas habiles", () => {
    // Lunes 10:00 a Martes 15:00 = 29 horas habiles (< 48)
    const inicio = new Date(2026, 9, 5, 10, 0, 0);
    const ahora = new Date(2026, 9, 6, 15, 0, 0);
    const task = {
      ...baseTask,
      updated_at: inicio.toISOString(),
    };
    expect(isTaskStalled(task, ahora)).toBe(false);
  });

  it("retorna true para in_progress con mas de 48 horas habiles", () => {
    // Lunes 10:00 a Jueves 11:00 = 73 horas habiles (> 48)
    const inicio = new Date(2026, 9, 5, 10, 0, 0);
    const ahora = new Date(2026, 9, 8, 11, 0, 0);
    const task = {
      ...baseTask,
      status: "in_progress" as const,
      updated_at: inicio.toISOString(),
    };
    expect(isTaskStalled(task, ahora)).toBe(true);
  });

  it("retorna true para in_review y blocked con mas de 48 horas habiles", () => {
    const inicio = new Date(2026, 9, 5, 10, 0, 0);
    const ahora = new Date(2026, 9, 8, 11, 0, 0);
    expect(
      isTaskStalled({ ...baseTask, status: "in_review", updated_at: inicio.toISOString() }, ahora)
    ).toBe(true);
    expect(
      isTaskStalled({ ...baseTask, status: "blocked", updated_at: inicio.toISOString() }, ahora)
    ).toBe(true);
  });

  it("no genera falso positivo el lunes si la tarea se toco el viernes por la tarde", () => {
    // Viernes 17:00 a Lunes 09:00 = 16 horas habiles (a pesar de 64 horas calendario)
    const viernes = new Date(2026, 9, 9, 17, 0, 0);
    const lunes = new Date(2026, 9, 12, 9, 0, 0);
    const task = {
      ...baseTask,
      updated_at: viernes.toISOString(),
    };
    expect(isTaskStalled(task, lunes)).toBe(false);
  });

  it("utiliza created_at si updated_at no existe", () => {
    const inicio = new Date(2026, 9, 5, 10, 0, 0);
    const ahora = new Date(2026, 9, 8, 11, 0, 0);
    const task = {
      ...baseTask,
      updated_at: "" as any,
      created_at: inicio.toISOString(),
    };
    expect(isTaskStalled(task, ahora)).toBe(true);
  });

  it("retorna false si task es null o undefined", () => {
    expect(isTaskStalled(null)).toBe(false);
    expect(isTaskStalled(undefined)).toBe(false);
  });

  it("aplica umbral seguro de 48h si se proporciona un valor no positivo o NaN", () => {
    // 29h habiles (< 48h): no debe considerarse estancada aun si thresholdHours es -10 o NaN
    const inicio = new Date(2026, 9, 5, 10, 0, 0);
    const ahora = new Date(2026, 9, 6, 15, 0, 0);
    const task = {
      ...baseTask,
      updated_at: inicio.toISOString(),
    };
    expect(isTaskStalled(task, ahora, -10)).toBe(false);
    expect(isTaskStalled(task, ahora, NaN)).toBe(false);
  });
});

describe("getTaskStalledInfo", () => {
  it("entrega objeto completo con formato y calculo", () => {
    // Viernes 10:00 a Martes 14:00 = 52h habiles
    const viernes = new Date(2026, 9, 9, 10, 0, 0);
    const martes = new Date(2026, 9, 13, 14, 0, 0);
    const task = {
      status: "in_progress" as const,
      type: "task" as const,
      updated_at: viernes.toISOString(),
      created_at: viernes.toISOString(),
    };

    const info = getTaskStalledInfo(task, martes);
    expect(info.isStalled).toBe(true);
    expect(info.businessHours).toBe(52);
    expect(info.formattedTime).toBe("2d 4h habiles");
  });

  it("retorna objeto por defecto si task es null o undefined", () => {
    const infoNull = getTaskStalledInfo(null);
    expect(infoNull.isStalled).toBe(false);
    expect(infoNull.businessHours).toBe(0);
    expect(infoNull.formattedTime).toBe("0h habiles");

    const infoUndef = getTaskStalledInfo(undefined);
    expect(infoUndef.isStalled).toBe(false);
    expect(infoUndef.businessHours).toBe(0);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getStalledTasksWatchdog,
  runWatchdogManualScanAction,
  nudgeStalledTaskAction,
} from "./task-watchdog-actions";

// Mocks hoisted
const mocks = vi.hoisted(() => ({
  getCurrentOrganizationId: vi.fn(),
  revalidatePath: vi.fn(),
  createClient: vi.fn(),
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/modules/core/organizations/organization-actions", () => ({
  getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}));

vi.mock("@/modules/core/database/supabase-server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/modules/core/database/supabase-admin", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));

// Helper para crear builders fluidos de Supabase
function createQueryBuilder(resolveValue: any) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => resolveValue),
    maybeSingle: vi.fn(async () => resolveValue),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    then: (resolve: any, reject: any) => Promise.resolve(resolveValue).then(resolve, reject),
  };
  return builder;
}

// Regex para asegurar CERO emojis en cualquier cadena
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;

describe("task-watchdog-actions - Guardián de Tareas Estancadas", () => {
  const testOrgId = "org-pixy-test-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentOrganizationId.mockResolvedValue(testOrgId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getStalledTasksWatchdog", () => {
    it("retorna lista de tareas estancadas ordenadas por horas habiles de inactividad", async () => {
      // Configuramos fechas simulando jueves 8 de octubre 2026 12:00
      // Tarea A: actualizada lunes 5 de oct 08:00 (76h habiles -> estancada)
      // Tarea B: actualizada miercoles 7 de oct 15:00 (21h habiles -> no estancada)
      // Tarea C: actualizada martes 6 de oct 08:00 (52h habiles -> estancada)
      const ahora = new Date(2026, 9, 8, 12, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(ahora);

      const mockTasks = [
        {
          id: "task-1",
          organization_id: testOrgId,
          ticket_code: "TK-101",
          title: "Implementar pasarela",
          status: "in_progress",
          type: "task",
          updated_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(),
          created_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(),
        },
        {
          id: "task-2",
          organization_id: testOrgId,
          ticket_code: "TK-102",
          title: "Ajustar tipografia",
          status: "in_review",
          type: "task",
          updated_at: new Date(2026, 9, 7, 15, 0, 0).toISOString(),
          created_at: new Date(2026, 9, 7, 15, 0, 0).toISOString(),
        },
        {
          id: "task-3",
          organization_id: testOrgId,
          ticket_code: "TK-103",
          title: "Corregir bug de login",
          status: "blocked",
          type: "task",
          updated_at: new Date(2026, 9, 6, 8, 0, 0).toISOString(),
          created_at: new Date(2026, 9, 6, 8, 0, 0).toISOString(),
        },
      ];

      mocks.supabaseAdmin.from.mockImplementation((table: string) => {
        if (table === "task_items") {
          return createQueryBuilder({ data: mockTasks, error: null });
        }
        return createQueryBuilder({ data: [], error: null });
      });

      const result = await getStalledTasksWatchdog(testOrgId, 48);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      // Tarea 1 tiene 76h y Tarea 3 tiene 52h, debe quedar Tarea 1 primero
      expect(result.data[0].task.id).toBe("task-1");
      expect(result.data[0].stalledInfo.isStalled).toBe(true);
      expect(result.data[0].stalledInfo.businessHours).toBeGreaterThan(70);

      expect(result.data[1].task.id).toBe("task-3");
      expect(result.data[1].stalledInfo.isStalled).toBe(true);
      expect(result.data[1].stalledInfo.businessHours).toBeGreaterThan(50);

      vi.useRealTimers();
    });

    it("respeta umbrales de tiempo configurables (e.g. 72 horas)", async () => {
      const ahora = new Date(2026, 9, 8, 12, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(ahora);

      const mockTasks = [
        {
          id: "task-1",
          organization_id: testOrgId,
          ticket_code: "TK-101",
          title: "Tarea antigua",
          status: "in_progress",
          type: "task",
          updated_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(), // ~76h
          created_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(),
        },
        {
          id: "task-3",
          organization_id: testOrgId,
          ticket_code: "TK-103",
          title: "Tarea intermedia",
          status: "blocked",
          type: "task",
          updated_at: new Date(2026, 9, 6, 8, 0, 0).toISOString(), // ~52h
          created_at: new Date(2026, 9, 6, 8, 0, 0).toISOString(),
        },
      ];

      mocks.supabaseAdmin.from.mockReturnValue(createQueryBuilder({ data: mockTasks, error: null }));

      // Con umbral de 72h solo task-1 debe calificar
      const result = await getStalledTasksWatchdog(testOrgId, 72);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].task.id).toBe("task-1");

      vi.useRealTimers();
    });

    it("aplica umbral por defecto (48h) ante parametros no numericos o no positivos", async () => {
      const ahora = new Date(2026, 9, 8, 12, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(ahora);

      const mockTasks = [
        {
          id: "task-1",
          organization_id: testOrgId,
          ticket_code: "TK-101",
          title: "Tarea antigua",
          status: "in_progress",
          type: "task",
          updated_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(), // ~76h
          created_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(),
        },
        {
          id: "task-2",
          organization_id: testOrgId,
          ticket_code: "TK-102",
          title: "Tarea reciente",
          status: "in_progress",
          type: "task",
          updated_at: new Date(2026, 9, 7, 15, 0, 0).toISOString(), // ~21h
          created_at: new Date(2026, 9, 7, 15, 0, 0).toISOString(),
        },
      ];

      mocks.supabaseAdmin.from.mockReturnValue(createQueryBuilder({ data: mockTasks, error: null }));

      const result = await getStalledTasksWatchdog(testOrgId, -5);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].task.id).toBe("task-1");

      vi.useRealTimers();
    });

    it("retorna error cuando la consulta a base de datos falla", async () => {
      mocks.supabaseAdmin.from.mockReturnValue(
        createQueryBuilder({ data: null, error: { message: "Fallo de conexion" } })
      );

      const result = await getStalledTasksWatchdog(testOrgId);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Fallo de conexion");
      expect(result.data).toEqual([]);
    });
  });

  describe("runWatchdogManualScanAction", () => {
    it("crea alertas de auditoria idempotentes con autor 'Guardián de Tareas' y CERO emojis", async () => {
      const ahora = new Date(2026, 9, 8, 12, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(ahora);

      const mockTasks = [
        {
          id: "task-stalled-1",
          organization_id: testOrgId,
          ticket_code: "TK-200",
          title: "Migracion de base de datos",
          status: "in_progress",
          type: "task",
          updated_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(), // 76h habiles
          created_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(),
        },
      ];

      let insertedComment: any = null;

      mocks.supabaseAdmin.from.mockImplementation((table: string) => {
        if (table === "task_items") {
          return createQueryBuilder({ data: mockTasks, error: null });
        }
        if (table === "task_comments") {
          const builder = createQueryBuilder({ data: [], error: null });
          builder.insert = vi.fn((payload: any) => {
            insertedComment = payload;
            return {
              then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
            };
          });
          return builder;
        }
        return createQueryBuilder({ data: [], error: null });
      });

      const result = await runWatchdogManualScanAction(testOrgId, 48, true);

      expect(result.success).toBe(true);
      expect(result.totalActiveTasks).toBe(1);
      expect(result.totalStalledTasks).toBe(1);
      expect(result.alertsCreated).toBe(1);

      // Verificacion estricta de la alerta insertada
      expect(insertedComment).not.toBeNull();
      expect(insertedComment.author_type).toBe("system");
      expect(insertedComment.author_id).toBe("system");
      expect(insertedComment.author_name).toBe("Guardián de Tareas");
      expect(insertedComment.content).toContain("[Guardián de Tareas Estancadas]");
      expect(insertedComment.content).toContain("#TK-200");
      expect(insertedComment.content).toContain("Migracion de base de datos");

      // Verificacion estricta de CERO EMOJIS
      expect(insertedComment.content).not.toMatch(EMOJI_REGEX);
      expect(insertedComment.author_name).not.toMatch(EMOJI_REGEX);

      vi.useRealTimers();
    });

    it("aplica regla de idempotencia y no duplica alertas si existe una reciente", async () => {
      const ahora = new Date(2026, 9, 8, 12, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(ahora);

      const mockTasks = [
        {
          id: "task-stalled-1",
          organization_id: testOrgId,
          ticket_code: "TK-200",
          title: "Tarea con alerta reciente",
          status: "in_progress",
          type: "task",
          updated_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(),
          created_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(),
        },
      ];

      // Alerta emitida hace 10 horas habiles (ayer miercoles)
      const recentComment = {
        id: "comment-prev-1",
        task_id: "task-stalled-1",
        created_at: new Date(2026, 9, 8, 2, 0, 0).toISOString(),
        content: "[Guardián de Tareas Estancadas] Alerta previa",
      };

      let insertCalled = false;

      mocks.supabaseAdmin.from.mockImplementation((table: string) => {
        if (table === "task_items") {
          return createQueryBuilder({ data: mockTasks, error: null });
        }
        if (table === "task_comments") {
          const builder = createQueryBuilder({ data: [recentComment], error: null });
          builder.insert = vi.fn(() => {
            insertCalled = true;
            return {
              then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
            };
          });
          return builder;
        }
        return createQueryBuilder({ data: [], error: null });
      });

      const result = await runWatchdogManualScanAction(testOrgId, 48, true);

      expect(result.success).toBe(true);
      expect(result.totalStalledTasks).toBe(1);
      expect(result.alertsCreated).toBe(0);
      expect(insertCalled).toBe(false);

      vi.useRealTimers();
    });

    it("omite insercion de alertas cuando createAuditAlerts es false", async () => {
      const ahora = new Date(2026, 9, 8, 12, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(ahora);

      const mockTasks = [
        {
          id: "task-stalled-1",
          organization_id: testOrgId,
          ticket_code: "TK-200",
          title: "Tarea estancada",
          status: "in_progress",
          type: "task",
          updated_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(),
          created_at: new Date(2026, 9, 5, 8, 0, 0).toISOString(),
        },
      ];

      mocks.supabaseAdmin.from.mockReturnValue(createQueryBuilder({ data: mockTasks, error: null }));

      const result = await runWatchdogManualScanAction(testOrgId, 48, false);

      expect(result.success).toBe(true);
      expect(result.totalStalledTasks).toBe(1);
      expect(result.alertsCreated).toBe(0);

      vi.useRealTimers();
    });
  });

  describe("nudgeStalledTaskAction", () => {
    it("registra seguimiento PM y actualiza updated_at para reiniciar el ciclo de inactividad", async () => {
      const mockTask = {
        id: "task-100",
        organization_id: testOrgId,
        ticket_code: "TK-100",
        title: "Tarea atascada",
      };

      const mockUser = {
        id: "user-pm-1",
        email: "pm@pixy.com",
        user_metadata: { full_name: "Carlos Gestor" },
      };

      mocks.createClient.mockResolvedValue({
        auth: {
          getUser: vi.fn(async () => ({ data: { user: mockUser }, error: null })),
        },
      });

      let insertedComment: any = null;
      let updatedTaskPayload: any = null;

      mocks.supabaseAdmin.from.mockImplementation((table: string) => {
        if (table === "task_items") {
          const builder = createQueryBuilder({ data: mockTask, error: null });
          builder.update = vi.fn((payload: any) => {
            updatedTaskPayload = payload;
            return builder;
          });
          return builder;
        }
        if (table === "task_comments") {
          const builder = createQueryBuilder({
            data: { id: "new-comm-1", content: "test" },
            error: null,
          });
          builder.insert = vi.fn((payload: any) => {
            insertedComment = payload;
            return builder;
          });
          return builder;
        }
        return createQueryBuilder({ data: [], error: null });
      });

      const result = await nudgeStalledTaskAction("task-100", "Por favor revisar bloqueo de dependencias");

      expect(result.success).toBe(true);
      expect(insertedComment).not.toBeNull();
      expect(insertedComment.author_type).toBe("owner");
      expect(insertedComment.author_name).toBe("Carlos Gestor");
      expect(insertedComment.content).toContain("[Seguimiento PM] Por favor revisar bloqueo de dependencias");
      expect(insertedComment.content).not.toMatch(EMOJI_REGEX);

      // Certificar que actualiza updated_at en task_items
      expect(updatedTaskPayload).not.toBeNull();
      expect(updatedTaskPayload.updated_at).toBeDefined();

      expect(mocks.revalidatePath).toHaveBeenCalledWith("/operations/tasks");
    });

    it("retorna error si la tarea no existe", async () => {
      mocks.createClient.mockResolvedValue({
        auth: {
          getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
        },
      });

      mocks.supabaseAdmin.from.mockReturnValue(
        createQueryBuilder({ data: null, error: { message: "No encontrada" } })
      );

      const result = await nudgeStalledTaskAction("task-inexistente");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Tarea no encontrada");
    });
  });
});

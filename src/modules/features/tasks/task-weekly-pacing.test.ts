import { describe, expect, it } from 'vitest';
import { getTaskWeeklyPacing, TaskItem } from './types';

describe('getTaskWeeklyPacing', () => {
  const baseTask: TaskItem = {
    id: 'task-test-1',
    organization_id: 'org-test',
    project_id: 'proj-test',
    ticket_code: 'TK-101',
    title: 'Tarea de prueba para ritmo semanal',
    description: '',
    status: 'in_progress',
    priority: 'medium',
    type: 'task',
    progress_percentage: 60,
    estimated_hours: 10,
    actual_hours: 6,
    checklist: [],
    tags: [],
    attachments: [],
    order_index: 0,
    created_at: '2026-09-01T10:00:00.000Z',
    updated_at: '2026-09-20T10:00:00.000Z',
  };

  const septViewDate = new Date(2026, 8, 25); // 25 de septiembre de 2026
  const septRealToday = new Date(2026, 8, 25); // Semana 4 activa

  it('valida existencia temporal: tarea creada en semana 2 no tiene avance ni programacion en semana 1', () => {
    const taskCreatedInWeek2: TaskItem = {
      ...baseTask,
      created_at: '2026-09-10T12:00:00.000Z', // Creada el dia 10 (Semana 2)
      progress_percentage: 50,
      status: 'in_progress',
    };

    const pacing = getTaskWeeklyPacing(taskCreatedInWeek2, septViewDate, septRealToday);

    // Semana 1 debio cerrarse el dia 7 a las 23:59:59, antes de la creacion
    expect(pacing[0].week).toBe(1);
    expect(pacing[0].progress).toBe(0);
    expect(pacing[0].status).toBe('pending');
    expect(pacing[0].hasSchedule).toBe(false);

    // Semana 2 ya existia la tarea
    expect(pacing[1].week).toBe(2);
  });

  it('elimina el fallback artificial de 100% en semanas pasadas para tareas activas', () => {
    const activeTaskWithoutSnapshots: TaskItem = {
      ...baseTask,
      created_at: '2026-09-02T10:00:00.000Z',
      progress_percentage: 75,
      status: 'in_progress',
      due_date: '2026-09-30', // Vence a fin de mes, no en semana 1 ni 2
      weekly_snapshots: null,
    };

    const pacing = getTaskWeeklyPacing(activeTaskWithoutSnapshots, septViewDate, septRealToday);

    // En semanas pasadas 1 y 2, sin snapshot y sin estar vencidas ni bloqueadas, debe ser pending con progreso 0
    expect(pacing[0].week).toBe(1);
    expect(pacing[0].progress).toBe(0);
    expect(pacing[0].status).toBe('pending');
    expect(pacing[0].hasSchedule).toBe(false);

    expect(pacing[1].week).toBe(2);
    expect(pacing[1].progress).toBe(0);
    expect(pacing[1].status).toBe('pending');
    expect(pacing[1].hasSchedule).toBe(false);
  });

  it('refleja condicion delayed en semana pasada si la tarea estaba vencida', () => {
    const overdueTaskInWeek1: TaskItem = {
      ...baseTask,
      created_at: '2026-09-02T10:00:00.000Z',
      progress_percentage: 30,
      status: 'in_progress',
      due_date: '2026-09-05', // Vencida en semana 1
      weekly_snapshots: null,
    };

    const pacing = getTaskWeeklyPacing(overdueTaskInWeek1, septViewDate, septRealToday);

    expect(pacing[0].week).toBe(1);
    expect(pacing[0].status).toBe('delayed');
    expect(pacing[0].hasSchedule).toBe(true);
  });

  it('refleja condicion delayed en semana pasada si la tarea estaba bloqueada', () => {
    const blockedTask: TaskItem = {
      ...baseTask,
      created_at: '2026-09-02T10:00:00.000Z',
      progress_percentage: 20,
      status: 'blocked',
      due_date: '2026-09-30',
      weekly_snapshots: null,
    };

    const pacing = getTaskWeeklyPacing(blockedTask, septViewDate, septRealToday);

    expect(pacing[0].week).toBe(1);
    expect(pacing[0].status).toBe('delayed');
    expect(pacing[0].hasSchedule).toBe(true);
  });

  it('respeta snapshots historicos en tareas completadas sin sobreescribir arbitrariamente con 100%', () => {
    const completedTaskWithSnapshots: TaskItem = {
      ...baseTask,
      created_at: '2026-09-01T10:00:00.000Z',
      status: 'done',
      progress_percentage: 100,
      weekly_snapshots: {
        s1: 25,
        s2: 60,
      },
    };

    const pacing = getTaskWeeklyPacing(completedTaskWithSnapshots, septViewDate, septRealToday);

    // Semana 1 debe preservar el 25% del snapshot congelado
    expect(pacing[0].week).toBe(1);
    expect(pacing[0].progress).toBe(25);
    expect(pacing[0].status).toBe('on_track');
    expect(pacing[0].hasSchedule).toBe(true);

    // Semana 2 debe preservar el 60% del snapshot congelado
    expect(pacing[1].week).toBe(2);
    expect(pacing[1].progress).toBe(60);
    expect(pacing[1].status).toBe('on_track');
    expect(pacing[1].hasSchedule).toBe(true);
  });

  it('soporta lectura de snapshots tanto en formato particionado por mes como en formato plano legado', () => {
    const taskPartitioned: TaskItem = {
      ...baseTask,
      created_at: '2026-09-01T10:00:00.000Z',
      weekly_snapshots: {
        '2026-09': {
          s1: 40,
        },
        s2: 80, // Legado plano
      },
    };

    const pacing = getTaskWeeklyPacing(taskPartitioned, septViewDate, septRealToday);

    // Semana 1 leida desde la particion 2026-09
    expect(pacing[0].week).toBe(1);
    expect(pacing[0].progress).toBe(40);

    // Semana 2 leida desde el formato plano s2
    expect(pacing[1].week).toBe(2);
    expect(pacing[1].progress).toBe(80);
  });

  it('evalua reuniones completadas unicamente en su semana programada sin inflar semanas pasadas', () => {
    const meetingTask: TaskItem = {
      ...baseTask,
      type: 'meeting',
      status: 'done',
      progress_percentage: 100,
      meeting_start_at: '2026-09-18T15:00:00.000Z', // Semana 3 (dia 18)
      due_date: '2026-09-18',
    };

    const pacing = getTaskWeeklyPacing(meetingTask, septViewDate, septRealToday);

    // Semana 1 (pasada) no debe mostrar 100% ni programacion
    expect(pacing[0].week).toBe(1);
    expect(pacing[0].progress).toBe(0);
    expect(pacing[0].status).toBe('pending');
    expect(pacing[0].hasSchedule).toBe(false);

    // Semana 2 (pasada) no debe mostrar 100% ni programacion
    expect(pacing[1].week).toBe(2);
    expect(pacing[1].progress).toBe(0);
    expect(pacing[1].status).toBe('pending');
    expect(pacing[1].hasSchedule).toBe(false);

    // Semana 3 (semana de la sesion) debe mostrar 100% y completed
    expect(pacing[2].week).toBe(3);
    expect(pacing[2].progress).toBe(100);
    expect(pacing[2].status).toBe('completed');
    expect(pacing[2].hasSchedule).toBe(true);
  });
});

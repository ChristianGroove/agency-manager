/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-19-appointment-slot-edge
 * Feature: F19 - Direct Appointment Booking
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';

export interface AppointmentSlotRequest {
  serviceId: string;
  isServiceActive: boolean;
  startTimeIso: string;
  durationMinutes: number;
  businessHours: {
    startHour: number;
    endHour: number;
    closedDays: number[];
  };
  existingBookings: Array<{ start: number; end: number }>;
}

export function validateAppointmentSlot(
  req: AppointmentSlotRequest,
  currentTimestampMs: number = Date.now()
): {
  isValid: boolean;
  error?: string;
} {
  if (!req.isServiceActive) {
    return { isValid: false, error: 'Cannot book appointment for inactive service' };
  }

  const slotDate = new Date(req.startTimeIso);
  const slotStartMs = slotDate.getTime();
  if (isNaN(slotStartMs)) {
    return { isValid: false, error: 'Invalid start time format' };
  }

  if (slotStartMs <= currentTimestampMs) {
    return { isValid: false, error: 'Appointment cannot be booked in the past' };
  }

  const dayOfWeek = slotDate.getUTCDay();
  if (req.businessHours.closedDays.includes(dayOfWeek)) {
    return { isValid: false, error: 'Selected day is outside business operating days' };
  }

  const hour = slotDate.getUTCHours();
  const slotEndMs = slotStartMs + req.durationMinutes * 60 * 1000;
  const slotEndDate = new Date(slotEndMs);
  const endHour = slotEndDate.getUTCHours() + (slotEndDate.getUTCMinutes() > 0 ? 1 : 0);

  if (hour < req.businessHours.startHour || endHour > req.businessHours.endHour) {
    return { isValid: false, error: 'Appointment time exceeds business operating hours' };
  }

  for (const booking of req.existingBookings) {
    if (slotStartMs < booking.end && slotEndMs > booking.start) {
      return { isValid: false, error: 'Time slot overlaps with an existing appointment' };
    }
  }

  return { isValid: true };
}

const baseBusinessHours = {
  startHour: 8,
  endHour: 18,
  closedDays: [0],
};

const fixedNow = new Date('2026-08-16T10:00:00Z').getTime();

export const suite = {
  name: 'T2-19: Appointment Slot Boundaries & Overlap Protection',
  tier: 'Tier 2',
  feature: 'F19: Direct Appointment Booking',
  tests: [
    {
      name: 'Booking slot in the past is rejected',
      fn: async () => {
        const res = validateAppointmentSlot(
          {
            serviceId: 'srv-1',
            isServiceActive: true,
            startTimeIso: '2026-08-15T14:00:00Z',
            durationMinutes: 60,
            businessHours: baseBusinessHours,
            existingBookings: [],
          },
          fixedNow
        );

        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Appointment cannot be booked in the past');
      },
    },
    {
      name: 'Booking on closed day (Sunday) is rejected',
      fn: async () => {
        const res = validateAppointmentSlot(
          {
            serviceId: 'srv-1',
            isServiceActive: true,
            startTimeIso: '2026-08-23T10:00:00Z',
            durationMinutes: 60,
            businessHours: baseBusinessHours,
            existingBookings: [],
          },
          fixedNow
        );

        expect(res.isValid).toBe(false);
        expect(res.error).toContain('outside business operating days');
      },
    },
    {
      name: 'Overlapping appointment conflict is detected and blocked',
      fn: async () => {
        const existingStart = new Date('2026-08-17T14:00:00Z').getTime();
        const existingEnd = new Date('2026-08-17T15:00:00Z').getTime();

        const res = validateAppointmentSlot(
          {
            serviceId: 'srv-1',
            isServiceActive: true,
            startTimeIso: '2026-08-17T14:30:00Z',
            durationMinutes: 60,
            businessHours: baseBusinessHours,
            existingBookings: [{ start: existingStart, end: existingEnd }],
          },
          fixedNow
        );

        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Time slot overlaps with an existing appointment');
      },
    },
    {
      name: 'Booking appointment for inactive service is rejected',
      fn: async () => {
        const res = validateAppointmentSlot(
          {
            serviceId: 'srv-inactive',
            isServiceActive: false,
            startTimeIso: '2026-08-17T10:00:00Z',
            durationMinutes: 60,
            businessHours: baseBusinessHours,
            existingBookings: [],
          },
          fixedNow
        );

        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Cannot book appointment for inactive service');
      },
    },
    {
      name: 'Duration exceeding business closing hours is rejected',
      fn: async () => {
        const res = validateAppointmentSlot(
          {
            serviceId: 'srv-1',
            isServiceActive: true,
            startTimeIso: '2026-08-17T17:30:00Z',
            durationMinutes: 120,
            businessHours: baseBusinessHours,
            existingBookings: [],
          },
          fixedNow
        );

        expect(res.isValid).toBe(false);
        expect(res.error).toContain('exceeds business operating hours');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier2');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}

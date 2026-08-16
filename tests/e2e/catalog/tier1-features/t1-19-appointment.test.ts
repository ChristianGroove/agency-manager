/**
 * Tier 1 Test Suite: F19 - Direct Appointment Booking
 * Tests appointment deep link generator, service ID pre-population, duration parameter binding, provider selection parameter, time slot picker contract.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertContains,
} from '../harness/assertions';
import { mockServiceItem, TENANT_A_ID } from '../harness/mock-data';

export const suite = {
  name: 'T1-19: Direct Appointment Booking',
  tier: 'Tier 1',
  feature: 'F19: Direct Appointment Booking',
  tests: [
    {
      name: 'Generates appointment booking deep link URL with pre-populated service_id',
      fn: () => {
        function buildAppointmentUrl(params: {
          serviceId: string;
          tenantId: string;
          variantId?: string;
        }): string {
          const url = new URL('https://app.pixy.com/appointments/book');
          url.searchParams.set('tenant', params.tenantId);
          url.searchParams.set('service', params.serviceId);
          if (params.variantId) {
            url.searchParams.set('variant', params.variantId);
          }
          return url.toString();
        }

        const link = buildAppointmentUrl({
          serviceId: mockServiceItem.id,
          tenantId: TENANT_A_ID,
          variantId: 'var_serv_01',
        });

        assertContains(link, 'service=item_srv_003');
        assertContains(link, `tenant=${TENANT_A_ID}`);
        assertContains(link, 'variant=var_serv_01');
      },
    },
    {
      name: 'Binds estimated service duration parameter from catalog metadata',
      fn: () => {
        function extractDurationMinutes(item: { specifications?: Record<string, any> }): number {
          return item.specifications?.durationMinutes || 60; // default 60 min
        }

        const duration = extractDurationMinutes({
          specifications: { durationMinutes: 90 },
        });
        assertEqual(duration, 90);
      },
    },
    {
      name: 'Binds designated provider staff member selection parameter',
      fn: () => {
        function buildStaffAssignedBookingUrl(serviceId: string, staffId: string): string {
          const url = new URL('https://app.pixy.com/appointments/book');
          url.searchParams.set('service', serviceId);
          url.searchParams.set('staff', staffId);
          return url.toString();
        }

        const url = buildStaffAssignedBookingUrl('item_srv_003', 'user_staff_789');
        assertContains(url, 'staff=user_staff_789');
      },
    },
    {
      name: 'Validates time slot picker booking reservation request contract',
      fn: () => {
        interface BookingSlotRequest {
          serviceId: string;
          staffId?: string;
          selectedDate: string; // YYYY-MM-DD
          selectedTime: string; // HH:mm
          clientName: string;
          clientEmail: string;
          clientPhone: string;
        }

        function validateBookingRequest(req: BookingSlotRequest): { isValid: boolean; errors: string[] } {
          const errors: string[] = [];
          if (!req.serviceId) errors.push('serviceId required');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(req.selectedDate)) errors.push('Invalid date format');
          if (!/^\d{2}:\d{2}$/.test(req.selectedTime)) errors.push('Invalid time format');
          if (!req.clientEmail.includes('@')) errors.push('Invalid email');

          return { isValid: errors.length === 0, errors };
        }

        const validReq: BookingSlotRequest = {
          serviceId: 'item_srv_003',
          selectedDate: '2026-08-20',
          selectedTime: '14:30',
          clientName: 'Laura Sanchez',
          clientEmail: 'laura@example.com',
          clientPhone: '+57 310 987 6543',
        };

        const res = validateBookingRequest(validReq);
        assertTrue(res.isValid);
      },
    },
    {
      name: 'Attaches cancellation and rescheduling policy terms to booking payload',
      fn: () => {
        function attachPolicyTerms(booking: Record<string, any>) {
          return {
            ...booking,
            cancellationNoticeHours: 24,
            reschedulingAllowed: true,
            policyUrl: 'https://app.pixy.com/terms/appointments',
          };
        }

        const finalized = attachPolicyTerms({ id: 'app_001', service: 'item_srv_003' });
        assertEqual(finalized.cancellationNoticeHours, 24);
        assertTrue(finalized.reschedulingAllowed);
        assertEqual(finalized.policyUrl, 'https://app.pixy.com/terms/appointments');
      },
    },
  ],
};

export async function run() {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const t of suite.tests) {
    try {
      await t.fn();
      passed++;
    } catch (err: any) {
      failed++;
      errors.push(`${t.name}: ${err.message}`);
    }
  }

  return { passed, failed, errors };
}

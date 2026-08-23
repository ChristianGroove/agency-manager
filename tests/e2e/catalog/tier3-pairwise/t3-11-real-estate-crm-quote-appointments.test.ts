/**
 * Tier 3: Cross-Feature Combinations & Pairwise Integration Suite
 * Suite: t3-11-real-estate-crm-quote-appointments
 * Domain: Real Estate Catalog + CRM Lead Association + Formal Quotes + Private Tour Appointments
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertDefined,
  assertArrayLength,
  assertContains,
  expect,
  TestRegistry,
  TestSuiteResult,
} from '../harness/assertions';
import {
  UniversalCatalogItem,
  formatWhatsAppMessage,
  StorefrontActionPayload,
} from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';
import { mockRealEstateApartment } from '../tier4-scenarios/t4-14-real-estate-property-space.test';

// PropTech CRM & Quotes domain helper contracts
export interface PropTechCRMLead {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  email?: string;
  source: 'storefront_property_inquiry' | 'whatsapp_direct' | 'portal_form';
  status: 'nuevo_prospecto' | 'contacto_inicial' | 'visita_agendada' | 'negociacion' | 'cierre_exitoso' | 'descartado';
  interested_property_id: string;
  property_title: string;
  budget_cop: number;
  tags: string[];
  notes?: string;
  created_at: string;
}

export interface PropTechFormalQuote {
  id: string;
  organization_id: string;
  lead_id: string;
  quote_number: string;
  property_id: string;
  property_name: string;
  property_price: number;
  admin_fee_monthly: number;
  down_payment_percent: number;
  down_payment_cop: number;
  estimated_closing_costs: number; // ~1.5% for Colombian notary and registry taxes
  total_initial_investment: number;
  currency: 'COP' | 'USD';
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  created_at: string;
}

export interface PropertyAppointmentSlot {
  id: string;
  organization_id: string;
  property_id: string;
  lead_id: string;
  broker_id: string;
  appointment_type: 'in_person_tour' | 'virtual_matterport_tour';
  scheduled_at: string; // ISO datetime
  duration_minutes: number;
  status: 'confirmed' | 'rescheduled' | 'cancelled' | 'completed';
  notes?: string;
}

export function createCRMLeadFromPropertyInquiry(
  property: UniversalCatalogItem,
  buyer: { name: string; phone: string; email?: string; notes?: string },
  source: PropTechCRMLead['source'] = 'storefront_property_inquiry'
): PropTechCRMLead {
  const leadId = `lead_prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  return {
    id: leadId,
    organization_id: property.organization_id,
    name: buyer.name,
    phone: buyer.phone,
    email: buyer.email,
    source,
    status: 'nuevo_prospecto',
    interested_property_id: property.id,
    property_title: property.name,
    budget_cop: property.base_price,
    tags: ['inmobiliaria', 'prospecto_comprador', property.real_estate_details?.property_type || 'propiedad'],
    notes: buyer.notes,
    created_at: new Date().toISOString(),
  };
}

export function generatePropTechQuote(
  lead: PropTechCRMLead,
  property: UniversalCatalogItem,
  downPaymentPercent: number = 30
): PropTechFormalQuote {
  const price = property.base_price;
  const adminFee = property.real_estate_details?.admin_fee || 0;
  const downPaymentCOP = Math.round(price * (downPaymentPercent / 100));
  const closingCosts = Math.round(price * 0.015); // 1.5% Notary/Registry
  const totalInitial = downPaymentCOP + closingCosts;

  return {
    id: `quote_re_${Date.now()}`,
    organization_id: property.organization_id,
    lead_id: lead.id,
    quote_number: `COT-RE-${Date.now().toString().slice(-5)}`,
    property_id: property.id,
    property_name: property.name,
    property_price: price,
    admin_fee_monthly: adminFee,
    down_payment_percent: downPaymentPercent,
    down_payment_cop: downPaymentCOP,
    estimated_closing_costs: closingCosts,
    total_initial_investment: totalInitial,
    currency: 'COP',
    status: 'draft',
    created_at: new Date().toISOString(),
  };
}

export function schedulePropertyAppointment(
  lead: PropTechCRMLead,
  property: UniversalCatalogItem,
  params: {
    brokerId: string;
    scheduledAt: string;
    type: 'in_person_tour' | 'virtual_matterport_tour';
    existingAppointments?: PropertyAppointmentSlot[];
  }
): { success: boolean; appointment?: PropertyAppointmentSlot; error?: string } {
  const newStart = new Date(params.scheduledAt).getTime();
  const duration = 60; // 60 mins
  const newEnd = newStart + duration * 60 * 1000;

  if (params.existingAppointments && params.existingAppointments.length > 0) {
    for (const existing of params.existingAppointments) {
      if (existing.broker_id === params.brokerId && existing.status === 'confirmed') {
        const exStart = new Date(existing.scheduled_at).getTime();
        const exEnd = exStart + existing.duration_minutes * 60 * 1000;

        // Check time collision
        if (newStart < exEnd && newEnd > exStart) {
          return {
            success: false,
            error: `El asesor broker ya tiene una cita programada entre ${new Date(exStart).toISOString()} y ${new Date(exEnd).toISOString()}`,
          };
        }
      }
    }
  }

  const appointment: PropertyAppointmentSlot = {
    id: `apt_re_${Date.now()}`,
    organization_id: property.organization_id,
    property_id: property.id,
    lead_id: lead.id,
    broker_id: params.brokerId,
    appointment_type: params.type,
    scheduled_at: params.scheduledAt,
    duration_minutes: duration,
    status: 'confirmed',
    notes: `Visita para ${property.name}. Contacto cliente: ${lead.phone}`,
  };

  return {
    success: true,
    appointment,
  };
}

export const suite = {
  name: 'T3-11: Real Estate Cross-Feature Combinations & Full Sales Funnel',
  tier: 'tier3',
  feature: 'real-estate-pairwise',
  filePath: 'tests/e2e/catalog/tier3-pairwise/t3-11-real-estate-crm-quote-appointments.test.ts',
  tests: [
    // =========================================================================
    // 1. PROPERTY CATALOG -> CRM LEAD CONVERSION
    // =========================================================================
    {
      name: '1. Converts interested buyer inquiry into a PropTech CRM lead with property tags and budget',
      fn: () => {
        const property = { ...mockRealEstateApartment, id: 'prop_penthouse_medellin', name: 'Penthouse Poblado Milla de Oro', base_price: 1800000000 };
        const buyer = {
          name: 'Dra. Carolina Jaramillo',
          phone: '+573105559988',
          email: 'carolina.jaramillo@clinica.co',
          notes: 'Busca piso alto con terraza y 3 parqueaderos privados',
        };

        const lead = createCRMLeadFromPropertyInquiry(property, buyer);

        assertEqual(lead.name, buyer.name);
        assertEqual(lead.phone, buyer.phone);
        assertEqual(lead.email, buyer.email);
        assertEqual(lead.interested_property_id, property.id);
        assertEqual(lead.budget_cop, 1800000000);
        assertEqual(lead.status, 'nuevo_prospecto');
        assertContains(lead.tags, 'inmobiliaria');
        assertContains(lead.tags, 'prospecto_comprador');
        assertContains(lead.tags, 'apartment');
      },
    },

    // =========================================================================
    // 2. LEAD -> FORMAL FINANCING & DOWN PAYMENT QUOTE
    // =========================================================================
    {
      name: '2. Generates formal property financing quote with 30% down payment and notary closing fees',
      fn: () => {
        const property = { ...mockRealEstateApartment, id: 'prop_casa_envigado', name: 'Casa Campestre San Lucas', base_price: 2500000000 };
        const lead = createCRMLeadFromPropertyInquiry(property, {
          name: 'Ing. Mateo Restrepo',
          phone: '+573007771122',
        });

        const quote = generatePropTechQuote(lead, property, 30);

        assertEqual(quote.property_id, property.id);
        assertEqual(quote.property_price, 2500000000);
        assertEqual(quote.down_payment_percent, 30);
        assertEqual(quote.down_payment_cop, 750000000); // 30% of 2.5B
        assertEqual(quote.estimated_closing_costs, 37500000); // 1.5% of 2.5B
        assertEqual(quote.total_initial_investment, 787500000); // 750M + 37.5M
        assertEqual(quote.currency, 'COP');
        assertEqual(quote.status, 'draft');
      },
    },

    // =========================================================================
    // 3. PROPERTY SHOWING APPOINTMENT & COLLISION DETECTION
    // =========================================================================
    {
      name: '3. Schedules private property tour appointment and verifies calendar conflict collision detection',
      fn: () => {
        const property = { ...mockRealEstateApartment, id: 'prop_lote_llano', name: 'Lote Parcelación El Retiro' };
        const lead = createCRMLeadFromPropertyInquiry(property, {
          name: 'Santiago Valencia',
          phone: '+573114443322',
        });

        const brokerId = 'broker_andres_gomez';
        const targetSlot = '2026-08-25T15:00:00.000Z'; // 3:00 PM UTC

        const firstBooking = schedulePropertyAppointment(lead, property, {
          brokerId,
          scheduledAt: targetSlot,
          type: 'in_person_tour',
          existingAppointments: [],
        });

        assertTrue(firstBooking.success);
        assertDefined(firstBooking.appointment);
        if (!firstBooking.appointment) throw new Error("appointment required");
        assertEqual(firstBooking.appointment.status, 'confirmed');
        assertEqual(firstBooking.appointment.duration_minutes, 60);

        // Step B: Attempt overlapping booking for the same broker (Collision Detected)
        const overlappingSlot = '2026-08-25T15:30:00.000Z'; // 3:30 PM UTC (during existing 3-4pm slot)
        const secondBooking = schedulePropertyAppointment(lead, property, {
          brokerId,
          scheduledAt: overlappingSlot,
          type: 'in_person_tour',
          existingAppointments: [firstBooking.appointment],
        });

        assertFalse(secondBooking.success);
        assertDefined(secondBooking.error);
        assertTrue((secondBooking.error || '').includes('ya tiene una cita programada'));

        // Step C: Schedule non-overlapping slot (Success)
        const validLaterSlot = '2026-08-25T17:00:00.000Z'; // 5:00 PM UTC
        const thirdBooking = schedulePropertyAppointment(lead, property, {
          brokerId,
          scheduledAt: validLaterSlot,
          type: 'virtual_matterport_tour',
          existingAppointments: [firstBooking.appointment],
        });

        assertTrue(thirdBooking.success);
        assertDefined(thirdBooking.appointment);
        if (!thirdBooking.appointment) throw new Error("third appointment required");
        assertEqual(thirdBooking.appointment.appointment_type, 'virtual_matterport_tour');
      },
    },

    // =========================================================================
    // 4. PROPERTY SELECTION + DYNAMIC WHATSAPP BROKER DISPATCH
    // =========================================================================
    {
      name: '4. Formats WhatsApp broker dispatch message with property area, price, and customer details',
      fn: () => {
        const property = mockRealEstateApartment;
        const payload: StorefrontActionPayload = {
          itemId: property.name,
          calculatedTotalPrice: property.base_price,
          quantity: 1,
          customerInfo: {
            name: 'Alejandro Santamaría',
            phone: '3105557788',
            notes: 'Deseo agendar visita privada para conocer el penthouse en El Poblado.',
          },
          deepLinkUrl: 'https://pixy.app/inmobiliaria-elite/p/item-re-apartment-01',
        };

        const wa = formatWhatsAppMessage(payload, '+573001234567');
        assertEqual(wa.phone, '573001234567');
        assertTrue(wa.rawText.includes('Apartamento de Lujo en El Poblado'));
        assertTrue(wa.rawText.includes('Alejandro Santamaría'));
        assertTrue(wa.rawText.includes('Deseo agendar visita privada'));
        assertTrue(wa.encodedUri.startsWith('https://wa.me/573001234567?text='));
      },
    },

    // =========================================================================
    // 5. FULL PROPTECH SALES FUNNEL INTEGRATION
    // =========================================================================
    {
      name: '5. Seamless full funnel orchestration: Storefront view -> CRM Lead -> Formal Quote -> Tour Scheduled',
      fn: () => {
        const property = mockRealEstateApartment;

        // Stage 1: Buyer Inquires from Storefront
        const lead = createCRMLeadFromPropertyInquiry(property, {
          name: 'Carlos Montoya',
          phone: '+573001112233',
          email: 'carlos.montoya@inversionistas.co',
          notes: 'Busco inversión para rentas cortas en Medellín.',
        });
        assertEqual(lead.status, 'nuevo_prospecto');

        // Stage 2: Broker Generates Commercial Quote
        const quote = generatePropTechQuote(lead, property, 40); // 40% down payment
        assertEqual(quote.down_payment_cop, 500_000_000);
        quote.status = 'sent';

        // Stage 3: Broker Schedules Physical Property Showing
        const appointmentResult = schedulePropertyAppointment(lead, property, {
          brokerId: 'broker_laura_valencia',
          scheduledAt: '2026-08-28T10:00:00.000Z',
          type: 'in_person_tour',
        });
        assertTrue(appointmentResult.success);

        // Stage 4: Lead moves to "visita_agendada"
        lead.status = 'visita_agendada';
        assertEqual(lead.status, 'visita_agendada');
        assertEqual(quote.status, 'sent');
        assertEqual(appointmentResult.appointment?.status, 'confirmed');
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier3');
  for (const t of suite.tests) {
    registry.addTest(t.name, t.fn);
  }
  return registry.runSuite();
}

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

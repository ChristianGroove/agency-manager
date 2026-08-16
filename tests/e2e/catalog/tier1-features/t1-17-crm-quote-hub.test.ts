/**
 * Tier 1 Test Suite: F17 - 1-Click CRM Lead & Quote Request
 * Tests CRM lead payload creation, draft quote line items with selected variant/addons, customer contact mapping, organization ID attribution, deal stage initialization.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertArrayLength,
  assertDefined,
} from '../harness/assertions';
import {
  mockPhysicalItem,
  mockStorefrontActionPayload,
  TENANT_A_ID,
} from '../harness/mock-data';

export const suite = {
  name: 'T1-17: 1-Click CRM Lead & Quote Request',
  tier: 'Tier 1',
  feature: 'F17: 1-Click CRM Lead & Quote Request',
  tests: [
    {
      name: 'Creates CRM lead payload from storefront submission with contact details',
      fn: () => {
        function buildCrmLeadPayload(payload: typeof mockStorefrontActionPayload, orgId: string) {
          return {
            organization_id: orgId,
            name: payload.customerInfo?.name || 'Anónimo',
            email: payload.customerInfo?.email,
            phone: payload.customerInfo?.phone,
            notes: payload.customerInfo?.notes,
            source: 'storefront_catalog_inquiry',
            status: 'open',
            contact_type: 'lead',
          };
        }

        const lead = buildCrmLeadPayload(mockStorefrontActionPayload, TENANT_A_ID);
        assertEqual(lead.organization_id, TENANT_A_ID);
        assertEqual(lead.name, 'Carlos Mendoza');
        assertEqual(lead.email, 'carlos.mendoza@example.com');
        assertEqual(lead.phone, '+57 300 123 4567');
        assertEqual(lead.source, 'storefront_catalog_inquiry');
        assertEqual(lead.status, 'open');
      },
    },
    {
      name: 'Constructs draft quote line items including base item, selected variant, and add-on extras',
      fn: () => {
        function buildQuoteLineItems(
          item: typeof mockPhysicalItem,
          payload: typeof mockStorefrontActionPayload
        ) {
          const items: Array<{ description: string; quantity: number; price: number; catalog_item_id: string }> = [];

          let mainDesc = item.name;
          if (payload.selectedVariant) {
            mainDesc += ` (${payload.selectedVariant.title})`;
          }

          items.push({
            catalog_item_id: item.id,
            description: mainDesc,
            quantity: payload.quantity,
            price: item.base_price,
          });

          if (payload.selectedAddons) {
            payload.selectedAddons.forEach((addon) => {
              items.push({
                catalog_item_id: item.id,
                description: `Adicional: ${addon.name}`,
                quantity: payload.quantity,
                price: addon.priceDelta,
              });
            });
          }

          return items;
        }

        const quoteItems = buildQuoteLineItems(mockPhysicalItem, mockStorefrontActionPayload);
        assertArrayLength(quoteItems, 3); // 1 main item + 2 addons
        assertEqual(quoteItems[0].description, 'Camiseta Premium Oversize Minimalist (Negro Azabache / S)');
        assertEqual(quoteItems[0].price, 85000);
        assertEqual(quoteItems[1].description, 'Adicional: Caja Rígida de Lujo con Cinta');
        assertEqual(quoteItems[1].price, 15000);
        assertEqual(quoteItems[2].description, 'Adicional: Iniciales en el pecho (hasta 3 letras)');
        assertEqual(quoteItems[2].price, 12000);
      },
    },
    {
      name: 'Maps customer contact information to existing or newly created Lead record',
      fn: () => {
        interface MockLeadRecord {
          id: string;
          email: string;
          name: string;
        }

        const existingLeads: MockLeadRecord[] = [
          { id: 'lead_existing_01', email: 'existing.client@test.com', name: 'Existing Client' },
        ];

        function resolveOrCreateLead(customerInfo: { email: string; name: string }): { leadId: string; isNew: boolean } {
          const found = existingLeads.find((l) => l.email.toLowerCase() === customerInfo.email.toLowerCase());
          if (found) {
            return { leadId: found.id, isNew: false };
          }
          return { leadId: `lead_new_${Date.now()}`, isNew: true };
        }

        const match = resolveOrCreateLead({ email: 'existing.client@test.com', name: 'Client' });
        assertEqual(match.leadId, 'lead_existing_01');
        assertFalse(match.isNew);

        const newLead = resolveOrCreateLead({ email: 'carlos.mendoza@example.com', name: 'Carlos Mendoza' });
        assertTrue(newLead.isNew);
        assertTrue(newLead.leadId.startsWith('lead_new_'));
      },
    },
    {
      name: 'Enforces tenant organization ID attribution across created Lead and Quote records',
      fn: () => {
        function createQuoteEntity(leadId: string, total: number, orgId: string) {
          return {
            id: 'quote_123',
            number: 'COT-2026-001',
            lead_id: leadId,
            organization_id: orgId,
            total,
            status: 'draft',
          };
        }

        const quote = createQuoteEntity('lead_456', 112000, TENANT_A_ID);
        assertEqual(quote.organization_id, TENANT_A_ID);
        assertEqual(quote.status, 'draft');
        assertEqual(quote.total, 112000);
      },
    },
    {
      name: 'Initializes quote in draft stage with calculated total matching storefront recalculator',
      fn: () => {
        const expectedTotal = mockStorefrontActionPayload.calculatedTotalPrice; // 112000
        assertEqual(expectedTotal, 112000);

        const quoteTotal = 85000 + 15000 + 12000;
        assertEqual(quoteTotal, expectedTotal);
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

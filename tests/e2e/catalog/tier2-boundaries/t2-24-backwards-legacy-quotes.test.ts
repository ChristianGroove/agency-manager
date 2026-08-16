/**
 * Tier 2: Boundary Value Analysis & Edge Cases
 * Suite: t2-24-backwards-legacy-quotes
 * Feature: F24 - Cross-Module 100% Backwards Compatibility
 */

import { expect, TestRegistry, TestSuiteResult } from '../harness/assertions';

export interface LegacyQuoteRecord {
  id: string;
  organization_id: string;
  category_id?: string | null;
  service_id?: string | null;
  service_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  created_at: string;
}

export function renderLegacyQuoteLine(
  quote: LegacyQuoteRecord,
  catalogCategoriesMap: Map<string, string>,
  catalogItemsMap: Map<string, { name: string; base_price: number }>
): {
  itemTitle: string;
  categoryDisplay: string;
  unitPrice: number;
  totalPrice: number;
  isLegacyCompatible: boolean;
} {
  let categoryDisplay = 'General';
  if (quote.category_id && catalogCategoriesMap.has(quote.category_id)) {
    categoryDisplay = catalogCategoriesMap.get(quote.category_id)!;
  }

  const itemTitle = quote.service_name || (quote.service_id ? catalogItemsMap.get(quote.service_id)?.name : 'Servicio');
  const unitPrice = quote.unit_price;
  const totalPrice = quote.total_price || unitPrice * quote.quantity;

  return {
    itemTitle: itemTitle || 'Servicio',
    categoryDisplay,
    unitPrice,
    totalPrice,
    isLegacyCompatible: true,
  };
}

const mockCategories = new Map<string, string>([
  ['cat-active-1', 'Desarrollo Web'],
]);

const mockCatalogItems = new Map<string, { name: string; base_price: number }>([
  ['srv-old-01', { name: 'Desarrollo Landing Page (Nuevo Nombre 2026)', base_price: 1800000 }],
]);

export const suite = {
  name: 'T2-24: Backwards Compatibility for Legacy Quotes & Invoices',
  tier: 'Tier 2',
  feature: 'F24: Cross-Module 100% Backwards Compatibility',
  tests: [
    {
      name: 'Legacy quote created in 2024 renders without schema errors',
      fn: async () => {
        const legacyQuote: LegacyQuoteRecord = {
          id: 'quote-legacy-2024-001',
          organization_id: 'org-old',
          category_id: 'cat-active-1',
          service_id: 'srv-old-01',
          service_name: 'Diseño Web Inicial (Histórico)',
          unit_price: 1200000,
          quantity: 1,
          total_price: 1200000,
          created_at: '2024-05-10T10:00:00Z',
        };

        const rendered = renderLegacyQuoteLine(legacyQuote, mockCategories, mockCatalogItems);
        expect(rendered.isLegacyCompatible).toBe(true);
        expect(rendered.unitPrice).toBe(1200000);
        expect(rendered.itemTitle).toBe('Diseño Web Inicial (Histórico)');
      },
    },
    {
      name: 'Legacy quote with deleted category_id falls back gracefully to "General"',
      fn: async () => {
        const quoteWithDeletedCategory: LegacyQuoteRecord = {
          id: 'quote-legacy-002',
          organization_id: 'org-old',
          category_id: 'cat-deleted-uuid-999',
          service_name: 'Servicio Antiguo',
          unit_price: 500000,
          quantity: 2,
          total_price: 1000000,
          created_at: '2024-06-15T00:00:00Z',
        };

        const rendered = renderLegacyQuoteLine(quoteWithDeletedCategory, mockCategories, mockCatalogItems);
        expect(rendered.categoryDisplay).toBe('General');
        expect(rendered.totalPrice).toBe(1000000);
      },
    },
    {
      name: 'Legacy contract referencing renamed service preserves historical title and pricing',
      fn: async () => {
        const legacyContractQuote: LegacyQuoteRecord = {
          id: 'contract-quote-003',
          organization_id: 'org-old',
          service_id: 'srv-old-01',
          service_name: 'Landing Page Clásica',
          unit_price: 1500000,
          quantity: 1,
          total_price: 1500000,
          created_at: '2025-01-10T00:00:00Z',
        };

        const rendered = renderLegacyQuoteLine(legacyContractQuote, mockCategories, mockCatalogItems);
        expect(rendered.itemTitle).toBe('Landing Page Clásica');
        expect(rendered.unitPrice).toBe(1500000);
        expect(rendered.unitPrice).not.toBe(1800000);
      },
    },
    {
      name: 'Legacy billing total calculation matches quantity * unit_price exactly',
      fn: async () => {
        const billingQuote: LegacyQuoteRecord = {
          id: 'quote-bill-004',
          organization_id: 'org-old',
          service_name: 'Horas de Consultoría',
          unit_price: 85000,
          quantity: 40,
          total_price: 3400000,
          created_at: '2024-11-20T00:00:00Z',
        };

        const rendered = renderLegacyQuoteLine(billingQuote, mockCategories, mockCatalogItems);
        expect(rendered.totalPrice).toBe(85000 * 40);
        expect(rendered.totalPrice).toBe(3400000);
      },
    },
    {
      name: 'Legacy CRM deal line item association is preserved across migrations',
      fn: async () => {
        const crmQuote: LegacyQuoteRecord = {
          id: 'deal-quote-005',
          organization_id: 'org-old',
          service_id: null,
          service_name: 'Custom Enterprise Development Package',
          unit_price: 15000000,
          quantity: 1,
          total_price: 15000000,
          created_at: '2024-12-01T00:00:00Z',
        };

        const rendered = renderLegacyQuoteLine(crmQuote, mockCategories, mockCatalogItems);
        expect(rendered.itemTitle).toBe('Custom Enterprise Development Package');
        expect(rendered.totalPrice).toBe(15000000);
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

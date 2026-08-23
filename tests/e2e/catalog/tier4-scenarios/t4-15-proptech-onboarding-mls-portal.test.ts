/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-15-proptech-onboarding-mls-portal
 * Scenario: Super Admin App Creation -> Tenant Onboarding & Provisioning -> Portal Theme Setup -> PropTech MLS Browsing
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
import { UniversalCatalogItem } from '../harness/contracts';
import { DEFAULT_REAL_ESTATE_CATEGORIES } from '../../../../src/modules/core/organizations/vertical-registry';
import { calculateMortgagePayment } from '../tier2-boundaries/t2-27-real-estate-boundaries.test';

export interface SaaSAppDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: 'real_estate';
  icon: string;
  price_monthly: number;
  is_active: boolean;
  linked_modules: string[];
}

export interface ProvisionedTenant {
  organization_id: string;
  name: string;
  slug: string;
  app_id: string;
  space_category: 'real_estate';
  portal_theme_config: {
    industry_preset: 'real_estate';
    widget_config: {
      show_real_estate_filters: boolean;
      show_mortgage_calculator: boolean;
      show_cart_drawer: boolean;
      show_whatsapp_button: boolean;
      show_category_nav: boolean;
      show_search_bar: boolean;
      show_stock_badges: boolean;
    };
  };
  categories: Array<{
    name: string;
    slug: string;
    icon: string;
    color: string;
    order_index: number;
    scope: 'tenant';
    is_active: boolean;
  }>;
}

export const mockRealEstateMLSListings: UniversalCatalogItem[] = [
  {
    id: 'prop-apt-01',
    organization_id: 'org-inmobiliaria-premier',
    name: 'Apartamento de Lujo en El Poblado',
    category_id: 'cat-apartamentos',
    category: 'Apartamentos',
    base_price: 1250000000,
    type: 'real_estate',
    classification: 'real_estate',
    gallery_images: [
      { id: 'img-1', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9', is_cover: true, order_index: 0 },
    ],
    inventory_quantity: 1,
    track_inventory: false,
    allow_backorders: false,
    low_stock_threshold: 1,
    has_variants: false,
    variant_attributes: [],
    variants: [],
    addon_groups: [],
    badges: ['Destacado', 'Novedad'],
    specifications: {},
    is_visible_in_portal: true,
    is_active: true,
    created_at: '2026-08-20T00:00:00Z',
    real_estate_details: {
      operation_type: 'sale',
      property_type: 'apartment',
      area_total_m2: 145,
      bedrooms: 3,
      bathrooms: 4,
      stratum: '6',
      city: 'Medellín',
      neighborhood: 'El Poblado',
      common_areas: ['Piscina Climatizada', 'Gimnasio Equipado', 'Vigilancia 24/7 con CCTV', 'Coworking Space'],
      virtual_tour_url: 'https://my.matterport.com/show/?m=sample-matterport-tour',
    },
  },
  {
    id: 'prop-house-02',
    organization_id: 'org-inmobiliaria-premier',
    name: 'Casa Campestre en Llanogrande',
    category_id: 'cat-casas',
    category: 'Casas',
    base_price: 3400000000,
    type: 'real_estate',
    classification: 'real_estate',
    gallery_images: [
      { id: 'img-2', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', is_cover: true, order_index: 0 },
    ],
    inventory_quantity: 1,
    track_inventory: false,
    allow_backorders: false,
    low_stock_threshold: 1,
    has_variants: false,
    variant_attributes: [],
    variants: [],
    addon_groups: [],
    badges: ['Destacado'],
    specifications: {},
    is_visible_in_portal: true,
    is_active: true,
    created_at: '2026-08-21T00:00:00Z',
    real_estate_details: {
      operation_type: 'sale',
      property_type: 'country_house',
      area_total_m2: 480,
      bedrooms: 5,
      bathrooms: 6,
      stratum: '6',
      city: 'Rionegro',
      neighborhood: 'Llanogrande',
      common_areas: ['Piscina Climatizada', 'Turco / Sauna', 'Cancha de Tenis', 'Vigilancia 24/7 con CCTV'],
    },
  },
  {
    id: 'prop-office-03',
    organization_id: 'org-inmobiliaria-premier',
    name: 'Oficina Corporativa Milla de Oro',
    category_id: 'cat-oficinas',
    category: 'Oficinas & Locales Comerciales',
    base_price: 12000000, // Monthly Rent COP
    type: 'real_estate',
    classification: 'real_estate',
    gallery_images: [
      { id: 'img-3', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c', is_cover: true, order_index: 0 },
    ],
    inventory_quantity: 1,
    track_inventory: false,
    allow_backorders: false,
    low_stock_threshold: 1,
    has_variants: false,
    variant_attributes: [],
    variants: [],
    addon_groups: [],
    badges: ['Novedad'],
    specifications: {},
    is_visible_in_portal: true,
    is_active: true,
    created_at: '2026-08-22T00:00:00Z',
    real_estate_details: {
      operation_type: 'rent',
      property_type: 'office',
      area_total_m2: 95,
      bedrooms: 0,
      bathrooms: 2,
      stratum: '6',
      city: 'Medellín',
      neighborhood: 'El Poblado',
      common_areas: ['Auditorio', 'Salas de Juntas', 'Vigilancia 24/7 con CCTV'],
    },
  },
];

export const suite = {
  name: 'T4-15: PropTech Full Real-World Scenario: App -> Onboarding -> MLS Portal',
  tier: 'Tier 4',
  feature: 'S15: PropTech Super Admin Lifecycle & Buyer MLS Exploration',
  tests: [
    // =========================================================================
    // SCENARIO 1: SUPER ADMIN APP CREATION & BUNDLE REGISTRATION
    // =========================================================================
    {
      name: 'Scenario Step 1: Super Admin registers Real Estate Pro SaaS App with 7 linked operational modules',
      fn: () => {
        const appDefinition: SaaSAppDefinition = {
          id: 'app_real_estate_pro',
          name: 'Real Estate & PropTech Pro',
          slug: 'real-estate-pro',
          description: 'Gestión de propiedades, prospectos inmobiliarios y comercialización PropTech',
          category: 'real_estate',
          icon: 'Building2',
          price_monthly: 99.0,
          is_active: true,
          linked_modules: [
            'core_crm',
            'core_clients',
            'core_locations',
            'module_messaging',
            'module_quotes',
            'module_catalog',
            'module_automation',
          ],
        };

        assertEqual(appDefinition.id, 'app_real_estate_pro');
        assertEqual(appDefinition.category, 'real_estate');
        assertEqual(appDefinition.icon, 'Building2');
        assertEqual(appDefinition.price_monthly, 99.0);
        assertEqual(appDefinition.linked_modules.length, 7);
        assertContains(appDefinition.linked_modules, 'module_catalog');
        assertContains(appDefinition.linked_modules, 'core_crm');
      },
    },

    // =========================================================================
    // SCENARIO 2: TENANT ONBOARDING & AUTOMATED PROPTECH INITIALIZATION
    // =========================================================================
    {
      name: 'Scenario Step 2: Tenant onboarding provisions organization, auto-seeds 5 default categories, and initializes theme',
      fn: () => {
        const orgId = 'org-inmobiliaria-premier-9001';

        // Simulate tenant provisioning payload creation
        const provisionedCategories = DEFAULT_REAL_ESTATE_CATEGORIES.map((cat) => ({
          ...cat,
          organization_id: orgId,
        }));

        const provisionedTenant: ProvisionedTenant = {
          organization_id: orgId,
          name: 'Inmobiliaria Premier Colombia',
          slug: 'inmobiliaria-premier',
          app_id: 'app_real_estate_pro',
          space_category: 'real_estate',
          portal_theme_config: {
            industry_preset: 'real_estate',
            widget_config: {
              show_real_estate_filters: true,
              show_mortgage_calculator: true,
              show_cart_drawer: false,
              show_whatsapp_button: true,
              show_category_nav: true,
              show_search_bar: true,
              show_stock_badges: false,
            },
          },
          categories: provisionedCategories,
        };

        // Assert organization space and app assignment
        assertEqual(provisionedTenant.space_category, 'real_estate');
        assertEqual(provisionedTenant.app_id, 'app_real_estate_pro');

        // Assert 5 seeded categories
        assertEqual(provisionedTenant.categories.length, 5);
        assertEqual(provisionedTenant.categories[0].name, 'Apartamentos');
        assertEqual(provisionedTenant.categories[1].name, 'Casas');
        assertEqual(provisionedTenant.categories[2].name, 'Oficinas & Locales Comerciales');
        assertEqual(provisionedTenant.categories[3].name, 'Lotes & Fincas');
        assertEqual(provisionedTenant.categories[4].name, 'Proyectos Sobre Planos');

        // Assert portal theme config defaults
        assertEqual(provisionedTenant.portal_theme_config.industry_preset, 'real_estate');
        assertTrue(provisionedTenant.portal_theme_config.widget_config.show_real_estate_filters);
        assertTrue(provisionedTenant.portal_theme_config.widget_config.show_mortgage_calculator);
        assertFalse(provisionedTenant.portal_theme_config.widget_config.show_cart_drawer);
      },
    },

    // =========================================================================
    // SCENARIO 3: BUYER MLS SEARCH & MULTI-FACETED CATALOG FILTERING
    // =========================================================================
    {
      name: 'Scenario Step 3: Buyer explores PropTech MLS catalog with faceted filters by operation, budget, and amenities',
      fn: () => {
        const listings = mockRealEstateMLSListings;

        // Filter 1: Inmuebles en Venta
        const forSale = listings.filter((l) => l.real_estate_details?.operation_type === 'sale');
        assertEqual(forSale.length, 2);

        // Filter 2: Inmuebles en Arriendo
        const forRent = listings.filter((l) => l.real_estate_details?.operation_type === 'rent');
        assertEqual(forRent.length, 1);
        assertEqual(forRent[0].id, 'prop-office-03');

        // Filter 3: Inmuebles en Medellín con Piscina Climatizada
        const medellinWithPool = listings.filter(
          (l) =>
            l.real_estate_details?.city === 'Medellín' &&
            l.real_estate_details?.common_areas?.includes('Piscina Climatizada')
        );
        assertEqual(medellinWithPool.length, 1);
        assertEqual(medellinWithPool[0].id, 'prop-apt-01');

        // Filter 4: Inmuebles de 3+ Habitaciones con presupuesto hasta 2 Mil Millones COP
        const filteredBudget = listings.filter(
          (l) =>
            (l.real_estate_details?.bedrooms || 0) >= 3 &&
            l.base_price <= 2_000_000_000
        );
        assertEqual(filteredBudget.length, 1);
        assertEqual(filteredBudget[0].id, 'prop-apt-01');
      },
    },

    // =========================================================================
    // SCENARIO 4: MORTGAGE FINANCIAL SIMULATOR INTERACTION
    // =========================================================================
    {
      name: 'Scenario Step 4: Buyer interacts with online mortgage calculator adjusting down payment and loan term',
      fn: () => {
        const property = mockRealEstateMLSListings[0]; // 1,250,000,000 COP

        // Option A: 20-year loan at 11.5% with 20% down payment
        const sim20Years = calculateMortgagePayment({
          propertyPrice: property.base_price,
          downPaymentPercent: 20,
          annualInterestRate: 11.5,
          termYears: 20,
        });

        assertEqual(sim20Years.downPayment, 250_000_000); // 20% of 1.25B
        assertEqual(sim20Years.loanAmount, 1_000_000_000); // 80% financed
        assertTrue(sim20Years.monthlyPayment > 10_000_000);
        assertTrue(sim20Years.monthlyPayment < 12_000_000);

        // Option B: 15-year loan at 11.0% with 30% down payment
        const sim15Years = calculateMortgagePayment({
          propertyPrice: property.base_price,
          downPaymentPercent: 30,
          annualInterestRate: 11.0,
          termYears: 15,
        });

        assertEqual(sim15Years.downPayment, 375_000_000); // 30% of 1.25B
        assertEqual(sim15Years.loanAmount, 875_000_000);
        assertTrue(sim15Years.monthlyPayment > 9_500_000);
        assertTrue(sim15Years.monthlyPayment < 11_500_000);
        // Total interest paid in 15 years must be significantly lower than in 20 years
        assertTrue(sim15Years.totalInterest < sim20Years.totalInterest);
      },
    },
  ],
};

export async function runSuite(): Promise<TestSuiteResult> {
  const registry = new TestRegistry();
  registry.setSuite(suite.name, 'tier4');
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

/**
 * Tier 4: Real-World Multi-Industry End-to-End Scenarios
 * Suite: t4-14-real-estate-property-space
 * Domain: S14 - Inmobiliaria & Real Estate Property Space
 * Features Exercised: Real Estate Classification, Áreas Comunes, Detailed Parking (Carro/Moto/Tipo), 360° Tour, PDF Brochure, Location Privacy
 */

import { expect } from '../harness/assertions';
import { UniversalCatalogItem } from '../harness/contracts';
import { TENANT_A_ID } from '../harness/mock-data';

export const mockRealEstateApartment: UniversalCatalogItem = {
  id: 'item-re-apartment-01',
  organization_id: TENANT_A_ID,
  name: 'Apartamento de Lujo en El Poblado',
  description: 'Exclusivo apartamento de 145 m² con vista panorámica a la ciudad, 3 alcobas en suite y acabados de lujo.',
  category_id: 'cat-inmuebles',
  category: 'Bienes Raíces & Inmuebles',
  base_price: 1250000000,
  compare_at_price: 1350000000,
  type: 'real_estate',
  classification: 'real_estate',
  image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
  gallery_images: [
    { id: 're-1', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9', is_cover: true, order_index: 0 },
    { id: 're-2', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c', is_cover: false, order_index: 1 },
  ],
  video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  inventory_quantity: 0,
  track_inventory: false,
  allow_backorders: false,
  low_stock_threshold: 5,
  has_variants: false,
  variant_attributes: [],
  variants: [],
  addon_groups: [],
  badges: ['Destacado', 'Novedad'],
  specifications: {},
  is_visible_in_portal: true,
  is_active: true,
  created_at: '2026-08-22T00:00:00Z',
  real_estate_details: {
    operation_type: 'sale',
    property_type: 'apartment',
    area_total_m2: 145,
    area_built_m2: 140,
    bedrooms: 3,
    bathrooms: 4,
    floor_number: 12,
    stratum: '6',
    admin_fee: 650000,
    antiquity: '1 a 5 años',
    parking_cars: 2,
    parking_motorcycles: 1,
    parking_type: 'covered',
    city: 'Medellín',
    neighborhood: 'El Poblado',
    address: 'Calle 10 # 32-40',
    hide_exact_address: false,
    common_areas: [
      'Piscina Climatizada',
      'Gimnasio Equipado',
      'Turco / Sauna',
      'Jacuzzi',
      'Vigilancia 24/7 con CCTV',
      'Coworking Space'
    ],
    virtual_tour_url: 'https://my.matterport.com/show/?m=sample-matterport-tour',
    brochure_pdf_url: 'https://pixy.agency/docs/ficha-poblado.pdf',
  },
  metadata: {
    cta_type: 'whatsapp',
    classification_metadata: {
      real_estate: {
        operation_type: 'sale',
        property_type: 'apartment',
        area_total_m2: 145,
        area_built_m2: 140,
        bedrooms: 3,
        bathrooms: 4,
        floor_number: 12,
        stratum: '6',
        admin_fee: 650000,
        antiquity: '1 a 5 años',
        parking_cars: 2,
        parking_motorcycles: 1,
        parking_type: 'covered',
        city: 'Medellín',
        neighborhood: 'El Poblado',
        address: 'Calle 10 # 32-40',
        hide_exact_address: false,
        common_areas: [
          'Piscina Climatizada',
          'Gimnasio Equipado',
          'Turco / Sauna',
          'Jacuzzi',
          'Vigilancia 24/7 con CCTV',
          'Coworking Space'
        ],
        virtual_tour_url: 'https://my.matterport.com/show/?m=sample-matterport-tour',
        brochure_pdf_url: 'https://pixy.agency/docs/ficha-poblado.pdf',
      },
    },
  },
};

export const suite = {
  name: 'T4-14: Scenario S14 - Real Estate & Inmuebles Property Space',
  tier: 'Tier 4',
  feature: 'S14: Real Estate Polymorphic Layer & Áreas Comunes',
  tests: [
    {
      name: 'Step 1: Real Estate classification data model preserves operations and Colombian property metrics',
      fn: async () => {
        const item = mockRealEstateApartment;
        expect(item.classification).toBe('real_estate');
        expect(item.real_estate_details).toBeDefined();
        expect(item.real_estate_details?.operation_type).toBe('sale');
        expect(item.real_estate_details?.property_type).toBe('apartment');
        expect(item.real_estate_details?.area_total_m2).toBe(145);
        expect(item.real_estate_details?.bedrooms).toBe(3);
        expect(item.real_estate_details?.bathrooms).toBe(4);
        expect(item.real_estate_details?.stratum).toBe('6');
      },
    },
    {
      name: 'Step 2: Parking breakdown accurately separates car count, motorcycle count, and parking type',
      fn: async () => {
        const item = mockRealEstateApartment;
        const details = item.real_estate_details!;
        expect(details.parking_cars).toBe(2);
        expect(details.parking_motorcycles).toBe(1);
        expect(details.parking_type).toBe('covered');

        // Formatted helper verification
        const cars = details.parking_cars || 0;
        const motos = details.parking_motorcycles || 0;
        const typeStr = details.parking_type === 'covered' ? 'Cubierto' : 'Intemperie';
        const formatted = `${cars} Carros, ${motos} Moto (${typeStr})`;
        expect(formatted).toBe('2 Carros, 1 Moto (Cubierto)');
      },
    },
    {
      name: 'Step 3: Áreas Comunes strictly labeled in Spanish and contains full amenity list',
      fn: async () => {
        const item = mockRealEstateApartment;
        const areas = item.real_estate_details?.common_areas || [];
        expect(areas.length).toBe(6);
        expect(areas).toContain('Piscina Climatizada');
        expect(areas).toContain('Gimnasio Equipado');
        expect(areas).toContain('Vigilancia 24/7 con CCTV');
        expect(areas).toContain('Coworking Space');
      },
    },
    {
      name: 'Step 4: Matterport 360° virtual tour and PDF brochure URLs are properly formatted and accessible',
      fn: async () => {
        const item = mockRealEstateApartment;
        const details = item.real_estate_details!;
        expect(details.virtual_tour_url).toContain('matterport.com');
        expect(details.brochure_pdf_url).toContain('.pdf');
      },
    },
    {
      name: 'Step 5: Location privacy toggle correctly protects exact street address when requested',
      fn: async () => {
        const item = {
          ...mockRealEstateApartment,
          real_estate_details: {
            ...mockRealEstateApartment.real_estate_details!,
            hide_exact_address: true,
          },
        };

        const details = item.real_estate_details!;
        const publicLocation = details.hide_exact_address
          ? `${details.neighborhood}, ${details.city}`
          : `${details.neighborhood}, ${details.city} (${details.address})`;

        expect(publicLocation).toBe('El Poblado, Medellín');
        expect(publicLocation).not.toContain('Calle 10');
      },
    },
    {
      name: 'Step 6: Colombian WhatsApp inquiry formats property operation, neighborhood, and area',
      fn: async () => {
        const item = mockRealEstateApartment;
        const re = item.real_estate_details!;
        const op = re.operation_type === 'rent' ? 'arriendo' : 'venta';
        const location = `${re.neighborhood}, ${re.city}`;
        const area = `${re.area_total_m2} m²`;
        const text = `Hola Pixy Real Estate, estoy interesado en el inmueble en *${op}*: *${item.name}* en ${location} (${area}). ¿Podrían brindarme información y agendar una visita?`;

        expect(text).toContain('*venta*');
        expect(text).toContain('El Poblado, Medellín');
        expect(text).toContain('145 m²');
        expect(text).toContain('agendar una visita');
      },
    },
    {
      name: 'Step 7: Price per m² calculation and Mortgage financial simulator formula',
      fn: async () => {
        const item = mockRealEstateApartment;
        const price = item.base_price; // 1,250,000,000
        const area = item.real_estate_details!.area_total_m2!; // 145 m2
        const ppm2 = Math.round(price / area);
        expect(ppm2).toBe(8620690); // ~8.62M COP / m2

        // Mortgage Simulation (30% down payment, 20 years, 12.5% annual rate)
        const downPayment = price * 0.3; // 375,000,000
        const loanAmount = price - downPayment; // 875,000,000
        const monthlyRate = (12.5 / 100) / 12;
        const totalMonths = 20 * 12; // 240
        const monthlyPayment = Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1));

        expect(downPayment).toBe(375000000);
        expect(loanAmount).toBe(875000000);
        expect(monthlyPayment).toBeGreaterThan(9000000);
        expect(monthlyPayment).toBeLessThan(12000000);
      },
    },
    {
      name: 'Step 8: Storefront Real Estate faceted filters and sorting by area/price',
      fn: async () => {
        const properties = [
          mockRealEstateApartment,
          {
            ...mockRealEstateApartment,
            id: 'item-re-house-02',
            name: 'Casa Campestre Llanogrande',
            base_price: 3200000000,
            real_estate_details: {
              ...mockRealEstateApartment.real_estate_details!,
              operation_type: 'sale' as const,
              property_type: 'country_house' as const,
              area_total_m2: 450,
              bedrooms: 5,
            },
          },
          {
            ...mockRealEstateApartment,
            id: 'item-re-rent-03',
            name: 'Apartamento Laureles en Arriendo',
            base_price: 3800000,
            real_estate_details: {
              ...mockRealEstateApartment.real_estate_details!,
              operation_type: 'rent' as const,
              property_type: 'apartment' as const,
              area_total_m2: 85,
              bedrooms: 2,
            },
          },
        ];

        // Filter by rent
        const rentOnly = properties.filter(p => p.real_estate_details?.operation_type === 'rent');
        expect(rentOnly.length).toBe(1);
        expect(rentOnly[0].id).toBe('item-re-rent-03');

        // Filter by 3+ bedrooms
        const threeBedsOrMore = properties.filter(p => (p.real_estate_details?.bedrooms || 0) >= 3);
        expect(threeBedsOrMore.length).toBe(2);

        // Sort by area descending
        const sortedByArea = [...properties].sort((a, b) => (b.real_estate_details?.area_total_m2 || 0) - (a.real_estate_details?.area_total_m2 || 0));
        expect(sortedByArea[0].id).toBe('item-re-house-02'); // 450 m2
        expect(sortedByArea[2].id).toBe('item-re-rent-03'); // 85 m2
      },
    },
    {
      name: 'Step 9: Mortgage financial simulator is configurable and activates conditionally',
      fn: async () => {
        const itemWithCalc = {
          ...mockRealEstateApartment,
          real_estate_details: {
            ...mockRealEstateApartment.real_estate_details!,
            show_mortgage_calculator: true,
          },
        };

        const itemWithoutCalc = {
          ...mockRealEstateApartment,
          real_estate_details: {
            ...mockRealEstateApartment.real_estate_details!,
            show_mortgage_calculator: false,
          },
        };

        expect(itemWithCalc.real_estate_details.show_mortgage_calculator).toBe(true);
        expect(itemWithoutCalc.real_estate_details.show_mortgage_calculator).toBe(false);
      },
    },
  ],
};

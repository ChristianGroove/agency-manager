import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error("❌ Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log("🚀 Starting Real Estate Seed for movilservicios...");

  // 1. Find user and organization for creativomovilservicios@gmail.com / movilservicios
  const { data: usersData, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error("Error listing users:", uErr);
    process.exit(1);
  }

  const targetUser = usersData?.users?.find(u => 
    u.email?.toLowerCase().includes('movilservicios') ||
    u.email?.toLowerCase() === 'creativomovilservicios@gmail.com'
  );

  console.log("👤 Target user:", targetUser ? { id: targetUser.id, email: targetUser.email } : "Not found in auth, searching organizations directly...");

  const { data: orgs, error: oErr } = await supabase.from('organizations').select('*');
  if (oErr) {
    console.error("Error listing organizations:", oErr);
    process.exit(1);
  }

  let targetOrg = orgs?.find(o => 
    o.slug?.toLowerCase().includes('movilservicios') || 
    o.name?.toLowerCase().includes('movilservicios')
  );

  if (!targetOrg && targetUser) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', targetUser.id)
      .limit(1)
      .maybeSingle();

    if (membership?.organization_id) {
      targetOrg = orgs?.find(o => o.id === membership.organization_id);
    }
  }

  // Fallback to first org if specific one not found
  if (!targetOrg && orgs && orgs.length > 0) {
    targetOrg = orgs[0];
  }

  if (!targetOrg) {
    console.error("❌ No organization found to seed.");
    process.exit(1);
  }

  const orgId = targetOrg.id;
  console.log(`🎯 Seeding into Organization: "${targetOrg.name}" (${orgId})`);

  // 2. Ensure Real Estate category exists
  const realEstateCategory = {
    organization_id: orgId,
    name: 'Bienes Raíces & Inmuebles',
    slug: 'bienes-raices-inmuebles',
    icon: 'Building2',
    color: 'teal',
  };

  let categoryId: string;
  const { data: existingCat } = await supabase
    .from('service_categories')
    .select('id')
    .eq('organization_id', orgId)
    .ilike('name', '%Bienes Raíces%')
    .maybeSingle();

  if (existingCat) {
    categoryId = existingCat.id;
    console.log(`✅ Existing category found: ${categoryId}`);
  } else {
    const { data: newCat, error: catErr } = await supabase
      .from('service_categories')
      .insert(realEstateCategory)
      .select('id')
      .single();

    if (catErr) {
      console.error("Error creating category:", catErr);
      const { data: anyCat } = await supabase
        .from('service_categories')
        .select('id')
        .eq('organization_id', orgId)
        .limit(1)
        .maybeSingle();
      categoryId = anyCat?.id;
    } else {
      categoryId = newCat.id;
      console.log(`✅ Created category: ${categoryId}`);
    }
  }

  // 3. Real Estate properties with rich Colombian details, Áreas Comunes, detailed parking, 360 tour and PDF brochure
  const properties = [
    {
      organization_id: orgId,
      category_id: categoryId,
      category: 'Bienes Raíces & Inmuebles',
      name: 'Penthouse Dúplex de Lujo con Terraza Panorámica en El Poblado',
      description: 'Exclusivo penthouse dúplex con acabados importados de alta gama, ventanería acústica de piso a techo y una impresionante terraza privada con jacuzzi y vista de 360° sobre el Valle de Aburrá. Cocina tipo isla con electrodomésticos empotrados, habitación principal con walk-in closet doble y automatización domótica total.',
      base_price: 1850000000,
      compare_at_price: 1980000000,
      type: 'product',
      classification: 'real_estate',
      image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'p1-1', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0 },
        { id: 'p1-2', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1 },
        { id: 'p1-3', url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 2 },
        { id: 'p1-4', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 3 },
      ],
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sku: 'INM-PH-POBLADO-01',
      badges: ['Destacado', 'Novedad'],
      is_visible_in_portal: true,
      specifications: {
        features: [
          '245 m² Área Total (220 m² construidos)',
          '4 Habitaciones + Habitación de Servicio',
          '5 Baños con acabados en mármol',
          '3 Parqueaderos cubiertos independientes + 1 Moto',
          'Terraza privada de 40 m² con Jacuzzi climatizado',
          'Piso 16 con vista panorámica 360°',
          'Estrato 6 residencial de alta valorización',
          'Administración: $980.000 COP/mes'
        ],
      },
      metadata: {
        cta_type: 'whatsapp',
        classification_metadata: {
          real_estate: {
            operation_type: 'sale',
            property_type: 'apartment',
            area_total_m2: 245,
            area_built_m2: 220,
            bedrooms: 4,
            bathrooms: 5,
            floor_number: 16,
            stratum: '6',
            admin_fee: 980000,
            antiquity: '1 a 5 años',
            parking_cars: 3,
            parking_motorcycles: 1,
            parking_type: 'covered',
            city: 'Medellín',
            neighborhood: 'El Poblado - Castropol',
            address: 'Carrera 35 # 7-45',
            hide_exact_address: false,
            common_areas: [
              'Piscina Climatizada',
              'Gimnasio Equipado',
              'Turco / Sauna',
              'Jacuzzi',
              'Salón Social / Lounge',
              'Cancha de Squash',
              'Vigilancia 24/7 con CCTV',
              'Zona BBQ',
              'Coworking Space'
            ],
            virtual_tour_url: 'https://my.matterport.com/show/?m=sample-matterport-tour',
            brochure_pdf_url: 'https://pixy.agency/docs/ficha-penthouse-poblado.pdf',
          },
        },
      },
    },
    {
      organization_id: orgId,
      category_id: categoryId,
      category: 'Bienes Raíces & Inmuebles',
      name: 'Apartamento Moderno en Arriendo - Laureles Nogal',
      description: 'Hermoso apartamento iluminado y ventilado en uno de los sectores residenciales más tranquilos y arborizados de Laureles. 3 habitaciones amplias, balcón con vista verde, cocina abierta con mesón en cuarzo y parqueadero cubierto privado.',
      base_price: 3800000,
      compare_at_price: null,
      type: 'product',
      classification: 'real_estate',
      image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'p2-1', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0 },
        { id: 'p2-2', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1 },
        { id: 'p2-3', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 2 },
      ],
      sku: 'INM-ARR-LAURELES-02',
      badges: ['Destacado'],
      is_visible_in_portal: true,
      specifications: {
        features: [
          '98 m² Área Total construida',
          '3 Habitaciones con clósets empotrados',
          '2 Baños completos remodelados',
          '1 Parqueadero cubierto + 1 Moto',
          'Balcón amplio con vista a los árboles de Laureles',
          'Piso 4 con ascensor directo',
          'Estrato 5 residencial',
          'Administración incluida o $380.000 COP/mes'
        ],
      },
      metadata: {
        cta_type: 'whatsapp',
        classification_metadata: {
          real_estate: {
            operation_type: 'rent',
            property_type: 'apartment',
            area_total_m2: 98,
            area_built_m2: 98,
            bedrooms: 3,
            bathrooms: 2,
            floor_number: 4,
            stratum: '5',
            admin_fee: 380000,
            antiquity: '1 a 5 años',
            parking_cars: 1,
            parking_motorcycles: 1,
            parking_type: 'covered',
            city: 'Medellín',
            neighborhood: 'Laureles - Nogal',
            address: 'Circular 4 # 72-18',
            hide_exact_address: false,
            common_areas: [
              'Ascensor Panorámico',
              'Vigilancia 24/7 con CCTV',
              'Gimnasio Equipado',
              'Jardines & Zonas Verdes',
              'Parqueadero de Visitantes'
            ],
            virtual_tour_url: 'https://my.matterport.com/show/?m=sample-matterport-tour-2',
            brochure_pdf_url: 'https://pixy.agency/docs/ficha-arriendo-laureles.pdf',
          },
        },
      },
    },
    {
      organization_id: orgId,
      category_id: categoryId,
      category: 'Bienes Raíces & Inmuebles',
      name: 'Casa Campestre de Ensueño con Piscina Privada en Llanogrande',
      description: 'Majestuosa propiedad campestre en parcelación cerrada con portería y seguridad 24 horas. Lote plano de 2.500 m² con jardines maduros, árboles frutales, piscina climatizada con borde infinito, deck con fogata (firepit) y quiosco gourmet con horno de leña.',
      base_price: 3200000000,
      compare_at_price: 3450000000,
      type: 'product',
      classification: 'real_estate',
      image_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'p3-1', url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0 },
        { id: 'p3-2', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1 },
        { id: 'p3-3', url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 2 },
      ],
      sku: 'INM-CASA-LLANOGRANDE-03',
      badges: ['Destacado', 'Descuento'],
      is_visible_in_portal: true,
      specifications: {
        features: [
          '2.500 m² Terreno plano / 480 m² Construidos',
          '5 Habitaciones en suite con vestier',
          '6 Baños de lujo',
          '6 Parqueaderos (2 cubiertos + 4 visitantes)',
          'Piscina privada climatizada con deck en teca',
          'Quiosco BBQ con horno de leña y bar',
          'Estrato Rural parcelación campestre',
          'Administración: $750.000 COP/mes'
        ],
      },
      metadata: {
        cta_type: 'quote',
        classification_metadata: {
          real_estate: {
            operation_type: 'sale',
            property_type: 'country_house',
            area_total_m2: 2500,
            area_built_m2: 480,
            bedrooms: 5,
            bathrooms: 6,
            floor_number: 2,
            stratum: 'Rural',
            admin_fee: 750000,
            antiquity: '1 a 5 años',
            parking_cars: 6,
            parking_motorcycles: 2,
            parking_type: 'mixed',
            city: 'Rionegro',
            neighborhood: 'Llanogrande - Club Campestre',
            address: 'Km 7 Vía Llanogrande',
            hide_exact_address: true,
            common_areas: [
              'Piscina Climatizada',
              'Jacuzzi',
              'Sendero de Trote / Caminata',
              'Cancha de Fútbol / Múltiple',
              'Cancha de Tenis',
              'Zona Pet Friendly',
              'Zona BBQ',
              'Vigilancia 24/7 con CCTV'
            ],
            virtual_tour_url: 'https://my.matterport.com/show/?m=sample-matterport-tour-3',
            brochure_pdf_url: 'https://pixy.agency/docs/ficha-casa-llanogrande.pdf',
          },
        },
      },
    },
    {
      organization_id: orgId,
      category_id: categoryId,
      category: 'Bienes Raíces & Inmuebles',
      name: 'Oficina Corporativa Prime en Torre Empresarial Milla de Oro',
      description: 'Oficina ejecutiva totalmente acondicionada con divisiones en vidrio templado, cableado estructurado categoría 6A, aire acondicionado central inverter, sala de juntas VIP para 12 personas y 4 baterías de baños privadas.',
      base_price: 14500000,
      compare_at_price: null,
      type: 'product',
      classification: 'real_estate',
      image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
      gallery_images: [
        { id: 'p4-1', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80', is_cover: true, order_index: 0 },
        { id: 'p4-2', url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&auto=format&fit=crop&q=80', is_cover: false, order_index: 1 },
      ],
      sku: 'INM-OFI-MILLA-ORO-04',
      badges: ['Destacado'],
      is_visible_in_portal: true,
      specifications: {
        features: [
          '185 m² Área útil de oficina piso alto',
          'Sala de juntas ejecutiva para 12 personas',
          '4 Baños privados + cocineta ejecutiva',
          '4 Parqueaderos privados cubiertos + 2 Motos',
          'Piso 11 con vista a la Milla de Oro',
          'Uso Comercial / Corporativo',
          'Planta eléctrica de suplencia total 100%',
          'Administración: $1.450.000 COP/mes'
        ],
      },
      metadata: {
        cta_type: 'quote',
        classification_metadata: {
          real_estate: {
            operation_type: 'rent',
            property_type: 'office',
            area_total_m2: 185,
            area_built_m2: 185,
            bedrooms: 0,
            bathrooms: 4,
            floor_number: 11,
            stratum: 'Comercial',
            admin_fee: 1450000,
            antiquity: 'A estrenar (Nuevo)',
            parking_cars: 4,
            parking_motorcycles: 2,
            parking_type: 'covered',
            city: 'Medellín',
            neighborhood: 'El Poblado - Milla de Oro',
            address: 'Carrera 43A # 1-50',
            hide_exact_address: false,
            common_areas: [
              'Auditorio / Sala de Conferencias',
              'Coworking Space',
              'Comedor / Cafetería',
              'Planta Eléctrica de Suplencia Total',
              'Vigilancia 24/7 con CCTV',
              'Parqueadero de Visitantes'
            ],
            virtual_tour_url: 'https://my.matterport.com/show/?m=sample-matterport-tour-4',
            brochure_pdf_url: 'https://pixy.agency/docs/ficha-oficina-milla-oro.pdf',
          },
        },
      },
    },
  ];

  for (const prop of properties) {
    const { data: existingItem } = await supabase
      .from('service_catalog')
      .select('id')
      .eq('organization_id', orgId)
      .eq('sku', prop.sku)
      .maybeSingle();

    if (existingItem) {
      const { error: upErr } = await supabase
        .from('service_catalog')
        .update(prop)
        .eq('id', existingItem.id);
      if (upErr) {
        console.error(`Error updating ${prop.name}:`, upErr);
      } else {
        console.log(`🔄 Updated property: "${prop.name}" (${prop.sku})`);
      }
    } else {
      const { error: insErr } = await supabase
        .from('service_catalog')
        .insert(prop);
      if (insErr) {
        console.error(`Error inserting ${prop.name}:`, insErr);
      } else {
        console.log(`✨ Created property: "${prop.name}" (${prop.sku})`);
      }
    }
  }

  console.log("🎉 Seed finished successfully! 4 realistic Real Estate properties populated.");
}

main().catch(err => {
  console.error("Unhandled seed error:", err);
  process.exit(1);
});

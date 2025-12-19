const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars
// We assume --env-file=.env.local is passed to node

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim() : '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim() : '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Make sure to run with --env-file=.env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const catalogItems = [
    // Infraestructura & Suscripciones
    {
        category: 'Infraestructura & Suscripciones',
        name: 'Hosting Estándar',
        description: 'Alojamiento web de alto rendimiento, SSL incluido, copias de seguridad diarias.',
        type: 'recurring',
        frequency: 'yearly',
        base_price: 120,
        is_visible_in_portal: true
    },
    {
        category: 'Infraestructura & Suscripciones',
        name: 'Mantenimiento Web Básico',
        description: 'Actualización de plugins, monitoreo de seguridad y soporte técnico básico.',
        type: 'recurring',
        frequency: 'monthly',
        base_price: 50,
        is_visible_in_portal: true
    },
    // Branding & Identidad
    {
        category: 'Branding & Identidad',
        name: 'Diseño de Logo',
        description: 'Creación de identidad visual, manual de marca y entregables vectoriales.',
        type: 'one_off',
        base_price: 500,
        is_visible_in_portal: true
    },
    // UX / UI & Producto Digital
    {
        category: 'UX / UI & Producto Digital',
        name: 'Diseño UI Landing Page',
        description: 'Diseño de interfaz para landing page de alta conversión.',
        type: 'one_off',
        base_price: 300,
        is_visible_in_portal: true
    },
    // Web & Ecommerce
    {
        category: 'Web & Ecommerce',
        name: 'Desarrollo Sitio Web Corporativo',
        description: 'Sitio web de 5 secciones, autoadministrable y optimizado para SEO.',
        type: 'one_off',
        base_price: 1500,
        is_visible_in_portal: true
    },
    // Marketing & Growth
    {
        category: 'Marketing & Growth',
        name: 'Gestión de Campañas Google Ads',
        description: 'Configuración y optimización mensual de campañas SEM.',
        type: 'recurring',
        frequency: 'monthly',
        base_price: 300,
        is_visible_in_portal: true
    },
    // Social Media & Contenido
    {
        category: 'Social Media & Contenido',
        name: 'Gestión de Redes Sociales (Starter)',
        description: '12 publicaciones mensuales, diseño y copy. Gestión de comunidad básica.',
        type: 'recurring',
        frequency: 'monthly',
        base_price: 400,
        is_visible_in_portal: true
    }
];

async function seedCatalog() {
    console.log('Seeding Service Catalog...');

    // Check if we need to sign in (if using Anon key and RLS requires auth)
    // For simplicity, let's try to sign in as the admin user we created previously if possible, 
    // or just try insert if RLS is effectively public for anon (not recommended but might be current state).
    // Actually, I set policy to 'authenticated'. So I MUST sign in.

    const email = 'admin@agencia.com';
    const password = 'password123';

    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error('Auth error:', authError.message);
        console.log('Attempting to continue without auth (in case RLS is open or key is service role)...');
    } else {
        console.log('Authenticated as:', session.user.email);
    }

    // Insert items
    for (const item of catalogItems) {
        // Check if exists to avoid duplicates (naive check by name)
        const { data: existing } = await supabase
            .from('service_catalog')
            .select('id')
            .eq('name', item.name)
            .single();

        if (!existing) {
            const { error } = await supabase.from('service_catalog').insert(item);
            if (error) console.error(`Error inserting ${item.name}:`, error.message);
            else console.log(`Inserted: ${item.name}`);
        } else {
            console.log(`Skipped (exists): ${item.name}`);
        }
    }

    console.log('Seeding complete.');
}

seedCatalog();

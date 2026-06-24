import { createClient } from "@supabase/supabase-js"
import { seedSystemModules } from "@/modules/core/saas/saas-actions"
import * as dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log("🚀 Iniciando Seed del Módulo Menú Digital...")

    // 1. Register module in SaaS Engine
    console.log("📦 Registrando módulo en SaaS Engine...")
    // Note: seedSystemModules uses imported supabaseAdmin which depends on next/headers in some contexts,
    // so we will just upsert it directly here using the service client to avoid Next.js server context issues in a script.
    const modules = [
        { key: 'module_resto_menu', name: 'Menú Digital', description: 'Gestión de menú, platos, categorías e insignias dietarias.', category: 'addon', is_active: true }
    ]

    const { error: seedError } = await supabase
        .from("system_modules")
        .upsert(modules, { onConflict: 'key' })

    if (seedError) {
        console.error("❌ Error en seed:", seedError)
    } else {
        console.log("✅ Módulo registrado.")
    }

    // 2. Find "Resto" organization (Pollo)
    console.log("🔍 Buscando el Space de Restaurante (Ej. Carnaval del Pollo)...")
    const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, manual_module_overrides')
        .ilike('name', '%Pollo%')

    if (orgsError) {
        console.error("❌ Error buscando organizaciones:", orgsError)
        return
    }

    if (!orgs || orgs.length === 0) {
        console.error("❌ No se encontró ninguna organización de restaurante.")
        return
    }

    const restoOrg = orgs[0]
    const orgId = restoOrg.id
    console.log(`✅ Space encontrado: ${restoOrg.name} (${orgId})`)

    // 3. Enable module
    const currentOverrides = restoOrg.manual_module_overrides || []
    if (!currentOverrides.includes('module_resto_menu')) {
        console.log("⚙️ Habilitando módulo 'module_resto_menu' en manual overrides...")
        const { error: updateError } = await supabase
            .from('organizations')
            .update({ manual_module_overrides: [...currentOverrides, 'module_resto_menu'] })
            .eq('id', orgId)
        
        if (updateError) {
            console.error("❌ Error actualizando overrides:", updateError)
        } else {
            console.log("✅ Módulo habilitado.")
        }
    } else {
        console.log("✅ Módulo ya estaba habilitado.")
    }

    // 4. Create Categories
    console.log("🍔 Creando categorías...")
    const { data: existingCats } = await supabase
        .from('resto_menu_categories')
        .select('id, name')
        .eq('organization_id', orgId)

    let catMap: any = {}

    if (existingCats && existingCats.length > 0) {
        console.log("Categorías existentes encontradas, reusándolas...")
        catMap = existingCats.reduce((acc: any, cat: any) => {
            acc[cat.name] = cat.id
            return acc
        }, {})
    } else {
        const categoriesToInsert = [
            { organization_id: orgId, name: 'Entradas', slug: 'entradas', order_index: 0, is_active: true },
            { organization_id: orgId, name: 'Platos Fuertes', slug: 'platos-fuertes', order_index: 1, is_active: true },
            { organization_id: orgId, name: 'Bebidas', slug: 'bebidas', order_index: 2, is_active: true }
        ]

        const { data: insertedCategories, error: catError } = await supabase
            .from('resto_menu_categories')
            .insert(categoriesToInsert)
            .select()

        if (catError) {
            console.error("❌ Error creando categorías:", catError)
            return
        }

        catMap = insertedCategories.reduce((acc: any, cat: any) => {
            acc[cat.name] = cat.id
            return acc
        }, {})
    }

    console.log("✅ Categorías listas:", Object.keys(catMap).join(", "))

    // 5. Create 10 sample dishes
    console.log("🥩 Creando 10 platos de prueba...")
    const dishes = [
        // ENTRADAS
        {
            organization_id: orgId,
            category_id: catMap['Entradas'],
            name: 'Empanaditas de Entraña',
            description: '3 deliciosas empanadas fritas rellenas de entraña cortada a cuchillo con salsa criolla.',
            base_price: 12000,
            image_url: 'https://images.unsplash.com/photo-1626074962254-075f9175323e?auto=format&fit=crop&q=80&w=1200',
            metadata: { is_spicy: false, is_vegan: false, is_gluten_free: false },
            is_available: true,
            type: 'food'
        },
        {
            organization_id: orgId,
            category_id: catMap['Entradas'],
            name: 'Tiradito de Salmón',
            description: 'Finas láminas de salmón fresco con leche de tigre de maracuyá y toques de ají limo.',
            base_price: 28000,
            image_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=1200',
            metadata: { is_spicy: true, is_vegan: false, is_gluten_free: true },
            is_available: true,
            type: 'food'
        },
        {
            organization_id: orgId,
            category_id: catMap['Entradas'],
            name: 'Provoleta a la Parrilla',
            description: 'Queso provolone fundido a la parrilla con orégano, tomates cherry confitados y pan de masa madre.',
            base_price: 18500,
            image_url: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&q=80&w=1200',
            metadata: { is_spicy: false, is_vegan: false, is_gluten_free: true },
            is_available: true,
            type: 'food'
        },
        // PLATOS FUERTES
        {
            organization_id: orgId,
            category_id: catMap['Platos Fuertes'],
            name: 'Ribeye Steak (400g)',
            description: 'Corte premium madurado por 30 días, cocido a la parrilla de leña. Acompañado de papas rústicas.',
            base_price: 85000,
            image_url: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?auto=format&fit=crop&q=80&w=1200',
            metadata: { is_spicy: false, is_vegan: false, is_gluten_free: true, promotional_price: 75000 },
            is_available: true,
            type: 'food'
        },
        {
            organization_id: orgId,
            category_id: catMap['Platos Fuertes'],
            name: 'Hamburguesa Trufada',
            description: 'Doble carne angus (200g), queso gruyere, mayo trufada, cebolla caramelizada y pan brioche.',
            base_price: 32000,
            image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=1200',
            metadata: { is_spicy: false, is_vegan: false, is_gluten_free: false },
            is_available: true,
            type: 'food'
        },
        {
            organization_id: orgId,
            category_id: catMap['Platos Fuertes'],
            name: 'Risotto de Setas Silvestres',
            description: 'Cremoso risotto con mezcla de hongos de temporada, aceite de trufa y parmesano reggiano.',
            base_price: 45000,
            image_url: 'https://images.unsplash.com/photo-1633504581786-316c8002b1b9?auto=format&fit=crop&q=80&w=1200',
            metadata: { is_spicy: false, is_vegan: true, is_gluten_free: true },
            is_available: true,
            type: 'food'
        },
        {
            organization_id: orgId,
            category_id: catMap['Platos Fuertes'],
            name: 'Salmón Glaseado al Miso',
            description: 'Filete de salmón fresco glaseado con miso dulce, sobre puré de edamame y vegetales baby.',
            base_price: 52000,
            image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=1200',
            metadata: { is_spicy: false, is_vegan: false, is_gluten_free: true },
            is_available: true,
            type: 'food'
        },
        // BEBIDAS
        {
            organization_id: orgId,
            category_id: catMap['Bebidas'],
            name: 'Signature Gin & Tonic',
            description: 'Gin premium, tónica artesanal, frutos rojos, romero quemado y un toque de toronja.',
            base_price: 35000,
            image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=1200',
            metadata: { is_spicy: false, is_vegan: true, is_gluten_free: true },
            is_available: true,
            type: 'beverage'
        },
        {
            organization_id: orgId,
            category_id: catMap['Bebidas'],
            name: 'Spicy Margarita',
            description: 'Tequila reposado, triple sec, limón fresco, almíbar de agave y borde tajín jalapeño.',
            base_price: 28000,
            image_url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&q=80&w=1200',
            metadata: { is_spicy: true, is_vegan: true, is_gluten_free: true },
            is_available: true,
            type: 'beverage'
        },
        {
            organization_id: orgId,
            category_id: catMap['Bebidas'],
            name: 'Limonada de Coco Cerezada',
            description: 'Nuestra refrescante mezcla de coco, limón, cerezas marrasquino y hielo frappé.',
            base_price: 12000,
            image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=1200',
            metadata: { is_spicy: false, is_vegan: true, is_gluten_free: true },
            is_available: true,
            type: 'beverage'
        }
    ]

    const { data: existingDishes } = await supabase
        .from('resto_menu_items')
        .select('id')
        .eq('organization_id', orgId)
        .limit(1)

    if (existingDishes && existingDishes.length > 0) {
        console.log("✅ Los platos ya existen. Omitiendo seed de platos.")
    } else {
        const { error: dishesError } = await supabase
            .from('resto_menu_items')
            .insert(dishes)

        if (dishesError) {
            console.error("❌ Error creando platos:", dishesError)
        } else {
            console.log("✅ 10 platos de prueba creados exitosamente.")
        }
    }

    console.log("🎉 Seed completado con éxito!")
}

main()

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedData() {
    console.log("Starting DB seeding...")
    
    // 1. Get the orgId
    const orgId = "9cce6d27-8616-40be-baf9-607de5e01ca1"
    console.log("Organization ID:", orgId)

    // Clear previous data for this org
    await supabase.from('resto_menu_categories').delete().eq('organization_id', orgId)
    await supabase.from('resto_modifier_groups').delete().eq('organization_id', orgId)

    // 2. Create 10 Global Modifiers
    const modifierDefs = [
        { name: "Término de la carne", required: true, min_selections: 1, max_selections: 1, options: [{ id: "t1", name: "Azul", price: 0 }, { id: "t2", name: "Medio", price: 0 }, { id: "t3", name: "Tres cuartos", price: 0 }, { id: "t4", name: "Bien asada", price: 0 }] },
        { name: "Acompañamiento", required: true, min_selections: 1, max_selections: 2, options: [{ id: "a1", name: "Papas Fritas", price: 0 }, { id: "a2", name: "Ensalada", price: 0 }, { id: "a3", name: "Puré de Papa", price: 0 }, { id: "a4", name: "Arroz", price: 0 }, { id: "a5", name: "Patacones", price: 2000 }] },
        { name: "Salsas Adicionales", required: false, min_selections: 0, max_selections: 3, options: [{ id: "s1", name: "Salsa BBQ", price: 1500 }, { id: "s2", name: "Salsa de Ajo", price: 1000 }, { id: "s3", name: "Salsa Tártara", price: 1500 }, { id: "s4", name: "Salsa Picante", price: 1000 }] },
        { name: "Tamaño de la bebida", required: true, min_selections: 1, max_selections: 1, options: [{ id: "tb1", name: "Pequeño (9oz)", price: 0 }, { id: "tb2", name: "Mediano (12oz)", price: 2000 }, { id: "tb3", name: "Grande (16oz)", price: 4000 }] },
        { name: "Extras en tu Hamburguesa", required: false, min_selections: 0, max_selections: 5, options: [{ id: "e1", name: "Queso Cheddar", price: 3000 }, { id: "e2", name: "Tocineta", price: 4000 }, { id: "e3", name: "Huevo", price: 2500 }, { id: "e4", name: "Cebolla Caramelizada", price: 2000 }] },
        { name: "Nivel de Picante", required: true, min_selections: 1, max_selections: 1, options: [{ id: "p1", name: "Sin Picante", price: 0 }, { id: "p2", name: "Suave", price: 0 }, { id: "p3", name: "Medio", price: 0 }, { id: "p4", name: "Muy Picante", price: 0 }] },
        { name: "Tipo de Pan", required: true, min_selections: 1, max_selections: 1, options: [{ id: "tp1", name: "Pan Brioche", price: 0 }, { id: "tp2", name: "Pan Integral", price: 1000 }, { id: "tp3", name: "Pan sin Gluten", price: 3000 }] },
        { name: "Adiciones Dulces", required: false, min_selections: 0, max_selections: 2, options: [{ id: "d1", name: "Helado de Vainilla", price: 4000 }, { id: "d2", name: "Salsa de Chocolate", price: 2000 }, { id: "d3", name: "Leche Condensada", price: 1500 }] },
        { name: "Bebida del Combo", required: true, min_selections: 1, max_selections: 1, options: [{ id: "bc1", name: "Coca Cola", price: 0 }, { id: "bc2", name: "Sprite", price: 0 }, { id: "bc3", name: "Jugo Natural", price: 2000 }, { id: "bc4", name: "Agua", price: 0 }] },
        { name: "Leche", required: true, min_selections: 1, max_selections: 1, options: [{ id: "l1", name: "Leche Entera", price: 0 }, { id: "l2", name: "Deslactosada", price: 1000 }, { id: "l3", name: "Leche de Almendras", price: 3000 }] }
    ]

    const modifiers = []
    for (const def of modifierDefs) {
        const { data, error } = await supabase.from('resto_modifier_groups').insert({
            organization_id: orgId,
            name: def.name,
            required: def.required,
            min_selections: def.min_selections,
            max_selections: def.max_selections,
            options: def.options
        }).select().single()
        if (error) throw error
        modifiers.push(data)
    }
    console.log(`Created ${modifiers.length} modifiers`)

    // 3. Create 5 Categories
    const catDefs = [
        { name: "Entradas", slug: "entradas" },
        { name: "Platos Fuertes", slug: "platos-fuertes" },
        { name: "Hamburguesas y Fast Food", slug: "hamburguesas" },
        { name: "Bebidas", slug: "bebidas" },
        { name: "Postres", slug: "postres" }
    ]
    
    const categories = []
    for (const [index, def] of catDefs.entries()) {
        const { data, error } = await supabase.from('resto_menu_categories').insert({
            organization_id: orgId,
            name: def.name,
            slug: def.slug,
            order_index: index + 1
        }).select().single()
        if (error) throw error
        categories.push(data)
    }
    console.log(`Created ${categories.length} categories`)

    // 4. Create 30 Items and attach modifiers
    const itemsDefs = [
        // Entradas
        { cat: 0, name: "Empanadas de Carne", price: 12000, desc: "Orden de 3 deliciosas empanadas.", type: "food", mods: ["Salsas Adicionales", "Nivel de Picante"] },
        { cat: 0, name: "Dedos de Queso", price: 15000, desc: "Palitos de queso mozzarella empanizados.", type: "food", mods: ["Salsas Adicionales"] },
        { cat: 0, name: "Patacones con Hogao", price: 14000, desc: "Tradicionales patacones crujientes.", type: "food", mods: ["Salsas Adicionales"] },
        { cat: 0, name: "Chicharrón Carnudo", price: 22000, desc: "Porción de chicharrón crujiente.", type: "food", mods: [] },
        { cat: 0, name: "Alitas BBQ (6 unds)", price: 24000, desc: "Alitas bañadas en salsa BBQ.", type: "food", mods: ["Nivel de Picante"] },
        { cat: 0, name: "Nachos Supremos", price: 28000, desc: "Nachos con queso, carne, frijoles y guacamole.", type: "food", mods: ["Nivel de Picante", "Salsas Adicionales"] },

        // Platos Fuertes
        { cat: 1, name: "Bife de Chorizo", price: 45000, desc: "Corte premium de 350g.", type: "food", mods: ["Término de la carne", "Acompañamiento"] },
        { cat: 1, name: "Pechuga a la Plancha", price: 28000, desc: "Jugosa pechuga de pollo marinada.", type: "food", mods: ["Acompañamiento", "Salsas Adicionales"] },
        { cat: 1, name: "Salmón a las Finas Hierbas", price: 52000, desc: "Filete de salmón fresco.", type: "food", mods: ["Acompañamiento"] },
        { cat: 1, name: "Lomo de Cerdo", price: 32000, desc: "Medallones de cerdo en salsa BBQ.", type: "food", mods: ["Término de la carne", "Acompañamiento"] },
        { cat: 1, name: "Churrasco", price: 48000, desc: "Corte típico argentino.", type: "food", mods: ["Término de la carne", "Acompañamiento"] },
        { cat: 1, name: "Punta de Anca", price: 46000, desc: "Corte jugoso y lleno de sabor.", type: "food", mods: ["Término de la carne", "Acompañamiento", "Salsas Adicionales"] },
        { cat: 1, name: "Bandeja Paisa", price: 38000, desc: "Plato tradicional colombiano completo.", type: "food", mods: [] },

        // Hamburguesas
        { cat: 2, name: "Hamburguesa Clásica", price: 22000, desc: "Carne de res de 150g, queso, lechuga y tomate.", type: "food", mods: ["Término de la carne", "Tipo de Pan", "Extras en tu Hamburguesa", "Acompañamiento"] },
        { cat: 2, name: "Hamburguesa Doble", price: 30000, desc: "Doble carne, doble queso, tocineta.", type: "food", mods: ["Término de la carne", "Tipo de Pan", "Extras en tu Hamburguesa", "Acompañamiento"] },
        { cat: 2, name: "Hamburguesa de Pollo Crispy", price: 24000, desc: "Pechuga empanizada, ensalada coleslaw.", type: "food", mods: ["Tipo de Pan", "Extras en tu Hamburguesa", "Salsas Adicionales"] },
        { cat: 2, name: "Perro Caliente Especial", price: 18000, desc: "Salchicha americana, queso, tocineta, papas.", type: "food", mods: ["Salsas Adicionales"] },
        { cat: 2, name: "Combo Burger Clásica", price: 32000, desc: "Hamburguesa + Papas + Bebida.", type: "combo", mods: ["Término de la carne", "Bebida del Combo"] },
        { cat: 2, name: "Pizza Margarita Personal", price: 20000, desc: "Pizza tradicional con tomate y albahaca.", type: "food", mods: [] },
        
        // Bebidas
        { cat: 3, name: "Jugo Natural en Agua", price: 8000, desc: "Mora, Mango, Lulo, Maracuyá.", type: "beverage", mods: ["Tamaño de la bebida"] },
        { cat: 3, name: "Jugo Natural en Leche", price: 10000, desc: "Mora, Mango, Lulo, Maracuyá.", type: "beverage", mods: ["Tamaño de la bebida", "Leche"] },
        { cat: 3, name: "Limonada Natural", price: 7000, desc: "Refrescante limonada recién hecha.", type: "beverage", mods: ["Tamaño de la bebida"] },
        { cat: 3, name: "Limonada de Coco", price: 12000, desc: "Deliciosa limonada cremosa.", type: "beverage", mods: [] },
        { cat: 3, name: "Gaseosa", price: 5000, desc: "Coca Cola, Sprite, Quatro.", type: "beverage", mods: [] },
        { cat: 3, name: "Cerveza Nacional", price: 7000, desc: "Club Colombia, Poker, Aguila.", type: "beverage", mods: [] },
        { cat: 3, name: "Cerveza Importada", price: 12000, desc: "Corona, Stella Artois, Heineken.", type: "beverage", mods: [] },

        // Postres
        { cat: 4, name: "Brownie con Helado", price: 15000, desc: "Brownie caliente con helado de vainilla.", type: "food", mods: ["Adiciones Dulces"] },
        { cat: 4, name: "Tiramisú", price: 16000, desc: "Clásico postre italiano.", type: "food", mods: [] },
        { cat: 4, name: "Cheesecake de Frutos Rojos", price: 18000, desc: "Delicioso pastel de queso.", type: "food", mods: ["Adiciones Dulces"] },
        { cat: 4, name: "Flan de Caramelo", price: 12000, desc: "Postre suave tradicional.", type: "food", mods: [] }
    ]

    let totalItems = 0;
    for (const def of itemsDefs) {
        const cat = categories[def.cat]
        const { data: item, error: itemError } = await supabase.from('resto_menu_items').insert({
            organization_id: orgId,
            category_id: cat.id,
            name: def.name,
            description: def.desc,
            base_price: def.price,
            type: def.type
        }).select().single()
        if (itemError) throw itemError

        // Attach modifiers
        for (let i = 0; i < def.mods.length; i++) {
            const modName = def.mods[i]
            const modifier = modifiers.find(m => m.name === modName)
            if (modifier) {
                await supabase.from('resto_item_modifier_groups').insert({
                    item_id: item.id,
                    modifier_group_id: modifier.id,
                    order_index: i
                })
            }
        }
        totalItems++
    }
    
    console.log(`Created ${totalItems} menu items with modifiers`)
    console.log("DB SEEDING COMPLETED SUCCESSFULLY!")
}
seedData().catch(console.error)

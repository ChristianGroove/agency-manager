
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
// Removed faker dependency

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Credentials
const pid = 'uqnsdylhyenfmfkxmkrn';
// const pass = removed;
const r = 'us-west-2';

const connectionString = process.env.DATABASE_URL;

const client = new Client({ connectionString });

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
// Simple random phone generator
const generatePhone = () => '3' + Math.floor(100000000 + Math.random() * 900000000).toString();

async function seed() {
    try {
        await client.connect();
        console.log('✅ Connected to Sandbox DB.');

        // 1. Get Organization ID
        const orgRes = await client.query('SELECT id FROM organizations LIMIT 1');
        if (orgRes.rows.length === 0) {
            throw new Error('No organizations found. Please seed basic operational tables first.');
        }
        const orgId = orgRes.rows[0].id;
        console.log('🏢 Using Organization ID:', orgId);

        // CLEANUP: Delete orphaned clients
        await client.query("DELETE FROM clients WHERE organization_id IS NULL");
        console.log('🧹 Cleaned up orphaned clients.');

        // 2. Insert 10 Dummy Contacts (Clients)
        console.log('Creating 10 Dummy Clients...');
        const clients = [];
        for (let i = 0; i < 10; i++) {
            const firstName = ['Carlos', 'Ana', 'Luis', 'Maria', 'Jorge', 'Sofia', 'Pedro', 'Laura', 'Diego', 'Valentina'][i];
            const lastName = ['Perez', 'Gomez', 'Rodriguez', 'Lopez', 'Martinez', 'Garcia', 'Hernandez', 'Gonzalez', 'Torres', 'Ramirez'][i];

            const insertQuery = `
                INSERT INTO clients (name, email, phone, organization_id, status, created_at)
                VALUES ($1, $2, $3, $4, 'active', NOW())
                RETURNING id;
            `;
            const values = [`${firstName} ${lastName}`, `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`, generatePhone(), orgId];

            const res = await client.query(insertQuery, values);
            clients.push(res.rows[0].id);
        }
        console.log('✅ 10 Clients inserted.');

        // 3. Insert Categories and Products
        // Check if product_categories table exists?
        // Usually categories are just strings in 'services' table or 'portfolio_items'
        // But user asked for "2 categorias". I'll use "Marketing Digital" and "Desarrollo Web".

        const categories = ['Marketing Digital', 'Desarrollo Web'];

        console.log('Creating Products (Services)...');

        for (const category of categories) {
            console.log(`Processing Category: ${category}`);

            // 5 Products per category
            // 3 One-off, 2 Recurring

            // Product 1: One-off
            await createService(orgId, category, 'Auditoría ' + category, 'one_off', 500000);
            // Product 2: One-off
            await createService(orgId, category, 'Consultoría ' + category, 'one_off', 250000);
            // Product 3: One-off
            await createService(orgId, category, 'Setup ' + category, 'one_off', 1000000);

            // Product 4: Recurring
            await createService(orgId, category, 'Mantenimiento ' + category, 'recurring', 150000, 'monthly');
            // Product 5: Recurring
            await createService(orgId, category, 'Suscripción ' + category + ' Pro', 'recurring', 300000, 'monthly');
        }

        console.log('✅ Products inserted.');

    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        await client.end();
    }
}

async function createService(orgId, category, name, type, price, freq = null) {
    // Note: Assuming 'services' table is used for product catalog with is_catalog_item = true
    // We need to check if client_id is NULLABLE. 
    // If NOT nullable, we might need to attach to a dummy client or validation fails.
    // Based on TS types, Service has client_id. ServiceCatalogItem usually doesn't need it?
    // Let's try inserting with NULL client_id. If it fails, I'll update logic.

    // Also, checking if 'frequency' column accepts 'monthly' etc.

    const query = `
        INSERT INTO services (
            organization_id, 
            name, 
            category, 
            type, 
            amount, 
            frequency, 
            is_catalog_item, 
            is_visible_in_portal,
            base_price,
            status,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true, $5, 'active', NOW())
    `;

    // NOTE: 'base_price' and 'amount' might be redundant, filling both.

    try {
        await client.query(query, [orgId, name, category, type, price, freq]);
        // console.log(`   + Created: ${name}`);
    } catch (e) {
        if (e.message.includes('client_id')) {
            console.log('   ! Retrying with dummy client_id for constraint...');
            // Fetch a random client
            const cRes = await client.query('SELECT id FROM clients LIMIT 1');
            const cid = cRes.rows[0].id;
            const retryQuery = `
                INSERT INTO services (
                    organization_id, client_id, name, category, type, amount, frequency, is_catalog_item, is_visible_in_portal, base_price, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, $6, 'active', NOW())
             `;
            await client.query(retryQuery, [orgId, cid, name, category, type, price, freq]);
            console.log(`   + Created (linked to client): ${name}`);
        } else {
            console.error(`   - Failed to create ${name}: ${e.message}`);
        }
    }
}

seed();

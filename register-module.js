const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@127.0.0.1:55322/postgres');

async function run() {
    await client.connect();
    
    try {
        console.log("Checking system_modules...");
        // Ensure it is in system_modules
        const res = await client.query(`
            INSERT INTO system_modules (key, name, description, is_core, category, is_active)
            VALUES ('module_resto_orders', 'Gestor de Pedidos Resto', 'Gestor KDS y Pedidos de Restaurante', false, 'operations', true)
            ON CONFLICT (key) DO NOTHING
        `);

        // Find all organizations and give them 'module_resto_orders' for testing
        const orgRes = await client.query(`
            INSERT INTO organization_modules (organization_id, module_key)
            SELECT id, 'module_resto_orders'
            FROM organizations
            ON CONFLICT (organization_id, module_key) DO NOTHING
            RETURNING *;
        `);
        
        console.log("organization_modules result:", orgRes.rowCount, "orgs updated");

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();

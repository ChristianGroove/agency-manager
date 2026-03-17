const fetch = require('node-fetch');

const SUPABASE_URL = 'https://amwlwmkejdjskukdfwut.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3I...'; // truncated for safety but I will use the real one from env

async function check() {
    const url = `${SUPABASE_URL}/rest/v1/saas_products?id=eq.0ab2c8a7-a2d9-4ef1-8b9f-415a5c3912d7&select=*`;
    const response = await fetch(url, {
        headers: {
            'apikey': process.argv[2],
            'Authorization': `Bearer ${process.argv[2]}`
        }
    });
    const data = await response.json();
    console.log("Resultado de búsqueda de producto:", JSON.stringify(data, null, 2));

    const allUrl = `${SUPABASE_URL}/rest/v1/saas_products?select=id,name,slug`;
    const allResponse = await fetch(allUrl, {
        headers: {
            'apikey': process.argv[2],
            'Authorization': `Bearer ${process.argv[2]}`
        }
    });
    const allData = await allResponse.json();
    console.log("\nLista completa de productos:", JSON.stringify(allData, null, 2));
}

check();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://amwlwmkejdjskukdfwut.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd2x3bWtlamRqc2t1a2Rmd3V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg0ODY5NSwiZXhwIjoyMDgxNDI0Njk1fQ.r6qkZ37-B82CcKEZlIPi8ZRAaHQa8_aOoMAoCTiKCPQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error inspeccionando tabla:', error);
    } else {
        console.log('Estructura de la tabla (columnas):', data && data.length > 0 ? Object.keys(data[0]) : 'Tabla vacía');
    }
}

inspectTable();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient('http://127.0.0.1:55321', 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH');

async function test() {
    const { data, error, count } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '("converted","customer","active_deal")')
        .lt('score', 20)
    console.log(error || count);
}
test();

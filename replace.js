const fs = require('fs');
let c = fs.readFileSync('src/modules/features/portal/services/portal-service.ts', 'utf8');
c = c.replace(/import \{ createClient \} from "@\/modules\/core\/database\/supabase-server";/, 'import { supabaseAdmin } from "@/modules/core/database/supabase-admin";');
c = c.replace(/\(await createClient\(\)\)/g, 'supabaseAdmin');
fs.writeFileSync('src/modules/features/portal/services/portal-service.ts', c);
console.log('done');

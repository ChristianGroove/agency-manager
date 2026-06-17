const fs = require('fs');
const file = 'src/modules/features/portal/components/b2c-restaurant-template/actions/checkout-actions.test.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /vi\.mock\(['"]@\/modules\/core\/database\/supabase-admin['"],\s*\(\)\s*=>\s*\(\{\s*supabaseAdmin:\s*(\{[\s\S]*?\})\s*\}\)\s*\)/;
const match = content.match(regex);
console.log("Match found:", match !== null);

if (match) {
    content = content.replace(regex, (match, innerObj) => {
        return `vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => (${innerObj}))
}))`;
    });
    fs.writeFileSync(file, content);
    console.log("Replaced and saved!");
}

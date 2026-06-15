const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.next')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
                const content = fs.readFileSync(file, 'utf8');
                if (content.includes('supabase-admin') || content.includes('supabaseAdmin')) {
                    results.push(file);
                }
            }
        }
    });
    return results;
}

const files = walk('src');
console.log('Test files to check:', files.length);

let replaced = 0;
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    
    // Check if the file ALREADY mocks supabase-server
    // If it does, we need to be careful. But let's first fix the regex for supabase-admin.
    
    const regex = /vi\.mock\(['"]@\/modules\/core\/database\/supabase-admin['"],\s*\(\)\s*=>\s*\(\{\s*supabaseAdmin:\s*(\{[\s\S]*?\})\s*,?\s*\}\)\s*\)/;
    const match = content.match(regex);
    
    if (match) {
        if (content.includes("vi.mock('@/modules/core/database/supabase-server'") || content.includes("vi.mock(\"@/modules/core/database/supabase-server\"")) {
            console.log('File mocks both admin and server. We need to merge them manually or handle them:', f);
            return;
        }

        content = content.replace(regex, (match, innerObj) => {
            return `vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => (${innerObj}))
}))`;
        });
        
        content = content.replace(/import\s*\{\s*supabaseAdmin\s*\}\s*from\s*['"]@\/modules\/core\/database\/supabase-admin['"]/g, '');

        fs.writeFileSync(f, content);
        replaced++;
    }
});
console.log('Replaced with improved regex:', replaced);

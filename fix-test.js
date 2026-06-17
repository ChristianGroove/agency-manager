const fs = require('fs');
let file = fs.readFileSync('src/modules/core/settings/actions/team.test.ts', 'utf8');

const mockServer = `vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))`;

const mockAdmin = `\n\nvi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.dbClient,
}))`;

if (!file.includes('supabase-admin')) {
    file = file.replace(mockServer, mockServer + mockAdmin);
    fs.writeFileSync('src/modules/core/settings/actions/team.test.ts', file);
    console.log('Fixed team.test.ts mocks');
} else {
    console.log('Already mocked');
}

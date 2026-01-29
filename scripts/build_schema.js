const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../src/db/migrations');
const outputFile = path.join(__dirname, '../rebuilt_sandbox_schema.sql');

try {
    // 1. Get all SQL files
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort(); // Sort by filename (timestamp) to ensure correct order

    console.log(`Found ${files.length} migration files.`);

    let masterSql = '-- REBUILT SANDBOX SCHEMA FROM LOCAL MIGRATIONS\n';
    masterSql += '-- Generated automatically to avoid dump errors.\n\n';

    // 2. Add Standard Extensions (Required for many tables)
    masterSql += 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n';
    masterSql += 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n';

    // 3. Concatenate Files
    for (const file of files) {
        const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        masterSql += `\n\n-- ==========================================\n`;
        masterSql += `-- MIGRATION: ${file}\n`;
        masterSql += `-- ==========================================\n`;
        masterSql += content;
    }

    // 4. Safety Fixes (Just in case local migrations have minor issues)
    // Remove "public." prefix from extensions if present to avoid schema issues
    masterSql = masterSql.replace(/public\.uuid_generate_v4/g, 'uuid_generate_v4');

    // Ensure auth.uid() function is mocked/handled if we are not in a real Supabase env? 
    // No, we are in real Supabase. auth.uid() exists.

    fs.writeFileSync(outputFile, masterSql);

    console.log('✅ Success! Schema rebuilt from source code.');
    console.log(`Output: ${outputFile}`);

} catch (e) {
    console.error('Error rebuilding schema:', e);
}

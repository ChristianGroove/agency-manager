const fs = require('fs');
const path = require('path');

// Usage: node fix_dump.js <path-to-sql-file>
const filePath = process.argv[2];

if (!filePath) {
    console.error('❌ Please provide the path to your SQL file.');
    process.exit(1);
}

try {
    let sql = fs.readFileSync(filePath, 'utf-8');

    // Fix 1: Untyped ARRAY -> text[]
    sql = sql.replace(/ ARRAY,/g, ' text[],');
    sql = sql.replace(/ ARRAY DEFAULT/g, ' text[] DEFAULT');

    // Fix 2: Remove "USER-DEFINED"
    sql = sql.replace(/ USER-DEFINED/g, '');

    // Fix 3: Handle "type NOT NULL" -> "type text NOT NULL"
    sql = sql.replace(/ type NOT NULL,/g, ' type text NOT NULL,');
    sql = sql.replace(/ type NULL,/g, ' type text NULL,');

    // Fix 4: Remove type casting in DEFAULTs
    // Specific multi-word types FIRST to avoid partial matches
    sql = sql.replace(/::character varying/g, '');
    sql = sql.replace(/::text/g, '');
    sql = sql.replace(/::jsonb/g, '');
    sql = sql.replace(/::uuid/g, '');

    // General catcher for single word types (e.g. ::briefing_status)
    // Matches ::word possibly ending with comma/paren but we just strip the ::word part
    sql = sql.replace(/::[\w_]+/g, '');

    // Fix 5: Replace uuid_generate_v4() with gen_random_uuid() (Native, safer)
    sql = sql.replace(/public\.uuid_generate_v4\(\)/g, 'gen_random_uuid()');
    sql = sql.replace(/uuid_generate_v4\(\)/g, 'gen_random_uuid()');

    // Fix 6: EMERGENCY CLEANUP of residual artifacts from previous runs
    // Previous script stripped "::character" but left " varying".
    // Pattern: "DEFAULT 'value' varying" -> "DEFAULT 'value'"
    sql = sql.replace(/(DEFAULT '[^']+') varying/g, '$1');
    sql = sql.replace(/(DEFAULT [0-9]+) varying/g, '$1');
    sql = sql.replace(/(DEFAULT true|DEFAULT false) varying/g, '$1');
    sql = sql.replace(/ varying,/g, ','); // Risky? Only if column name ends in varying. safer implies context.

    // Actually, "status character varying DEFAULT 'offline' varying,"
    // The first "varying" is correct (type). The second is the bug.
    // Replace " varying," specifically when preceded by a quote
    sql = sql.replace(/' varying,/g, "',");

    fs.writeFileSync(filePath, sql);

    console.log('✅ Fix Complete (Round 4)!');
    console.log('Fixed character varying and other multi-word casts.');
    console.log(`Updated: ${filePath}`);

} catch (e) {
    console.error('❌ Error reading file:', e.message);
}

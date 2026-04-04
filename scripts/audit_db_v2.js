const fs = require('fs');
const path = require('path');

const migrationsDir = 'supabase/migrations';
const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

const tables = {}; // { tableName: { columns: Set, references: Set, jsonbCount: 0 } }
const views = new Set();
const functions = new Set();

files.forEach(file => {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    // Simple regex-based parsing (can be improved)
    // 1. CREATE TABLE
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gi;
    let match;
    while ((match = createTableRegex.exec(content)) !== null) {
        const tableName = match[1].toLowerCase();
        const tableBody = match[2];
        if (!tables[tableName]) {
            tables[tableName] = { columns: new Set(), references: new Set(), jsonbCount: 0, isView: false };
        }
        
        // Extract columns from body
        const lines = tableBody.split(',').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
        lines.forEach(line => {
            const parts = line.split(/\s+/);
            if (parts.length > 0 && !['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'CHECK', 'UNIQUE'].includes(parts[0].toUpperCase())) {
                const colName = parts[0].replace(/"/g, '').toLowerCase();
                tables[tableName].columns.add(colName);
                if (line.toLowerCase().includes('jsonb')) {
                    tables[tableName].jsonbCount++;
                }
            }
            // Extract references within inline constraint
            if (line.toLowerCase().includes('references')) {
                const refMatch = line.match(/references\s+(?:public\.)?(\w+)/i);
                if (refMatch) {
                    tables[tableName].references.add(refMatch[1].toLowerCase());
                }
            }
        });
    }

    // 2. ALTER TABLE ADD COLUMN
    const alterTableRegex = /ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+([\s\S]*?)(?:[,;]|$)/gi;
    while ((match = alterTableRegex.exec(content)) !== null) {
        const tableName = match[1].toLowerCase();
        const colName = match[2].toLowerCase();
        const colDef = match[3].toLowerCase();
        if (tables[tableName]) {
            tables[tableName].columns.add(colName);
            if (colDef.includes('jsonb')) {
                tables[tableName].jsonbCount++;
            }
            if (colDef.includes('references')) {
                const refMatch = colDef.match(/references\s+(?:public\.)?(\w+)/i);
                if (refMatch) {
                    tables[tableName].references.add(refMatch[1].toLowerCase());
                }
            }
        }
    }

    // 3. ALTER TABLE ADD CONSTRAINT (Foreign Keys)
    const alterConstraintRegex = /ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ADD\s+CONSTRAINT\s+.*?FOREIGN\s+KEY\s+.*?REFERENCES\s+(?:public\.)?(\w+)/gi;
    while ((match = alterConstraintRegex.exec(content)) !== null) {
        const tableName = match[1].toLowerCase();
        const refTable = match[2].toLowerCase();
        if (tables[tableName]) {
            tables[tableName].references.add(refTable);
        }
    }
});

// Final Analysis
const tableNames = Object.keys(tables);
const results = {
    totalTables: tableNames.length,
    tables: {},
    duplicateConcepts: [],
    largeTables: [],
    circularFKs: [],
    highConnectivity: [],
    unclearNaming: []
};

// Detect duplicates
const groups = {
    contacts: ['contacts', 'crm_contacts', 'customer_contacts', 'leads'],
    orgs: ['organizations', 'tenants', 'agencies'],
    users: ['users', 'profiles', 'staff', 'members']
};

tableNames.forEach(name => {
    const table = tables[name];
    results.tables[name] = {
        colCount: table.columns.size,
        refCount: table.references.size,
        jsonbCount: table.jsonbCount
    };

    if (table.columns.size > 40) {
        results.largeTables.push({ name, cols: table.columns.size });
    }

    if (table.references.size > 8) {
        results.highConnectivity.push({ name, refs: table.references.size });
    }

    // Check for circularity (simple A -> B and B -> A)
    table.references.forEach(ref => {
        if (tables[ref] && tables[ref].references.has(name)) {
            results.circularFKs.push(`${name} <-> ${ref}`);
        }
    });

    // Unclear naming
    if (name.length < 3 || name.includes('test') || name.includes('temp')) {
        results.unclearNaming.push(name);
    }
});

// Remove duplicate circular pairs
results.circularFKs = [...new Set(results.circularFKs.map(s => s.split(' <-> ').sort().join(' <-> ')))];

// Print Summary
console.log(JSON.stringify(results, null, 2));

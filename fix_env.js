const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
let content = '';

try {
    content = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.log('No .env.local found, creating new.');
}

// The verified good token provided by user
const newToken = 'EAALjH1irQ7IBQW6hsZAnnX5qb031Jod5EfYgtXNsYr0qlHeTKMElUtyizRNjHTWor9yo27INjohZAZBAk5HCrSdG7ijofZCfvCuIMczjvalPdZAGidwFLdWaItaVia4EPWE0mJxbTYLgCESagy3Q6o2OaQJxZAo2QzfcN4IG1spPtiXDRR5wmsDazlPRzvBYSuTkRaZBxrT3CyBhZAvzwEP0AOnicYaWQzmhqW2o7KIrRXXxbE2jj4B9zRjgMBwykQjEiq2wgYx1CBGHAwOZC8bW2BbeFEii6smYSVAZDZD';

const lines = content.split(/\r?\n/);
const finalLines = [];
const seenKeys = new Set();

// Priorities: preserve existing non-token keys
for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();

        if (key === 'META_API_TOKEN') continue; // We will replace this

        // Check for suspicious corruption in Phone ID from previous failed edits
        if (key === 'META_PHONE_NUMBER_ID' && value.length > 20 && !/^\d+$/.test(value)) {
            // If the ID looks like garbage (letters mixed with numbers and very long), try to salvage just the numbers
            // Step 10611 showed: 990154037504132rGbAu...
            // We will take just the first 15 digits if it starts with digits
            const match = value.match(/^(\d{15})/);
            if (match) {
                console.log(`Fixing corrupted META_PHONE_NUMBER_ID: ${value} -> ${match[1]}`);
                finalLines.push(`${key}=${match[1]}`);
                seenKeys.add(key);
                continue;
            }
        }

        if (!seenKeys.has(key)) {
            finalLines.push(line); // Keep original line mostly intact
            seenKeys.add(key);
        }
    }
}

// Append the correct token
finalLines.push(`META_API_TOKEN=${newToken}`);

fs.writeFileSync(envPath, finalLines.join('\n') + '\n');
console.log('Successfully fixed .env.local with correct META_API_TOKEN and cleaned headers.');

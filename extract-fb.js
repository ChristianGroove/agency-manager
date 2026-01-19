
const fs = require('fs');

const content = fs.readFileSync('debug.log', 'utf8');
const lines = content.split('\n');

const facebookPaylods = lines.filter(l => l.includes('"object":"page"'));

if (facebookPaylods.length === 0) {
    console.log('No Facebook payloads found.');
} else {
    const last = facebookPaylods[facebookPaylods.length - 1];
    console.log('Last Facebook Payload:', last);

    // Try to extract JSON
    const match = last.match(/Body: (\{.*\})/);
    if (match) {
        try {
            const json = JSON.parse(match[1]);
            console.log('Parsed JSON:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Partial JSON found, could not parse completely.');
            console.log(match[1]);
        }
    }
}

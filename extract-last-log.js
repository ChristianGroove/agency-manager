
const fs = require('fs');
const content = fs.readFileSync('debug.log', 'utf8');
const lines = content.split('\n');

const lastBody = lines.filter(l => l.includes('[ROUTE] Body')).pop();
const lastResult = lines.filter(l => l.includes('[ROUTE] Result')).pop();

console.log('Last Result:', lastResult);
console.log('Last Body:', lastBody);

const fs = require('fs');
const code = fs.readFileSync('src/server.ts', 'utf8');
const start = code.indexOf('"/api/remittances/:id/download"');
const segment = code.substring(start, start + 3000);
console.log(segment.includes('Remittance Advice') || segment.includes('REMITTANCE ADVICE') ? "Has Remittance Title" : "Does NOT have Remittance Title");
console.log(segment.includes('QUOTE') || segment.includes('Quote') ? "Has Quote Title" : "Does NOT have Quote Title");

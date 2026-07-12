const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const regex1 = /if \(!data\) {\s*if \(invoiceRow.file_path\) {\s*\/\/ It might be a historical invoice[\s\S]*?return res\.status\(404\)\.json\(\{ error: "Invoice data not found" \}\);\s*}/g;

code = code.replace(regex1, 'if (!data) return res.status(404).json({ error: "Invoice data not found" });');
fs.writeFileSync('src/server.ts', code);
console.log("Reverted the wrong if(!data) block!");


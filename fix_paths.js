import fs from 'fs';
let content = fs.readFileSync('src/server.ts', 'utf8');
content = content.replace(/path\.join\(process\.cwd\(\), "uploads"/g, 'path.join(process.cwd(), "data", "uploads"');
content = content.replace(/path\.join\(process\.cwd\(\), "invoices"/g, 'path.join(process.cwd(), "data", "invoices"');
content = content.replace(/,\n\s*"uploads",/g, ',\n              "data",\n              "uploads",');
content = content.replace(/,\n\s*"invoices",/g, ',\n              "data",\n              "invoices",');
fs.writeFileSync('src/server.ts', content);

const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');
code = code.replace("    `);\n\n      CREATE TABLE IF NOT EXISTS ndis_service_agreements", "    `);\n\n    db.exec(`\n      CREATE TABLE IF NOT EXISTS ndis_service_agreements");
fs.writeFileSync('src/server.ts', code);

const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');
const idx = code.indexOf("CREATE TABLE IF NOT EXISTS ndis_service_agreements");
console.log(JSON.stringify(code.substring(idx - 100, idx + 50)));

const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

code = code.replace(/const ids = JSON\.parse\(staffIds\);/g, 'const ids = JSON.parse(staffIds).map((id: any) => parseInt(id, 10));');

fs.writeFileSync('src/server.ts', code);

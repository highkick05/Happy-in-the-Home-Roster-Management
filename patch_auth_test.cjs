const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');
const match = code.match(/function authenticateToken[\s\S]*?next\(\);\s*\}/);
if (match) console.log(match[0]);

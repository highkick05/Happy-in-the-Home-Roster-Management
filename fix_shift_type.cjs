const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/const shift = db\.prepare\("SELECT \\\* FROM shifts WHERE id = \\\?"\)\.get\(shiftId\);/g, 'const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(shiftId) as any;');
fs.writeFileSync(file, code);

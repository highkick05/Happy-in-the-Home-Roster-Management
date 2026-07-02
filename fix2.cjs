const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');
code = code.replace("    db.exec(`\n          db.exec(`", "    db.exec(`");
fs.writeFileSync('src/server.ts', code);

const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');
code = code.replace("    db.exec(`\n      \n    db.exec(`\n      CREATE TABLE IF NOT EXISTS tasks", "    db.exec(`\n      CREATE TABLE IF NOT EXISTS tasks");
fs.writeFileSync('src/server.ts', code);

const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const migration = `
    try {
      db.exec("ALTER TABLE contractors ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP");
      console.log("[DEBUG] Added created_at to contractors");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE contractors ADD COLUMN status TEXT DEFAULT 'ACTIVE'");
      console.log("[DEBUG] Added status to contractors");
    } catch(e) {}
`;

content = content.replace('// --- Migrations & schema updates block ---', '// --- Migrations & schema updates block ---\n' + migration);
fs.writeFileSync(file, content);

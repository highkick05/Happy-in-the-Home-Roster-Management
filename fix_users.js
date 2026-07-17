const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const schemaUpdate = `
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    if (!tableInfo.some(c => c.name === 'can_switch_admin')) {
      db.exec("ALTER TABLE users ADD COLUMN can_switch_admin INTEGER DEFAULT 0");
    }
  } catch (e) {
    console.error("Error adding can_switch_admin to users:", e);
  }
`;

code = code.replace("  // NDIS AGREEMENT END DATE", schemaUpdate + "\n  // NDIS AGREEMENT END DATE");
fs.writeFileSync('src/server.ts', code);

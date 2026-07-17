const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const schemaUpdate = `
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    if (!tableInfo.some(c => c.name === 'last_active_role')) {
      db.exec("ALTER TABLE users ADD COLUMN last_active_role TEXT");
    }
  } catch (e) {
    console.error("Error adding last_active_role to users:", e);
  }
`;

code = code.replace("  // NDIS AGREEMENT END DATE", schemaUpdate + "\n  // NDIS AGREEMENT END DATE");
fs.writeFileSync('src/server.ts', code);

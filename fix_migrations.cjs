const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const migrations = `
  try {
    const usersCols = db.pragma("table_info(users)");
    if (!usersCols.some(c => c.name === 'can_switch_admin')) {
      db.exec("ALTER TABLE users ADD COLUMN can_switch_admin INTEGER DEFAULT 0");
    }
    if (!usersCols.some(c => c.name === 'last_active_role')) {
      db.exec("ALTER TABLE users ADD COLUMN last_active_role TEXT");
    }
  } catch(e) {
    console.error("Migration error for users table:", e.message);
  }
`;

code = code.replace(
  'console.log("[DEBUG] Created settings table if missing");',
  'console.log("[DEBUG] Created settings table if missing");\n' + migrations
);

fs.writeFileSync('src/server.ts', code);

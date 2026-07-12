const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');
code = code.replace(
  '  try {\n    db.exec("ALTER TABLE invoices ADD COLUMN services_json TEXT");',
  '  try {\n    db.exec("ALTER TABLE shifts ADD COLUMN is_historical INTEGER DEFAULT 0");\n    console.log("[DEBUG] Completed is_historical column check.");\n  } catch (e: any) {\n    if (e.message && !e.message.includes("duplicate column")) {\n      console.warn("Migration warning:", e.message);\n    }\n  }\n\n  try {\n    db.exec("ALTER TABLE invoices ADD COLUMN services_json TEXT");'
);
fs.writeFileSync('src/server.ts', code);

const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const target = `          if (!remCols.some(c => c.name === 'provider_id')) {
            db.prepare("ALTER TABLE remittances ADD COLUMN provider_id INTEGER").run();
          }`;
const replacement = `          if (!remCols.some(c => c.name === 'provider_id')) {
            db.prepare("ALTER TABLE remittances ADD COLUMN provider_id INTEGER").run();
          }
          if (!remCols.some(c => c.name === 'invoice_reference')) {
            db.prepare("ALTER TABLE remittances ADD COLUMN invoice_reference TEXT").run();
          }
          if (!remCols.some(c => c.name === 'transaction_reference')) {
            db.prepare("ALTER TABLE remittances ADD COLUMN transaction_reference TEXT").run();
          }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/server.ts', code);
  console.log("Migration patched");
} else {
  console.log("Target not found!");
}

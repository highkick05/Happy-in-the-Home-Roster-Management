const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

code = code.replace(
  'const invoiceRow = db.prepare("SELECT * FROM invoices WHERE id = ?").get(invoiceId);',
  'const invoiceRow = db.prepare("SELECT * FROM invoices WHERE id = ?").get(invoiceId) as any;'
);

code = code.replace(
  `      const client = db.prepare(\`
        SELECT c.*, p.company_name, p.contact_name as provider_contact, p.email as provider_email
        FROM clients c
        LEFT JOIN providers p ON c.provider_id = p.id
        WHERE c.id = ?
      \`).get(invoiceRow.client_id);`,
  `      const client = db.prepare(\`
        SELECT c.*, p.company_name, p.contact_name as provider_contact, p.email as provider_email
        FROM clients c
        LEFT JOIN providers p ON c.provider_id = p.id
        WHERE c.id = ?
      \`).get(invoiceRow.client_id) as any;`
);

code = code.replace(
  'const rows = db.prepare("SELECT key, value FROM settings").all();',
  'const rows = db.prepare("SELECT key, value FROM settings").all() as any[];'
);

code = code.replace(
  `(acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }),\n        {}`,
  `(acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }),\n        {} as any`
);

fs.writeFileSync('src/server.ts', code);
console.log("Fixed TS errors");

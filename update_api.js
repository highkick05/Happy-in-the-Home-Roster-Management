const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf-8');

// POST replace
content = content.replace(
  '        managementFee === undefined ? 10.0 : managementFee,\n      );\n      res.json({',
  '        managementFee === undefined ? 10.0 : managementFee,\n        canEmailInvoices === false ? 0 : 1,\n      );\n      res.json({'
).replace(
  '"INSERT INTO providers (company_name, contact_name, email, phone, address, provider_type, management_fee) VALUES (?, ?, ?, ?, ?, ?, ?)",',
  '"INSERT INTO providers (company_name, contact_name, email, phone, address, provider_type, management_fee, can_email_invoices) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",'
).replace(
  '      managementFee,\n    } = req.body;',
  '      managementFee,\n      canEmailInvoices,\n    } = req.body;'
);

// PUT replace
content = content.replace(
  '        managementFee === undefined ? 10.0 : managementFee,\n        id,\n      );\n      res.json({',
  '        managementFee === undefined ? 10.0 : managementFee,\n        canEmailInvoices === false ? 0 : 1,\n        id,\n      );\n      res.json({'
).replace(
  '"UPDATE providers SET company_name = ?, contact_name = ?, email = ?, phone = ?, address = ?, provider_type = ?, management_fee = ? WHERE id = ?",',
  '"UPDATE providers SET company_name = ?, contact_name = ?, email = ?, phone = ?, address = ?, provider_type = ?, management_fee = ?, can_email_invoices = ? WHERE id = ?",'
);

fs.writeFileSync('src/server.ts', content);

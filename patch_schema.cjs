const fs = require('fs');
let code = fs.readFileSync('schema.sql', 'utf8');

const target = `    services_json TEXT,
    attachments_json TEXT
);`;
const replacement = `    services_json TEXT,
    attachments_json TEXT,
    invoice_reference TEXT,
    transaction_reference TEXT
);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('schema.sql', code);
  console.log("Schema patched");
} else {
  console.log("Target not found!");
}

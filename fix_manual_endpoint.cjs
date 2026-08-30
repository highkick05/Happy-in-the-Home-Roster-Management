const fs = require('fs');
let block = fs.readFileSync('/tmp/invoices_manual.txt', 'utf8');

block = "  app.post(\n" + block.replace(/app\.post\(/g, ''); // Ensure start format
block = block.replace(/\/api\/invoices\/manual/g, '/api/remittances/manual');
block = block.replace(/INSERT INTO invoices/g, 'INSERT INTO remittances');
block = block.replace(/UPDATE invoices/g, 'UPDATE remittances');
block = block.replace(/invoice_number/g, 'remittance_number');
block = block.replace(/invoice_id/g, 'remittance_id');
block = block.replace(/buildInvoicePdf/g, 'buildRemittancePdf');
block = block.replace(/TEMP-MERGE/g, 'TEMP-REM');
block = block.replace(/hcInvoicePrefix/g, 'hcRemittancePrefix');
block = block.replace(/ndisInvoicePrefix/g, 'ndisRemittancePrefix');
block = block.replace(/isHomeCare \? "HC-" : "INV-"/g, 'isHomeCare ? "HCR-" : "REM-"');
block = block.replace(/Manual Invoice generation completed/g, 'Manual Remittance generation completed');
block = block.replace(/Manual Invoice Generation Failed/g, 'Manual Remittance Generation Failed');
// More specific replacements
block = block.replace(/const newInvoiceId/g, 'const newRemittanceId');
block = block.replace(/newInvoiceId/g, 'newRemittanceId');
block = block.replace(/Invoice PDF missing/g, 'Remittance PDF missing');

let code = fs.readFileSync('src/server.ts', 'utf8');
// Delete the broken 22 lines I inserted earlier
const badStart = code.indexOf('// --- Manual Remittances API ---');
const badEnd = code.indexOf('          return res.status(400).json({ error: "Invalid services JSON" });\n        }\n      }');
if (badStart !== -1 && badEnd !== -1) {
  code = code.substring(0, badStart) + code.substring(badEnd + 85);
}

const blankTemplatesStart = code.indexOf('// --- BLANK TEMPLATES (FILE SYSTEM) ---');
if (blankTemplatesStart !== -1) {
  code = code.substring(0, blankTemplatesStart) + 
         '\n\n  // --- Manual Remittances API ---\n' + block + 
         '\n\n' + code.substring(blankTemplatesStart);
  fs.writeFileSync('src/server.ts', code);
  console.log("Injected properly!");
} else {
  console.log("Could not find BLANK TEMPLATES");
}

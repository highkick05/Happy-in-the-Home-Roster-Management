const fs = require('fs');
const code = fs.readFileSync('src/server.ts', 'utf8');

const startIdx = code.indexOf('  app.post(\n    "/api/invoices/manual",');
let endIdx = -1;
let depth = 0;
let started = false;

for (let i = startIdx; i < code.length; i++) {
  if (code[i] === '{') {
    depth++;
    started = true;
  } else if (code[i] === '}') {
    depth--;
    if (started && depth === 0) {
      endIdx = i;
      break;
    }
  }
}

// Find the ); after the }
const finish = code.indexOf(';', endIdx) + 1;

let invoiceBlock = code.substring(startIdx, finish);

// Now do the replacements to make it a remittance manual generator
let remitBlock = invoiceBlock.replace(/\/api\/invoices\/manual/g, '/api/remittances/manual');
remitBlock = remitBlock.replace(/INSERT INTO invoices/g, 'INSERT INTO remittances');
remitBlock = remitBlock.replace(/UPDATE invoices/g, 'UPDATE remittances');
remitBlock = remitBlock.replace(/invoice_number/g, 'remittance_number');
remitBlock = remitBlock.replace(/invoice_id/g, 'remittance_id');
remitBlock = remitBlock.replace(/buildInvoicePdf/g, 'buildRemittancePdf');
remitBlock = remitBlock.replace(/TEMP-MERGE/g, 'TEMP-REM');
remitBlock = remitBlock.replace(/hcInvoicePrefix/g, 'hcRemittancePrefix');
remitBlock = remitBlock.replace(/ndisInvoicePrefix/g, 'ndisRemittancePrefix');
remitBlock = remitBlock.replace(/isHomeCare \? "HC-" : "INV-"/g, 'isHomeCare ? "HCR-" : "REM-"');
remitBlock = remitBlock.replace(/Manual Invoice generation completed/g, 'Manual Remittance generation completed');
remitBlock = remitBlock.replace(/Manual Invoice Generation Failed/g, 'Manual Remittance Generation Failed');
remitBlock = remitBlock.replace(/const newInvoiceId/g, 'const newRemittanceId');
remitBlock = remitBlock.replace(/newInvoiceId/g, 'newRemittanceId');
remitBlock = remitBlock.replace(/Invoice PDF missing/g, 'Remittance PDF missing');

// Insert it into the code!
const newCode = code.substring(0, finish) + '\n\n' + remitBlock + code.substring(finish);
fs.writeFileSync('src/server.ts', newCode);
console.log("Cloned endpoint!");

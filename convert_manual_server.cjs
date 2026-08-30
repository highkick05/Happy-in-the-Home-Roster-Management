const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const invoiceStart = code.indexOf('app.post(\n    "/api/invoices/manual"');
if (invoiceStart === -1) {
  console.log("Could not find /api/invoices/manual");
  process.exit(1);
}

// Just extract the whole block by depth
let endIdx = -1;
let depth = 0;
let started = false;
for (let i = invoiceStart; i < code.length; i++) {
  if (code[i] === '{') {
    depth++;
    started = true;
  } else if (code[i] === '}') {
    depth--;
    if (started && depth === 0) {
      endIdx = i; // This closes the (req, res) block
      // But wait, the app.post continues until `});`
      const nextSemi = code.indexOf(';', endIdx);
      if (nextSemi !== -1 && nextSemi - endIdx < 10) {
        endIdx = nextSemi;
      }
      break;
    }
  }
}

if (endIdx !== -1) {
  let block = code.substring(invoiceStart, endIdx + 1);
  block = block.replace(/\/api\/invoices\/manual/g, '/api/remittances/manual');
  
  // Replace SQL logic
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
  block = block.replace(/Invoice/g, 'Remittance');
  block = block.replace(/invoice/g, 'remittance');
  block = block.replace(/INVOICE/g, 'REMITTANCE');

  // Let's insert the block right before BLANK TEMPLATES
  const blankTemplatesStart = code.indexOf('// --- BLANK TEMPLATES (FILE SYSTEM) ---');
  if (blankTemplatesStart !== -1) {
    code = code.substring(0, blankTemplatesStart) + 
           '\n\n  // --- Manual Remittances API ---\n' + block + 
           '\n\n' + code.substring(blankTemplatesStart);
    fs.writeFileSync('src/server.ts', code);
    console.log("Injected /api/remittances/manual successfully!");
  } else {
    console.log("Could not find BLANK TEMPLATES");
  }
} else {
  console.log("Could not extract block");
}

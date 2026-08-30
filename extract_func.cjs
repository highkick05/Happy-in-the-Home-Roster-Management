const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const startIdx = code.indexOf('const buildInvoicePdf =');
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

if (startIdx !== -1 && endIdx !== -1) {
  let func = code.substring(startIdx, endIdx + 1);
  func = func.replace(/buildInvoicePdf/g, 'buildRemittancePdf');
  func = func.replace(/TAX INVOICE/g, 'REMITTANCE ADVICE');
  func = func.replace(/Invoice Number:/g, 'Remittance ID:');
  func = func.replace(/Invoice Date:/g, 'Remittance Date:');
  
  // Note: the template replaces things, but it may also contain "Invoice" in variable names which is fine.
  
  fs.writeFileSync('/tmp/buildRemittancePdf.ts', func + ';\n\n');
  console.log("Extracted and saved!");
} else {
  console.log("Not found.");
}

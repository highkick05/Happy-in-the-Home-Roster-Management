const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const startIdx = code.indexOf('  const buildInvoicePdf = (doc: any, data: any) => {');
if (startIdx === -1) {
  console.log("Could not find buildInvoicePdf");
  process.exit(1);
}

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

let func = code.substring(startIdx, endIdx + 1);
func = func.replace(/buildInvoicePdf/g, 'buildRemittancePdf');
func = func.replace(/TAX INVOICE/g, 'REMITTANCE ADVICE');
func = func.replace(/Invoice Number:/g, 'Remittance ID:');
func = func.replace(/Invoice Date:/g, 'Remittance Date:');

code = code.substring(0, endIdx + 1) + '\n\n' + func + code.substring(endIdx + 1);
fs.writeFileSync('src/server.ts', code);
console.log("Cloned PDF builder!");

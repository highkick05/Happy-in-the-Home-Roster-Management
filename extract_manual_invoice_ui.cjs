const fs = require('fs');
const code = fs.readFileSync('src/components/Invoicing/InvoicingView.tsx', 'utf8');

const startIdx = code.indexOf('function ManualInvoiceForm(');
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
  let formCode = code.substring(startIdx, endIdx + 1);
  formCode = formCode.replace(/ManualInvoiceForm/g, 'ManualRemittanceForm');
  formCode = formCode.replace(/\/api\/invoices\/manual/g, '/api/remittances/manual');
  formCode = formCode.replace(/Manual Invoice Generation/g, 'Manual Remittance Generation');
  formCode = formCode.replace(/standalone invoice/g, 'standalone remittance advice');
  formCode = formCode.replace(/Generate Invoice/g, 'Generate Remittance');
  fs.writeFileSync('/tmp/ManualRemittanceForm.txt', formCode);
  console.log("Extracted! Length: ", formCode.length);
} else {
  console.log("Not found.");
}

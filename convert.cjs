const fs = require('fs');
let code = fs.readFileSync('/tmp/ManualRemittanceForm.txt', 'utf8');
code = code.replace(/ManualInvoiceForm/g, 'GenerateRemittanceForm');
code = code.replace(/\/api\/invoices\/manual/g, '/api/remittances/manual');
code = code.replace(/Manual Invoice Generation/g, 'Manual Remittance Generation');
code = code.replace(/standalone invoice/g, 'standalone remittance advice');
code = code.replace(/Generate Invoice/g, 'Generate Remittance');
fs.writeFileSync('/tmp/ManualRemittanceForm.txt', code);

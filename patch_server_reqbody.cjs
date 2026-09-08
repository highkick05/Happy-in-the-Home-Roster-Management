const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const target = `      let { clientId, staffId, services, date, customStaffName, remittanceId: reqRemittanceId, remittanceNumber: reqRemittanceNumber, gstType } = req.body;`;
const replacement = `      let { clientId, staffId, services, date, customStaffName, remittanceId: reqRemittanceId, remittanceNumber: reqRemittanceNumber, gstType, invoiceReference, transactionReference } = req.body;`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/server.ts', code);
  console.log("Req body patched");
} else {
  console.log("Target not found!");
}

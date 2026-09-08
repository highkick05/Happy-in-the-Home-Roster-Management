const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const target = `        const pdfData = {
           shift: { funding_type: clientRow?.funding_type || "NDIS", actual_finish_time: new Date().toISOString() },
           settingsMap: settingsMap,
           invoiceNum: remittanceNumber,
           invoiceDate: date,
           lineItems: lineItems,
           subtotal: calculatedAmount,
           totalAmount: totalAmount,
           gstAmount: calculatedGst,
           client: clientRow,
           contractor: staffRow
        };`;

const replacement = `        const pdfData = {
           shift: { funding_type: clientRow?.funding_type || "NDIS", actual_finish_time: new Date().toISOString() },
           settingsMap: settingsMap,
           invoiceNum: remittanceNumber,
           invoiceDate: date,
           lineItems: lineItems,
           subtotal: calculatedAmount,
           totalAmount: totalAmount,
           gstAmount: calculatedGst,
           client: clientRow,
           contractor: staffRow,
           invoiceReference,
           transactionReference
        };`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/server.ts', code);
  console.log("PDF Data patched");
} else {
  console.log("Target not found!");
}

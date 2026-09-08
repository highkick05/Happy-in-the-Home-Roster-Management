const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetArgs = 'const { settingsMap, invoiceNum, invoiceDate, lineItems, subtotal, totalAmount, gstAmount, contractor, client } = data;';
const repArgs = 'const { settingsMap, invoiceNum, invoiceDate, lineItems, subtotal, totalAmount, gstAmount, contractor, client, invoiceReference, transactionReference } = data;';

code = code.replace(targetArgs, repArgs);

const targetPay = `    doc.font("Helvetica-Bold").fontSize(9).text("Payment Method:", 300, py + 10);
    doc.font("Helvetica").text("Bank Transfer", 300, py + 22);

    doc.moveDown(4);`;

const repPay = `    doc.font("Helvetica-Bold").fontSize(9).text("Payment Method:", 300, py + 10);
    doc.font("Helvetica").text("Bank Transfer", 300, py + 22);
    py += 34;
    
    if (invoiceReference) {
        doc.font("Helvetica-Bold").fontSize(9).text("Invoice Reference:", 300, py + 10);
        doc.font("Helvetica").text(invoiceReference, 300, py + 22);
        py += 34;
    }
    
    if (transactionReference) {
        doc.font("Helvetica-Bold").fontSize(9).text("Transaction Ref:", 300, py + 10);
        doc.font("Helvetica").text(transactionReference, 300, py + 22);
        py += 34;
    }

    doc.moveDown(4);`;

code = code.replace(targetPay, repPay);

fs.writeFileSync('src/server.ts', code);
console.log("PDF render patched");

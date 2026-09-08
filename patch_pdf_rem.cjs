const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetDate = `    doc.text(\`Date: \${invoiceDate}\`, { align: "right" });`;
const repDate = `    let displayDate = invoiceDate;
    if (displayDate && displayDate.includes("-")) {
        const parts = displayDate.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
            displayDate = \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
        }
    }
    doc.text(\`Date: \${displayDate}\`, { align: "right" });`;

code = code.replace(targetDate, repDate);

const targetLayout = `    if (client) {
       let clientName = \`\${client.first_name || ''} \${client.last_name || ''}\`.trim();
       if (clientName) {
           doc.moveDown(1);
           doc.font("Helvetica-Bold").fontSize(9).text("Regarding Client:", 300, py + 10);
           doc.font("Helvetica").text(clientName, 300, py + 22);
           py += 34;
       }
    }
    
    doc.font("Helvetica-Bold").fontSize(9).text("Payment Method:", 300, py + 10);
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

const repLayout = `    let hasClient = false;
    let clientName = "";
    if (client) {
       clientName = \`\${client.first_name || ''} \${client.last_name || ''}\`.trim();
       if (clientName) hasClient = true;
    }

    if (hasClient || invoiceReference) {
        doc.moveDown(1);
        if (hasClient) {
            doc.font("Helvetica-Bold").fontSize(9).text("Regarding Client:", 300, py + 10);
            doc.font("Helvetica").text(clientName, 300, py + 22);
        }
        if (invoiceReference) {
            let xPos = hasClient ? 430 : 300;
            doc.font("Helvetica-Bold").fontSize(9).text("Invoice Reference:", xPos, py + 10);
            doc.font("Helvetica").text(invoiceReference, xPos, py + 22);
        }
        py += 34;
    }

    doc.font("Helvetica-Bold").fontSize(9).text("Payment Method:", 300, py + 10);
    doc.font("Helvetica").text("Bank Transfer", 300, py + 22);
    if (transactionReference) {
        doc.font("Helvetica-Bold").fontSize(9).text("Transaction Ref:", 430, py + 10);
        doc.font("Helvetica").text(transactionReference, 430, py + 22);
    }
    py += 34;

    doc.moveDown(4);`;

code = code.replace(targetLayout, repLayout);

fs.writeFileSync('src/server.ts', code);
console.log("PDF render logic patched");

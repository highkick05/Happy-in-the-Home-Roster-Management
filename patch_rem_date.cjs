const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetDate = `    doc
      .fontSize(10)
      .font("Helvetica")
      .text(\`Remittance No: \${invoiceNum}\`, { align: "right" });
    doc.text(\`Date: \${invoiceDate}\`, { align: "right" });`;

const repDate = `    doc
      .fontSize(10)
      .font("Helvetica")
      .text(\`Remittance No: \${invoiceNum}\`, { align: "right" });

    let displayDate = invoiceDate;
    if (displayDate && displayDate.includes("-")) {
        const parts = displayDate.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
            displayDate = \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
        }
    }
    doc.text(\`Date: \${displayDate}\`, { align: "right" });`;

if (code.includes(targetDate)) {
    code = code.replace(targetDate, repDate);
    fs.writeFileSync('src/server.ts', code);
    console.log("Remittance date patched");
} else {
    console.log("Target not found!");
}

const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetDateRem = `    let displayDate = invoiceDate;
    if (displayDate && displayDate.includes("-")) {
        const parts = displayDate.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
            displayDate = \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
        }
    }
    doc.text(\`Date: \${displayDate}\`, { align: "right" });`;

const repDateRem = `    let displayDate = String(invoiceDate || "").trim();
    if (displayDate.match(/^\\d{4}-\\d{2}-\\d{2}/)) {
        const parts = displayDate.split("T")[0].split("-");
        if (parts.length === 3) {
            displayDate = \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
        }
    }
    doc.text(\`Date: \${displayDate}\`, { align: "right" });`;

code = code.replace(targetDateRem, repDateRem);

const targetDateInv = `    let displayDate = invoiceDate;
    if (displayDate && displayDate.includes("-")) {
        const parts = displayDate.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
            displayDate = \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
        }
    }
    doc.text(\`Date: \${displayDate}\`, { align: "right" });`;

// Replace both occurrences
code = code.replace(targetDateInv, repDateRem); // wait, both occurrences are exactly the same string.
code = code.split(targetDateInv).join(repDateRem); // To replace all.

fs.writeFileSync('src/server.ts', code);
console.log("Remittance date force patched");

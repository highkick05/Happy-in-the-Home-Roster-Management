const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

const targetStr = `        const invoiceNum = \\\`HIST-\\\${date.replace(/-/g, '')}-\\\${Date.now().toString().slice(-4)}\\\`;
        const newFileName = \\\`\\\${invoiceNum}.pdf\\\`;
        const destPath = path.join(folderPath, newFileName);`;

const replaceStr = `        const originalName = file.originalname || "historical-invoice.pdf";
        const invoiceNum = originalName.replace(/\\.[^/.]+$/, "");
        const newFileName = originalName;
        const destPath = path.join(folderPath, newFileName);`;

if (!code.includes("const invoiceNum = `HIST-${date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;")) {
  console.log("Could not find target string.");
} else {
  code = code.replace("const invoiceNum = `HIST-${date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;", 'const originalName = file.originalname || "historical-invoice.pdf";\n        const invoiceNum = originalName.replace(/\\.[^/.]+$/, "");');
  code = code.replace("const newFileName = `${invoiceNum}.pdf`;", "const newFileName = originalName;");
  fs.writeFileSync('src/server.ts', code);
  console.log("Replaced successfully!");
}

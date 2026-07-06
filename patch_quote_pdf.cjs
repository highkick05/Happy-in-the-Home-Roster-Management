const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const targetGSTLine = '        doc.text(`GST:`, 250, currentY + 25, { width: 150, align: "right" });\n        doc.text(`$${gstAmount.toFixed(2)}`, 410, currentY + 25, {\n          width: 120,\n          align: "right",\n        });';

const replGSTLine = '        const gstLabel = gstTypeFromMeta === "GST Free" ? "GST (GST Free):" : "GST:";\n        doc.text(gstLabel, 250, currentY + 25, { width: 150, align: "right" });\n        doc.text(`$${gstAmount.toFixed(2)}`, 410, currentY + 25, {\n          width: 120,\n          align: "right",\n        });';

content = content.replace(targetGSTLine, replGSTLine);
fs.writeFileSync('src/server.ts', content);

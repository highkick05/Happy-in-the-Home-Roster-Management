const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

content = content.replace('doc.text(`${gstAmount.toFixed(2)}`, 410, currentY + 25', 'doc.text(`$${gstAmount.toFixed(2)}`, 410, currentY + 25');

fs.writeFileSync('src/server.ts', content);

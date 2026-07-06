const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

content = content.replace(
  /const gstLabel = [^\n]*\n\s*doc\.text\(gstLabel, 250, currentY \+ 25, \{ width: 150, align: "right" \}\);\n\s*doc\.text\(\`\$\{gstAmount\.toFixed\(2\)\}\`, 410, currentY \+ 25, \{/g,
  'const gstLabel = gstTypeFromMeta === "GST Free" ? "GST (GST Free):" : "GST:";\n        doc.text(gstLabel, 250, currentY + 25, { width: 150, align: "right" });\n        doc.text(`$${gstAmount.toFixed(2)}`, 410, currentY + 25, {'
);

fs.writeFileSync('src/server.ts', content);

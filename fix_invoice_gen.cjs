const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const targetStr = `      const fileName = \`\${invoiceNum}.pdf\`;

      // Just update DB record, no need to write to fs since it's on-the-fly now.`;

const replaceStr = `      if (shift.notes && shift.notes.includes('[HISTORICAL]')) {
        console.log(\`[DEBUG] Skipping invoice generation for historical shift \${shiftId}\`);
        return;
      }

      const fileName = \`\${invoiceNum}.pdf\`;

      // Just update DB record, no need to write to fs since it's on-the-fly now.`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/server.ts', code);
  console.log('Success');
} else {
  console.log('Target string not found');
}

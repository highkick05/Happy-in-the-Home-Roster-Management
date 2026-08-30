const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');
const funcCode = fs.readFileSync('/tmp/buildRemittancePdf.ts', 'utf8');

const anchor = 'const buildInvoicePdf =';
const startIdx = code.indexOf(anchor);

// Find the end of buildInvoicePdf
let endIdx = -1;
let depth = 0;
let started = false;

for (let i = startIdx; i < code.length; i++) {
  if (code[i] === '{') {
    depth++;
    started = true;
  } else if (code[i] === '}') {
    depth--;
    if (started && depth === 0) {
      endIdx = i;
      break;
    }
  }
}

if (endIdx !== -1) {
  // Insert immediately after
  code = code.substring(0, endIdx + 2) + '\n\n' + funcCode + code.substring(endIdx + 2);
  fs.writeFileSync('src/server.ts', code);
  console.log("Injected!");
}

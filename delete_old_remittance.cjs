const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const remStart = code.indexOf('app.post(\n    "/api/remittances",\n    authenticateToken,\n    requireAdmin,\n    (req: any, res: any) => {');

if (remStart !== -1) {
  let endIdx = -1;
  let depth = 0;
  let started = false;
  for (let i = remStart; i < code.length; i++) {
    if (code[i] === '{') {
      depth++;
      started = true;
    } else if (code[i] === '}') {
      depth--;
      if (started && depth === 0) {
        endIdx = i;
        const nextSemi = code.indexOf(';', endIdx);
        if (nextSemi !== -1 && nextSemi - endIdx < 10) endIdx = nextSemi;
        break;
      }
    }
  }
  if (endIdx !== -1) {
    code = code.substring(0, remStart) + code.substring(endIdx + 1);
    fs.writeFileSync('src/server.ts', code);
    console.log("Deleted old POST /api/remittances");
  }
} else {
  console.log("Not found");
}

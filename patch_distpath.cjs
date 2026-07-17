const fs = require('fs');

const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `  const distPath = path.join(process.cwd(), "dist");`;
const replacementStr = `  const distPath = path.join(_dirname, "../dist");`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(file, code);
  console.log('Patched distPath');
} else {
  console.log('Target string not found');
}

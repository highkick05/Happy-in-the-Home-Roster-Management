const fs = require('fs');
const code = fs.readFileSync('src/server.ts', 'utf8');

const startStr = '"/api/invoices/manual",';
let startIndex = code.indexOf(startStr);
if (startIndex !== -1) {
  startIndex = code.lastIndexOf('app.post(', startIndex);
  let depth = 0;
  let endIndex = -1;
  for (let i = startIndex; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') {
      depth--;
      if (depth === 0) { // Assuming the callback is the outermost block after app.post
         // wait, it's `app.post(..., (req, res) => { ... });`
         // let's look for `});` after finding `{` at depth 0
      }
    }
  }
}

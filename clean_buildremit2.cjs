const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

function removeFunction() {
  let count = 0;
  while(true) {
    let startIdx = code.indexOf(`  const buildRemittancePdf = (doc: any, data: any) => {`);
    if (startIdx === -1) break;
    
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
      code = code.substring(0, startIdx) + code.substring(endIdx + 2); // remove the function and trailing };
      count++;
    } else {
      break;
    }
  }
  return count;
}

const removed = removeFunction();
console.log(`Removed ${removed} instances of buildRemittancePdf with spaces`);
fs.writeFileSync('src/server.ts', code);

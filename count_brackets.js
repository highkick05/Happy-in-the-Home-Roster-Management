const fs = require('fs');
const lines = fs.readFileSync('src/server.ts', 'utf8').split('\n');
let count = 0;
let tries = 0;
let catches = 0;
for (let i = 10300; i < 10550; i++) {
  const line = lines[i];
  if (line.includes('{')) count++;
  if (line.includes('}')) count--;
  if (line.includes('try {')) tries++;
  if (line.includes('catch ')) catches++;
}
console.log('Brackets:', count, 'Tries:', tries, 'Catches:', catches);

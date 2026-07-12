const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

code = code.replace(
  /              fType,\n            \);/g,
  '              fType,\n              isHist ? 1 : 0\n            );'
);

code = code.replace(
  /            fType,\n          \);/g,
  '            fType,\n            isHist ? 1 : 0\n          );'
);

fs.writeFileSync('src/server.ts', code);

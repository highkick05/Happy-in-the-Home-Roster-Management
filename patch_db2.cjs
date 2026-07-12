const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');
code = code.replace(
  '          travel_breakdown TEXT,\n          FOREIGN KEY',
  '          travel_breakdown TEXT,\n          is_historical INTEGER DEFAULT 0,\n          FOREIGN KEY'
);
fs.writeFileSync('src/server.ts', code);

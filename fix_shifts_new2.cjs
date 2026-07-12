const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');

code = code.replace(
  'is_historical INTEGER DEFAULT 0,\n          progress_note TEXT,\n          progress_note TEXT,',
  'is_historical INTEGER DEFAULT 0,\n          progress_note TEXT,'
);

fs.writeFileSync('src/server.ts', code);

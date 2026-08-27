const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

// Fix SHIFT_COMPLETED
code = code.replace(
  /for \(const admin of admins\) \{\s+insertNotif\.run\(\s*admin\.id,\s*"SHIFT_COMPLETED",/g,
  `insertNotif.run(
              0,
              "SHIFT_COMPLETED",`
);

// We need to remove the closing brace for the for-loop of SHIFT_COMPLETED.
// Wait, it's easier to just string replace the exact lines.

const fs = require('fs');
let code = fs.readFileSync('src/services/travelEngine.ts', 'utf-8');

// Replace the line where it checks shift status to also check is_historical
code = code.replace(
  'if (shift.status === "COMPLETED") {',
  'if (shift.status === "COMPLETED" && shift.is_historical !== 1) {'
);

fs.writeFileSync('src/services/travelEngine.ts', code);

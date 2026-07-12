const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');
code = code.replace(
  "                              ) : unit === 'Hour' ? (",
  "                              ) : (unit === 'Hour' && !isTravelOrTransport) ? ("
);
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);

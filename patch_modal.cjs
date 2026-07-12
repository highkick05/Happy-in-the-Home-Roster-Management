const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');
code = code.replace(
  "      setIsHistorical(initialData?.status === 'COMPLETED');",
  "      setIsHistorical(initialData?.isHistorical === 1);"
);
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);

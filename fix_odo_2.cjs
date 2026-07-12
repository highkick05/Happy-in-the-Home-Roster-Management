const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');
code = code.replace(
  "setStartOdometer(initialData?.startOdometer ? initialData.startOdometer.toString().replace(/\\.0$/, '') : '');",
  "setStartOdometer(initialData?.startOdometer ? Number(initialData.startOdometer).toString() : '');"
);
code = code.replace(
  "setEndOdometer(initialData?.endOdometer ? initialData.endOdometer.toString().replace(/\\.0$/, '') : '');",
  "setEndOdometer(initialData?.endOdometer ? Number(initialData.endOdometer).toString() : '');"
);
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);

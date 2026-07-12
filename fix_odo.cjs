const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');
code = code.replace(
  "setStartOdometer(initialData?.startOdometer ? initialData.startOdometer.toString() : '');",
  "setStartOdometer(initialData?.startOdometer ? initialData.startOdometer.toString().replace(/\\.0$/, '') : '');"
);
code = code.replace(
  "setEndOdometer(initialData?.endOdometer ? initialData.endOdometer.toString() : '');",
  "setEndOdometer(initialData?.endOdometer ? initialData.endOdometer.toString().replace(/\\.0$/, '') : '');"
);
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);

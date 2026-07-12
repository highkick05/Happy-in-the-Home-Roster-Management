const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');
code = code.replace(
  "value={s.rateOverride || ''}",
  "value={s.rateOverride !== undefined && s.rateOverride !== null ? s.rateOverride : ''}"
);
code = code.replace(
  "value={s.qtyOverride || ''}",
  "value={s.qtyOverride !== undefined && s.qtyOverride !== null ? s.qtyOverride : ''}"
);
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);

const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');
code = code.replace(
  'setIsHistorical(initialData?.isHistorical === 1);',
  'setIsHistorical(!!initialData?.isHistorical);'
);
code = code.replace(
  '{(!initialData?.id || initialData?.isHistorical === 1) && (',
  '{(!initialData?.id || initialData?.isHistorical) && ('
);
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);

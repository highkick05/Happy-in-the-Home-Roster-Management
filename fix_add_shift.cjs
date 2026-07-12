const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');

code = code.replace(
  'setIsHistorical(!!initialData?.isHistorical);',
  `const isHistCheck = !!initialData?.isHistorical || (initialData?.status === 'COMPLETED' && initialData?.notes?.includes('[HISTORICAL]'));
      setIsHistorical(isHistCheck);`
);

code = code.replace(
  '{(!initialData?.id || initialData?.isHistorical) && (',
  '{(!initialData?.id || isHistorical) && ('
);

fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);

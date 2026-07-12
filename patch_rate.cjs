const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');
code = code.replace(
  "    return { rate: finalRate, unit: service.unit || 'Hour', name: service.name || '' };",
  "    if (finalRate === 0 && (service.name?.toLowerCase().includes('provider travel') || service.name?.toLowerCase().includes('activity based transport'))) {\n      finalRate = 1.00;\n    }\n    return { rate: finalRate, unit: service.unit || 'Hour', name: service.name || '' };"
);
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);

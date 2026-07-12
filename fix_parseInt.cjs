const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/AddShiftModal.tsx', 'utf-8');
code = code.replace(/serviceId: parseInt\(s\.serviceId\)/g, 'serviceId: s.serviceId ? parseInt(s.serviceId, 10) : null');
fs.writeFileSync('src/components/Roster/AddShiftModal.tsx', code);

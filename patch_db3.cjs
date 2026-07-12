const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');
code = code.replace(
  '"INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, services_json, is_abt_approved, funding_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",',
  '"INSERT INTO shifts (staff_id, client_id, service_id, start_time, end_time, status, notes, services_json, is_abt_approved, funding_type, is_historical) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",'
);

code = code.replace(
  '        servicesDataString,\n        isAbtApproved ? 1 : 0,\n        fType\n      );',
  '        servicesDataString,\n        isAbtApproved ? 1 : 0,\n        fType,\n        isHist ? 1 : 0\n      );'
);

fs.writeFileSync('src/server.ts', code);

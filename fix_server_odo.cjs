const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf-8');
code = code.replace(
  'startOdo: s.odometer_start_reading || "",',
  'startOdo: s.odometer_start_reading ? Math.round(Number(s.odometer_start_reading)).toString() : "",'
);
code = code.replace(
  'endOdo: s.odometer_end_reading || "",',
  'endOdo: s.odometer_end_reading ? Math.round(Number(s.odometer_end_reading)).toString() : "",'
);
code = code.replace(
  'const startOdo = s.odometer_start_reading || "N/A";',
  'const startOdo = s.odometer_start_reading ? Math.round(Number(s.odometer_start_reading)).toString() : "N/A";'
);
code = code.replace(
  'const endOdo = s.odometer_end_reading || "N/A";',
  'const endOdo = s.odometer_end_reading ? Math.round(Number(s.odometer_end_reading)).toString() : "N/A";'
);
fs.writeFileSync('src/server.ts', code);

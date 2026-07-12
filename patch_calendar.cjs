const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf-8');
code = code.replace(
  '          endOdometer: d.odometer_end_reading,\n        }));',
  '          endOdometer: d.odometer_end_reading,\n          isHistorical: d.is_historical,\n        }));'
);
fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);

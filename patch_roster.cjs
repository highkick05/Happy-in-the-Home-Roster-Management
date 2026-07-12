const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf-8');
code = code.replace(
  '              endOdometer: shift.endOdometer,\n            });',
  '              endOdometer: shift.endOdometer,\n              isHistorical: shift.isHistorical,\n            });'
);
fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);

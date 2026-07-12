const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf-8');
code = code.replace(
  "startOdometer: d.odometer_start_reading,",
  "startOdometer: d.odometer_start_reading ? Math.round(Number(d.odometer_start_reading)).toString() : null,"
);
code = code.replace(
  "endOdometer: d.odometer_end_reading,",
  "endOdometer: d.odometer_end_reading ? Math.round(Number(d.odometer_end_reading)).toString() : null,"
);
fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);

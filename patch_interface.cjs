const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf-8');
code = code.replace(
  '  respiteBookingId?: number;',
  '  respiteBookingId?: number;\n  progressNote?: string;\n  startOdometer?: string | number;\n  endOdometer?: string | number;\n  isHistorical?: number;'
);
fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);

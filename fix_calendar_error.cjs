const fs = require('fs');

let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf-8');

code = code.replace(/initialData=\{selectedEventInfo\}/g, 'initialData={initialShiftData}');
code = code.replace(/setSelectedEventInfo\(null\);/g, 'setInitialShiftData(null);');

fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);
console.log("Fixed RosterCalendar!");

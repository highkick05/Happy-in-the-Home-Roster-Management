const fs = require('fs');
const file = 'src/components/Roster/RosterCalendar.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/draggableAccessor=\{\(event: any\) => true\}/g, '');
fs.writeFileSync(file, code);

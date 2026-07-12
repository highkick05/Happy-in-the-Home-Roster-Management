const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf-8');
if (!code.includes('const DnDCalendar = withDragAndDrop(Calendar);')) {
  code = code.replace("const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];", "const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];\nconst DnDCalendar = withDragAndDrop(Calendar);");
}
fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);

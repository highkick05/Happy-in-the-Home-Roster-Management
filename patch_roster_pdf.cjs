const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf8');

if (!code.includes("import { endOfWeek }")) {
    code = code.replace("import { startOfWeek } from 'date-fns/startOfWeek';", "import { startOfWeek } from 'date-fns/startOfWeek';\nimport { endOfWeek } from 'date-fns/endOfWeek';");
}

const targetStr = `const handlePrintPdf = async () => {
    try {
      const res = await fetch('/api/roster/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({
          startDate: date.toISOString(),
          view: activeView,
          shifts: mappedEvents,
          groupBy,
          filterName: clientFilter ? clientList.find(c => c.id.toString() === clientFilter)?.first_name + ' ' + clientList.find(c => c.id.toString() === clientFilter)?.last_name : staffFilter && staffFilter !== 'unassigned' ? staffList.find(s => s.id.toString() === staffFilter)?.first_name + ' ' + staffList.find(s => s.id.toString() === staffFilter)?.last_name : staffFilter === 'unassigned' ? 'Unassigned Staff' : ''
        })
      });`;

const replacementStr = `const handlePrintPdf = async () => {
    try {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      
      const currentWeekShifts = mappedEvents.filter(shift => {
        const sDate = new Date(shift.start);
        return sDate >= weekStart && sDate <= weekEnd;
      });

      const res = await fetch('/api/roster/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          view: activeView,
          shifts: currentWeekShifts,
          groupBy,
          filterName: clientFilter ? clientList.find(c => c.id.toString() === clientFilter)?.first_name + ' ' + clientList.find(c => c.id.toString() === clientFilter)?.last_name : staffFilter && staffFilter !== 'unassigned' ? staffList.find(s => s.id.toString() === staffFilter)?.first_name + ' ' + staffList.find(s => s.id.toString() === staffFilter)?.last_name : staffFilter === 'unassigned' ? 'Unassigned Staff' : ''
        })
      });`;

if (code.includes('startDate: date.toISOString()')) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);
    console.log('Successfully patched RosterCalendar.tsx!');
} else {
    console.log('Regex did not match!');
}

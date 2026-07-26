const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf8');

const targetStr = `        body: JSON.stringify({
          startDate: date.toISOString(),
          view: activeView,
          shifts: mappedEvents,
          groupBy
        })`;

const replacementStr = `        body: JSON.stringify({
          startDate: date.toISOString(),
          view: activeView,
          shifts: mappedEvents,
          groupBy,
          filterName: clientFilter ? clientList.find(c => c.id.toString() === clientFilter)?.first_name + ' ' + clientList.find(c => c.id.toString() === clientFilter)?.last_name : staffFilter && staffFilter !== 'unassigned' ? staffList.find(s => s.id.toString() === staffFilter)?.first_name + ' ' + staffList.find(s => s.id.toString() === staffFilter)?.last_name : staffFilter === 'unassigned' ? 'Unassigned Staff' : ''
        })`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);
    console.log('Patched RosterCalendar.tsx');
} else {
    console.log('Could not find target string in RosterCalendar.tsx');
}

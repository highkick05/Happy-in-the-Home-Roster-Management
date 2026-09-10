const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf8');

if (!code.includes("fromZonedTime")) {
    const importTarget = "import { getDay } from 'date-fns/getDay';";
    const importRep = "import { getDay } from 'date-fns/getDay';\nimport { toZonedTime, fromZonedTime } from 'date-fns-tz';";
    code = code.replace(importTarget, importRep);
}

// Map the shifts from API (UTC) to visually appear in the Org's timezone on the calendar
const fetchTarget = `            id: shift.id,`;
const fetchRep = `            // Force the shift to visually render at the organization's exact clock time, 
            // completely ignoring the user's local browser timezone.
            start: (() => {
              const orgTime = toZonedTime(new Date(shift.start_time), settings?.timezone || 'Australia/Perth');
              return new Date(orgTime.getFullYear(), orgTime.getMonth(), orgTime.getDate(), orgTime.getHours(), orgTime.getMinutes(), orgTime.getSeconds());
            })(),
            end: (() => {
              const orgTime = toZonedTime(new Date(shift.end_time), settings?.timezone || 'Australia/Perth');
              return new Date(orgTime.getFullYear(), orgTime.getMonth(), orgTime.getDate(), orgTime.getHours(), orgTime.getMinutes(), orgTime.getSeconds());
            })(),
            id: shift.id,`;

if (code.includes(fetchTarget) && !code.includes("toZonedTime(new Date(shift.start_time)")) {
    code = code.replace(`            start: new Date(shift.start_time),
            end: new Date(shift.end_time),
            id: shift.id,`, fetchRep);
}


// When sending updates back, convert the visually spoofed local time back into the correct absolute UTC time for the organization
const updateTarget = `      const res = await fetch(\`/api/shifts/\${sEvent.id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString()
        })
      });`;

const updateRep = `      // Translate the spoofed calendar visual time back into an absolute UTC timestamp 
      // based on the organizational timezone, NOT the browser's timezone.
      const orgTz = settings?.timezone || 'Australia/Perth';
      const visualStart = new Date(start);
      const visualEnd = new Date(end);
      
      const startIso = fromZonedTime(
        \`\${visualStart.getFullYear()}-\${String(visualStart.getMonth()+1).padStart(2,'0')}-\${String(visualStart.getDate()).padStart(2,'0')}T\${String(visualStart.getHours()).padStart(2,'0')}:\${String(visualStart.getMinutes()).padStart(2,'0')}:00\`, 
        orgTz
      ).toISOString();
      
      const endIso = fromZonedTime(
        \`\${visualEnd.getFullYear()}-\${String(visualEnd.getMonth()+1).padStart(2,'0')}-\${String(visualEnd.getDate()).padStart(2,'0')}T\${String(visualEnd.getHours()).padStart(2,'0')}:\${String(visualEnd.getMinutes()).padStart(2,'0')}:00\`, 
        orgTz
      ).toISOString();

      const res = await fetch(\`/api/shifts/\${sEvent.id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({
          startTime: startIso,
          endTime: endIso
        })
      });`;

if (code.includes("startTime: new Date(start).toISOString()")) {
    code = code.replace(updateTarget, updateRep);
}


fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);
console.log("Patched RosterCalendar.tsx");

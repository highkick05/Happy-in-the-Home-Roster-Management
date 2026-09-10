const fs = require('fs');
let code = fs.readFileSync('src/components/Roster/RosterCalendar.tsx', 'utf8');

const target = `  const onSelectSlot = (slotInfo: any) => {
    if (user?.role !== 'ADMIN') return;
    const { start, end, resourceId } = slotInfo;
    
    // Convert to local date and time strings for the form
    const startStr = start.toISOString(); // this might be UTC, so let's format locally
    const dateStr = start.toLocaleDateString('en-CA'); // 'YYYY-MM-DD' natively
    const startTimeStr = start.toTimeString().slice(0, 5); // 'HH:mm'
    const endTimeStr = end.toTimeString().slice(0, 5);`;

const rep = `  const onSelectSlot = (slotInfo: any) => {
    if (user?.role !== 'ADMIN') return;
    const { start, end, resourceId } = slotInfo;
    
    // Reverse the spoofed calendar time back to the organizational absolute time
    // so the new shift modal gets pre-filled with the exact visual digits chosen.
    const orgTz = settings?.timezone || 'Australia/Perth';
    const visualStart = new Date(start);
    const visualEnd = new Date(end);

    const startIso = fromZonedTime(
      \`\${visualStart.getFullYear()}-\${String(visualStart.getMonth()+1).padStart(2,'0')}-\${String(visualStart.getDate()).padStart(2,'0')}T\${String(visualStart.getHours()).padStart(2,'0')}:\${String(visualStart.getMinutes()).padStart(2,'0')}:00\`, 
      orgTz
    ).toISOString();

    const dateStr = \`\${visualStart.getFullYear()}-\${String(visualStart.getMonth()+1).padStart(2,'0')}-\${String(visualStart.getDate()).padStart(2,'0')}\`;
    const startTimeStr = \`\${String(visualStart.getHours()).padStart(2,'0')}:\${String(visualStart.getMinutes()).padStart(2,'0')}\`;
    const endTimeStr = \`\${String(visualEnd.getHours()).padStart(2,'0')}:\${String(visualEnd.getMinutes()).padStart(2,'0')}\`;`;

if (code.includes(target) && !code.includes("Reverse the spoofed calendar time")) {
    code = code.replace(target, rep);
    fs.writeFileSync('src/components/Roster/RosterCalendar.tsx', code);
    console.log("Patched onSelectSlot");
}


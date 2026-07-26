const fs = require('fs');

const serverFile = 'src/server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const targetStr = `        const shiftsByDay = Array(7).fill(null).map(() => []);

        (shifts || []).forEach(shift => {`;

const replacementStr = `        const shiftsByDay = Array(7).fill(null).map(() => []);

        const mondayStart = new Date(monday);
        mondayStart.setHours(0,0,0,0);
        const sundayEnd = new Date(monday);
        sundayEnd.setDate(sundayEnd.getDate() + 6);
        sundayEnd.setHours(23,59,59,999);

        const thisWeekShifts = (shifts || []).filter(s => {
           const sDate = new Date(s.start);
           return sDate >= mondayStart && sDate <= sundayEnd;
        });

        thisWeekShifts.forEach(shift => {`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync(serverFile, code);
console.log('Patched PDF date filtering successfully.');

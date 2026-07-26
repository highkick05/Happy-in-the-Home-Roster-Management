const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /const shiftsByDay = Array\(7\)\.fill\(null\)\.map\(\(\) => \[\]\);\s+\(shifts \|\| \[\]\)\.forEach\(shift => \{/m;

if (regex.test(code)) {
    code = code.replace(regex, `const shiftsByDay = Array(7).fill(null).map(() => []);

        const mondayStart = new Date(monday);
        mondayStart.setHours(0,0,0,0);
        const sundayEnd = new Date(monday);
        sundayEnd.setDate(sundayEnd.getDate() + 6);
        sundayEnd.setHours(23,59,59,999);

        const thisWeekShifts = (shifts || []).filter(s => {
           const sDate = new Date(s.start);
           return sDate >= mondayStart && sDate <= sundayEnd;
        });

        thisWeekShifts.forEach(shift => {`);
    fs.writeFileSync('src/server.ts', code);
    console.log('Successfully patched!');
} else {
    console.log('Regex did not match!');
}

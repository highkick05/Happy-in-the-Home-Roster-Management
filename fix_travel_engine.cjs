const fs = require('fs');
let code = fs.readFileSync('src/services/travelEngine.ts', 'utf8');

const targetStr = `WHERE s.staff_id = ? 
        AND s.status != 'CANCELLED' 
        AND s.start_time >= ? 
        AND s.start_time <= ?`;

const replaceStr = `WHERE s.staff_id = ? 
        AND s.status != 'CANCELLED' 
        AND (s.notes IS NULL OR s.notes NOT LIKE '%[HISTORICAL]%')
        AND s.start_time >= ? 
        AND s.start_time <= ?`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/services/travelEngine.ts', code);
  console.log('Success');
} else {
  console.log('Target string not found');
}

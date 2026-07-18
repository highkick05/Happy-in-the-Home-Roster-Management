const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('End Odometer'));
console.log(lines.slice(start, start + 40).join('\n'));

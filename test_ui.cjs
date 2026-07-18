const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');
console.log(code.includes("user?.role === 'ADMIN' && (") || code.includes("user?.role === 'ADMIN' ?"));

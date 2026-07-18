const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/<td colSpan=\{[0-9]+\}/g, '<td colSpan={12}');

fs.writeFileSync(file, code);

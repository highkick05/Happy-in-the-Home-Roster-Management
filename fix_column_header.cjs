const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/<th className="px-4 py-3">Actions<\/th>/, '<th className="px-4 py-3 border-r border-border-subtle/30">Vehicle</th>');
code = code.replace(/<td colSpan=\{8\}/g, '<td colSpan={9}');

fs.writeFileSync(file, code);

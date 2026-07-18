const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '<th className="px-4 py-3 border-r border-border-subtle/30">Staff Name</th>',
  "{user?.role === 'ADMIN' && <th className=\"px-4 py-3 border-r border-border-subtle/30\">Staff Name</th>}"
);

code = code.replace(
  '<td className="px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap">{log.staff_first} {log.staff_last}</td>',
  "{user?.role === 'ADMIN' && <td className=\"px-4 py-3 border-r border-border-subtle/30 whitespace-nowrap\">{log.staff_first} {log.staff_last}</td>}"
);

fs.writeFileSync(file, code);

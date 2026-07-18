const fs = require('fs');
const file = 'src/components/Compliance/ComplianceDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// For evidenceMatrix
code = code.replace(
  /<tr key=\{row\.id\} className=\{idx % 2 === 0 \? 'bg-\[#0E0E10\]\/40 hover:bg-brand-bg' : 'bg-brand-navy hover:bg-brand-bg transition-colors'\}>\s*<td className="px-4 py-2 border-r border-border-subtle\/30 font-medium whitespace-nowrap">\{row\.client_first\} \{row\.client_last\}<\/td>/g,
  `<tr key={row.id} className={idx % 2 === 0 ? 'bg-[#0E0E10]/40 hover:bg-brand-bg' : 'bg-brand-navy hover:bg-brand-bg transition-colors'}>
                             <td className="px-4 py-2 border-r border-border-subtle/30 font-mono text-xs text-[#8B949E] whitespace-nowrap">#{row.id}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 font-medium whitespace-nowrap">{row.client_first} {row.client_last}</td>`
);

// For staffMatrix
code = code.replace(
  /<tr key=\{row\.id\} className=\{idx % 2 === 0 \? 'bg-\[#0E0E10\]\/40 hover:bg-brand-bg' : 'bg-brand-navy hover:bg-brand-bg transition-colors'\}>\s*<td className="px-4 py-2 border-r border-border-subtle\/30 font-medium whitespace-nowrap">\{row\.staff_first\} \{row\.staff_last\}<\/td>/g,
  `<tr key={row.id} className={idx % 2 === 0 ? 'bg-[#0E0E10]/40 hover:bg-brand-bg' : 'bg-brand-navy hover:bg-brand-bg transition-colors'}>
                             <td className="px-4 py-2 border-r border-border-subtle/30 font-mono text-xs text-[#8B949E] whitespace-nowrap">#{row.id}</td>
                             <td className="px-4 py-2 border-r border-border-subtle/30 font-medium whitespace-nowrap">{row.staff_first} {row.staff_last}</td>`
);

// We should also adjust colSpan for the "No records" row because it is now 10 and 14 instead of 9 and ? 
code = code.replace(
  /<td colSpan=\{9\} className="px-4 py-8 text-center text-\[#8B949E\]">No evidence records available\.<\/td>/g,
  '<td colSpan={10} className="px-4 py-8 text-center text-[#8B949E]">No evidence records available.</td>'
);
// In the staff matrix, it currently is colSpan={11} but the columns count is 14. 
code = code.replace(
  /<td colSpan=\{11\} className="px-4 py-8 text-center text-\[#8B949E\]">No staff records available\.<\/td>/g,
  '<td colSpan={14} className="px-4 py-8 text-center text-[#8B949E]">No staff records available.</td>'
);


fs.writeFileSync(file, code);

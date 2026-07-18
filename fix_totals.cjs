const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add variables back to line 322 (which is before `return (\n    <div className="flex flex-col h-full bg-brand-bg relative min-h-screen">`)
const totalsVariables = `
  const totalPTKm = expandedLogs.reduce((acc, log) => acc + (Number(log.provider_travel_km) || 0), 0);
  const totalPTCost = expandedLogs.reduce((acc, log) => acc + (Number(log.provider_travel_cost) || 0), 0);
  const totalABTKm = expandedLogs.reduce((acc, log) => acc + (Number(log.abt_km) || 0), 0);
  const totalABTCost = expandedLogs.reduce((acc, log) => acc + (Number(log.abt_cost) || 0), 0);
  const grandTotalKm = totalPTKm + totalABTKm;
  const grandTotalCost = totalPTCost + totalABTCost;
`;

code = code.replace(/return \(\n\s*<div className="flex flex-col h-full bg-brand-bg relative min-h-screen">/, totalsVariables + '\n  return (\n    <div className="flex flex-col h-full bg-brand-bg relative min-h-screen">');

// Remove the second tfoot (from line 700 to 724 roughly)
// It was inserted at the end of the vehicles table.
code = code.replace(/<\/tbody>\s*<tfoot className="bg-brand-navy border-t-2 border-border-subtle font-semibold">[\s\S]*?<\/tfoot>\s*<\/table>\s*<\/div>\s*<\/div>\s*<\/div>/, '</tbody></table></div></div></div>');


fs.writeFileSync(file, code);

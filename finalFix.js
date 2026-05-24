import fs from 'fs';
let lines = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8').split('\n');
lines = lines.slice(0, 944);

let c = lines.join('\n');

c = c.replace(/: '\(\(row\.provider_travel_cost \|\| 0\) \+ \(row\.abt_cost \|\| 0\)\)\.toFixed\(2\)\)\}/g, ': "$" + ((row.provider_travel_cost || 0) + (row.abt_cost || 0)).toFixed(2)}');

c = c.replace(/: \\`\$\\\$\{\(\(row\.provider_travel_cost \|\| 0\) \+ \(row\.abt_cost \|\| 0\)\)\.toFixed\(2\)\)\}/g, ': "$" + ((row.provider_travel_cost || 0) + (row.abt_cost || 0)).toFixed(2)}');

fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', c);
console.log('Fixed');

import fs from 'fs';
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

content = content.replaceAll(
  "\\`$\${((row.provider_travel_cost || 0) + (row.abt_cost || 0)).toFixed(2)}\\`",
  "'$' + ((row.provider_travel_cost || 0) + (row.abt_cost || 0)).toFixed(2)"
);

fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content);
console.log('Update complete');

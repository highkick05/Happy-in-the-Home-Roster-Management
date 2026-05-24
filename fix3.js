import fs from 'fs';
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

const regex = /:\s*.*?abt_cost.*?\}\n/g;

content = content.replace(regex, ": '$' + ((row.provider_travel_cost || 0) + (row.abt_cost || 0)).toFixed(2)\n");

fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content);

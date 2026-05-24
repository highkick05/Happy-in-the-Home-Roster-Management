import fs from 'fs';
let c=fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx','utf8'); 
c = c.replace(/\\`\$\\\$\{/g, "'$' + ("); 
c = c.replace(/\.toFixed\(2\)\}\\`/g, ".toFixed(2))"); 
fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', c);

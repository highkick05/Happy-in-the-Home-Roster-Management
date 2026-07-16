const fs = require('fs');
let content = fs.readFileSync('src/components/Compliance/ComplianceDashboard.tsx', 'utf8');

content = content.replace("                         return (\nreturn (", "                         }\n\n                         return (");

fs.writeFileSync('src/components/Compliance/ComplianceDashboard.tsx', content);

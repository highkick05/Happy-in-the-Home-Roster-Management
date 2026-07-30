const fs = require('fs');
const path = 'src/components/Directory/ClientDashboardView.tsx';
let content = fs.readFileSync(path, 'utf-8');
content = content.replace(/navigate\('([^']+)'\)/g, "navigate('$1', { replace: true })");
content = content.replace(/navigate\(\`([^`]+)\`\)/g, "navigate(`$1`, { replace: true })");
fs.writeFileSync(path, content);
console.log('Fixed ClientDashboardView navigates');

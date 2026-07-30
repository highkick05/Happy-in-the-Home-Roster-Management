const fs = require('fs');
['src/components/Directory/StaffClientsView.tsx', 'src/components/Directory/NdisBudgetView.tsx', 'src/components/Directory/HomeCareBudgetView.tsx'].forEach(path => {
  let content = fs.readFileSync(path, 'utf-8');
  content = content.replace(/navigate\('([^']+)'\)/g, "navigate('$1', { replace: true })");
  content = content.replace(/navigate\(\`([^`]+)\`\)/g, "navigate(`$1`, { replace: true })");
  fs.writeFileSync(path, content);
});
console.log('Fixed other navigates');

const fs = require('fs');
const file = 'src/components/TravelLogsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const { user } = useAuth\(\);/, 'const { user, token } = useAuth();\n  const headers = { Authorization: `Bearer ${token}` };');

code = code.replace(/fetch\('\/api\/vehicles'\)/, "fetch('/api/vehicles', { headers })");
code = code.replace(/fetch\('\/api\/staff'\)/, "fetch('/api/staff', { headers })");
code = code.replace(/fetch\('\/api\/clients'\)/, "fetch('/api/clients', { headers })");
code = code.replace(/fetch\(url\.toString\(\)\)/, "fetch(url.toString(), { headers })");

code = code.replace(/fetch\('\/api\/vehicles', \{/g, "fetch('/api/vehicles', {");
code = code.replace(/headers: \{ 'Content-Type': 'application\/json' \}/g, "headers: { ...headers, 'Content-Type': 'application/json' }");
code = code.replace(/fetch\(\`\/api\/vehicles\/\${id}\`, \{ method: 'DELETE' \}\)/g, "fetch(`/api/vehicles/${id}`, { method: 'DELETE', headers })");

fs.writeFileSync(file, code);
console.log('Fixed Auth token');

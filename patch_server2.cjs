const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const target1 = `claimableTravelCell = \`PT: \${p_km} km ($\${(p_km * 1.0).toFixed(2)})\\nABT: \${s.abt_km} km ($\${((s.abt_km||0) * 1.0).toFixed(2)})\`;`;
const replace1 = `claimableTravelCell = \`PT: \${p_km} km ($\${(p_km * 1.0).toFixed(2)})\\nABT: \${s.abt_km} km ($\${((s.abt_km||0) * 1.0).toFixed(2)})\\nTotal: $\${(p_km * 1.0 + (s.abt_km||0) * 1.0).toFixed(2)}\`;`;

content = content.replace(target1, replace1);
fs.writeFileSync(file, content);
console.log("Done patching server.ts for Total");

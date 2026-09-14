const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf-8');
content = content.replace(
  'sql += " ORDER BY sort_order ASC, original_name ASC";',
  'sql += " ORDER BY original_name ASC";'
);
fs.writeFileSync('src/server.ts', content);
console.log("Patched server.ts");

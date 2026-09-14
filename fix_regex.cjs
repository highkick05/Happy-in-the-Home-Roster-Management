const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

content = content.replace(
  "replace(/^\\\\/+/, '').replace(/^\\/+/, '')",
  "replace(/^[\\\\\\\\\\\\/]+/, '')"
);

fs.writeFileSync('src/server.ts', content);
console.log("Fixed regex");

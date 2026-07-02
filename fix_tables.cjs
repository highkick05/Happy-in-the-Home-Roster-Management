const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/try {\n    db.exec\(\`\n          db.exec\(\`/g, "try {\n    db.exec(`");

fs.writeFileSync(file, code);

const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

code = code.replace(
  'const token = jwt.sign({ id: user.id, role: targetRole }',
  'db.prepare("UPDATE users SET last_active_role = ? WHERE id = ?").run(targetRole, user.id);\n\n    const token = jwt.sign({ id: user.id, role: targetRole }'
);

fs.writeFileSync('src/server.ts', code);

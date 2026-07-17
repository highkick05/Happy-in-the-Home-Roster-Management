const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

const regex = /const token = jwt\.sign\(\{ id: user\.id, role: user\.role \}, JWT_SECRET, \{\n\s*expiresIn: "1d",\n\s*\}\);/;

const replacement = `    let loginRole = user.role;
    if (user.last_active_role && (user.last_active_role === 'ADMIN' || user.last_active_role === 'STAFF')) {
      if (user.role === 'ADMIN' || user.can_switch_admin) {
        loginRole = user.last_active_role;
      }
    }

    const token = jwt.sign({ id: user.id, role: loginRole }, JWT_SECRET, {
      expiresIn: "1d",
    });`;

code = code.replace(regex, replacement);

code = code.replace(
  'role: user.role,\n        firstName: user.first_name,',
  'role: loginRole,\n        firstName: user.first_name,'
);

fs.writeFileSync('src/server.ts', code);

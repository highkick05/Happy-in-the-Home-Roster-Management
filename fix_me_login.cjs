const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

code = code.replace(
  '"SELECT id, email, role, first_name, last_name FROM users WHERE id = ?",',
  '"SELECT id, email, role, first_name, last_name, can_switch_admin FROM users WHERE id = ?",'
);

code = code.replace(
  'id: user.id,\n        email: user.email,\n        role: user.role,\n        firstName: user.first_name,\n        lastName: user.last_name,\n      },',
  'id: user.id,\n        email: user.email,\n        role: user.role,\n        firstName: user.first_name,\n        lastName: user.last_name,\n        canSwitchAdmin: !!user.can_switch_admin,\n      },'
);

code = code.replace(
  'role: user.role,\n      firstName: user.first_name,\n      lastName: user.last_name,\n    },\n    settings,',
  'role: user.role,\n      firstName: user.first_name,\n      lastName: user.last_name,\n      canSwitchAdmin: !!user.can_switch_admin,\n    },\n    settings,'
);

fs.writeFileSync('src/server.ts', code);

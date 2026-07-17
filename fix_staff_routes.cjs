const fs = require('fs');
let code = fs.readFileSync('src/server.ts', 'utf8');

// Patch POST /api/staff
code = code.replace(
  'superMemberNumber,\n    } = req.body;',
  'superMemberNumber,\n      canSwitchAdmin,\n    } = req.body;'
);
code = code.replace(
  'super_fund_name, super_member_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",',
  'super_fund_name, super_member_number, can_switch_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",'
);
code = code.replace(
  'superMemberNumber,\n      );',
  'superMemberNumber,\n        canSwitchAdmin ? 1 : 0,\n      );'
);

// Patch PUT /api/staff/:id
code = code.replace(
  'superMemberNumber,\n    } = req.body;\n    const { id } = req.params;',
  'superMemberNumber,\n      canSwitchAdmin,\n    } = req.body;\n    const { id } = req.params;'
);
code = code.replace(
  'super_fund_name = ?, super_member_number = ? WHERE id = ?",',
  'super_fund_name = ?, super_member_number = ?, can_switch_admin = ? WHERE id = ?",'
);
code = code.replace(
  'superMemberNumber,\n        id,\n      );',
  'superMemberNumber,\n        canSwitchAdmin ? 1 : 0,\n        id,\n      );'
);

fs.writeFileSync('src/server.ts', code);

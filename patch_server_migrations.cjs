const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Add migrations for `status` and `additional_positions`
const migrations = `
      try {
        db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'ACTIVE'");
      } catch (e) {}
      try {
        db.exec("ALTER TABLE users ADD COLUMN additional_positions TEXT DEFAULT '[]'");
      } catch (e) {}
`;

if (!content.includes('ADD COLUMN status TEXT DEFAULT \'ACTIVE\'')) {
    content = content.replace(
        'db.exec("ALTER TABLE users ADD COLUMN primary_position TEXT");\n      } catch (e) {}',
        'db.exec("ALTER TABLE users ADD COLUMN primary_position TEXT");\n      } catch (e) {}\n' + migrations
    );
}

// 2. Add `status` back to the GET /api/staff queries since we just added it to the DB!
content = content.replace(
  /"SELECT id, email, role, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, can_switch_admin, avatar_url, primary_position, additional_positions FROM users"/g,
  '"SELECT id, email, role, status, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, can_switch_admin, avatar_url, primary_position, additional_positions FROM users"'
);

content = content.replace(
  /"SELECT id, first_name, last_name, role, avatar_url, primary_position, additional_positions FROM users WHERE role = \?"/g,
  '"SELECT id, first_name, last_name, role, status, avatar_url, primary_position, additional_positions FROM users WHERE role = ?"'
);

content = content.replace(
  /"SELECT id, first_name, last_name FROM users WHERE role = 'STAFF' ORDER BY first_name ASC"/g,
  '"SELECT id, first_name, last_name FROM users WHERE role = \'STAFF\' AND status = \'ACTIVE\' ORDER BY first_name ASC"'
);

// 3. Fix PUT /api/staff/:id to include additionalPositions
const putStaffStart = 'app.put("/api/staff/:id", authenticateToken, requireAdmin, (req, res) => {';
if (content.includes(putStaffStart) && !content.includes('additional_positions = ? WHERE id = ?')) {
    content = content.replace(
        'primaryPosition,\n    } = req.body;',
        'primaryPosition,\n      additionalPositions,\n    } = req.body;'
    );
    content = content.replace(
        'primary_position = ? WHERE id = ?",',
        'primary_position = ?, additional_positions = ? WHERE id = ?",'
    );
    content = content.replace(
        'primaryPosition || null,\n        id,\n      );',
        'primaryPosition || null,\n        additionalPositions ? JSON.stringify(additionalPositions) : "[]",\n        id,\n      );'
    );
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed migrations and queries in server.ts');

const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

// The users table does not have `status` or `created_at`! It crashed when trying to select it.
content = content.replace(
  /"SELECT id, email, role, status, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, created_at, can_switch_admin, avatar_url, primary_position, additional_positions FROM users"/,
  '"SELECT id, email, role, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, can_switch_admin, avatar_url, primary_position, additional_positions FROM users"'
);

// Fix the active client query that also requested status
content = content.replace(
  /"SELECT id, first_name, last_name FROM users WHERE role = 'STAFF' AND status = 'ACTIVE' ORDER BY first_name ASC"/g,
  '"SELECT id, first_name, last_name FROM users WHERE role = \'STAFF\' ORDER BY first_name ASC"'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed server.ts SQL queries for users');

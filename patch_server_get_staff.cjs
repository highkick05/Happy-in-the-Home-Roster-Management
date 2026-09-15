const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

content = content.replace(
  'SELECT id, first_name, last_name, role, avatar_url, primary_position FROM users WHERE role = ?',
  'SELECT id, first_name, last_name, role, avatar_url, primary_position, additional_positions FROM users WHERE role = ?'
);

content = content.replace(
  'SELECT id, email, role, status, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, created_at, can_switch_admin, avatar_url, primary_position FROM users',
  'SELECT id, email, role, status, first_name, last_name, phone, address, dob, emergency_contact_name, emergency_contact_phone, bank_name, bank_bsb, bank_acc, tax_number, super_fund_name, super_member_number, created_at, can_switch_admin, avatar_url, primary_position, additional_positions FROM users'
);

fs.writeFileSync('src/server.ts', content, 'utf8');
console.log("Patched GET /api/staff successfully");

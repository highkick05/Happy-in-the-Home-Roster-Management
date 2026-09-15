const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

// Update the /api/staff route to return both ADMIN and STAFF roles instead of hardcoding "role = 'STAFF'"
content = content.replace(
  /const staff = db\s*\.prepare\(\s*"SELECT \(\?\) as isNewRow, id, first_name, last_name, role, email, status, phone, primary_position, additional_positions, onboarding_json FROM users WHERE role = '\?'",\s*\)\s*\.all\('STAFF'\);/g,
  `const staff = db.prepare("SELECT (?) as isNewRow, id, first_name, last_name, role, email, status, phone, primary_position, additional_positions, onboarding_json FROM users WHERE role IN ('STAFF', 'ADMIN')").all(0);`
);

content = content.replace(
  /const staff = db\s*\.prepare\(\s*"SELECT \(\?\) as isNewRow, id, first_name, last_name, role, email, status, phone, avatar_url, last_active_role, can_switch_admin, primary_position, additional_positions, onboarding_json FROM users WHERE role = '\?'",\s*\)\s*\.all\('STAFF'\);/g,
  `const staff = db.prepare("SELECT (?) as isNewRow, id, first_name, last_name, role, email, status, phone, avatar_url, last_active_role, can_switch_admin, primary_position, additional_positions, onboarding_json FROM users WHERE role IN ('STAFF', 'ADMIN')").all(0);`
);

fs.writeFileSync(file, content, 'utf8');
console.log('API staff query patched');

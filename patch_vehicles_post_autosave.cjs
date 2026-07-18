const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const replacementRegex = /const result = db\.prepare\("INSERT INTO vehicles \(name, rego, user_id, is_primary\) VALUES \(\?, \?, \?, \?\)"\)\.run\(name, rego, targetUserId, willBePrimary\);/;

const replacementStr = `const result = db.prepare("INSERT INTO vehicles (name, rego, user_id, is_primary) VALUES (?, ?, ?, ?)").run(name, rego, targetUserId, willBePrimary);
      
      // Auto-assign to unassigned shifts if it's the primary vehicle
      if (willBePrimary === 1) {
         db.prepare("UPDATE shifts SET vehicle_id = ? WHERE staff_id = ? AND (vehicle_id IS NULL OR vehicle_id = '')").run(result.lastInsertRowid, targetUserId);
      }`;

code = code.replace(replacementRegex, replacementStr);
fs.writeFileSync(file, code);
console.log("Patched to auto-assign vehicle");

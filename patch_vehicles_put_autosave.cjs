const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /db\.prepare\("UPDATE vehicles SET name = \?, rego = \?, user_id = \?, is_primary = \? WHERE id = \?"\)\.run\(name, rego, targetUserId, is_primary !== undefined \? is_primary : vehicle\.is_primary, req\.params\.id\);/;

const str = `db.prepare("UPDATE vehicles SET name = ?, rego = ?, user_id = ?, is_primary = ? WHERE id = ?").run(name, rego, targetUserId, is_primary !== undefined ? is_primary : vehicle.is_primary, req.params.id);
      
      const updatedPrimary = is_primary !== undefined ? is_primary : vehicle.is_primary;
      if (updatedPrimary === 1) {
         db.prepare("UPDATE shifts SET vehicle_id = ? WHERE staff_id = ? AND (vehicle_id IS NULL OR vehicle_id = '')").run(req.params.id, targetUserId);
      }`;
code = code.replace(regex, str);
fs.writeFileSync(file, code);

const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const postRegex = /app\.post\("\/api\/vehicles", authenticateToken, \(req, res\) => \{\n    try \{\n      const \{ name, rego, user_id \} = req\.body;\n      const targetUserId = req\.user\.role === "staff" \? req\.user\.id : user_id \|\| req\.user\.id;\n      const result = db\.prepare\("INSERT INTO vehicles \(name, rego, user_id\) VALUES \(\?, \?, \?\)"\)\.run\(name, rego, targetUserId\);\n      res\.json\(\{ id: result\.lastInsertRowid, name, rego, user_id: targetUserId \}\);\n    \} catch \(error\) \{\n      console\.error\("Error creating vehicle:", error\);\n      res\.status\(500\)\.json\(\{ error: "Failed to create vehicle" \}\);\n    \}\n  \}\);/;

const postReplace = `app.post("/api/vehicles", authenticateToken, (req, res) => {
    try {
      const { name, rego, user_id, is_primary } = req.body;
      const targetUserId = req.user.role === "staff" ? req.user.id : user_id || req.user.id;
      
      const existing = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE user_id = ?").get(targetUserId) as {c: number};
      const willBePrimary = existing.c === 0 || is_primary ? 1 : 0;
      
      if (willBePrimary === 1) {
         db.prepare("UPDATE vehicles SET is_primary = 0 WHERE user_id = ?").run(targetUserId);
      }
      
      const result = db.prepare("INSERT INTO vehicles (name, rego, user_id, is_primary) VALUES (?, ?, ?, ?)").run(name, rego, targetUserId, willBePrimary);
      res.json({ id: result.lastInsertRowid, name, rego, user_id: targetUserId, is_primary: willBePrimary });
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ error: "Failed to create vehicle" });
    }
  });`;

code = code.replace(postRegex, postReplace);

const putRegex = /app\.put\("\/api\/vehicles\/:id", authenticateToken, \(req, res\) => \{\n    try \{\n      const \{ name, rego, user_id \} = req\.body;\n      const vehicle = db\.prepare\("SELECT \* FROM vehicles WHERE id = \?"\)\.get\(req\.params\.id\) as any;\n      if \(!vehicle\) return res\.status\(404\)\.json\(\{ error: "Vehicle not found" \}\);\n      if \(req\.user\.role === "staff" && vehicle\.user_id !== req\.user\.id\) \{\n         return res\.status\(403\)\.json\(\{ error: "Forbidden" \}\);\n      \}\n      \n      const targetUserId = req\.user\.role === "staff" \? req\.user\.id : user_id \|\| vehicle\.user_id;\n      db\.prepare\("UPDATE vehicles SET name = \?, rego = \?, user_id = \? WHERE id = \?"\)\.run\(name, rego, targetUserId, req\.params\.id\);\n      res\.json\(\{ success: true \}\);\n    \} catch \(error\) \{\n      console\.error\("Error updating vehicle:", error\);\n      res\.status\(500\)\.json\(\{ error: "Failed to update vehicle" \}\);\n    \}\n  \}\);/;

const putReplace = `app.put("/api/vehicles/:id", authenticateToken, (req, res) => {
    try {
      const { name, rego, user_id, is_primary } = req.body;
      const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id) as any;
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      if (req.user.role === "staff" && vehicle.user_id !== req.user.id) {
         return res.status(403).json({ error: "Forbidden" });
      }
      
      const targetUserId = req.user.role === "staff" ? req.user.id : user_id || vehicle.user_id;
      
      if (is_primary === 1) {
         db.prepare("UPDATE vehicles SET is_primary = 0 WHERE user_id = ?").run(targetUserId);
      }
      
      db.prepare("UPDATE vehicles SET name = ?, rego = ?, user_id = ?, is_primary = ? WHERE id = ?").run(name, rego, targetUserId, is_primary !== undefined ? is_primary : vehicle.is_primary, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(500).json({ error: "Failed to update vehicle" });
    }
  });`;
  
code = code.replace(putRegex, putReplace);

fs.writeFileSync(file, code);
console.log("Patched vehicles routes");

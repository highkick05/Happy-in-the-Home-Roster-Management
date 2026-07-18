const fs = require('fs');
const file = 'src/server.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `  // --- Clients APIs ---`;
const replacementStr = `  // --- Vehicles API ---
  app.get("/api/vehicles", authenticateToken, (req, res) => {
    try {
      let query = "SELECT * FROM vehicles";
      let params = [];
      if (req.user.role === "staff") {
        query += " WHERE user_id = ?";
        params.push(req.user.id);
      }
      query += " ORDER BY name ASC";
      
      const vehicles = db.prepare(query).all(...params);
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/vehicles/all", authenticateToken, (req, res) => {
    try {
      const vehicles = db.prepare("SELECT * FROM vehicles ORDER BY name ASC").all();
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching all vehicles:", error);
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  app.post("/api/vehicles", authenticateToken, (req, res) => {
    try {
      const { name, rego, user_id } = req.body;
      const targetUserId = req.user.role === "staff" ? req.user.id : user_id || req.user.id;
      const result = db.prepare("INSERT INTO vehicles (name, rego, user_id) VALUES (?, ?, ?)").run(name, rego, targetUserId);
      res.json({ id: result.lastInsertRowid, name, rego, user_id: targetUserId });
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ error: "Failed to create vehicle" });
    }
  });

  app.put("/api/vehicles/:id", authenticateToken, (req, res) => {
    try {
      const { name, rego, user_id } = req.body;
      const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      if (req.user.role === "staff" && vehicle.user_id !== req.user.id) {
         return res.status(403).json({ error: "Forbidden" });
      }
      
      db.prepare("UPDATE vehicles SET name = ?, rego = ?, user_id = ? WHERE id = ?").run(
        name, rego, req.user.role === "staff" ? req.user.id : (user_id || vehicle.user_id), req.params.id
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(500).json({ error: "Failed to update vehicle" });
    }
  });

  app.delete("/api/vehicles/:id", authenticateToken, (req, res) => {
    try {
      const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
      if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
      if (req.user.role === "staff" && vehicle.user_id !== req.user.id) {
         return res.status(403).json({ error: "Forbidden" });
      }
      db.prepare("DELETE FROM vehicles WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(500).json({ error: "Failed to delete vehicle" });
    }
  });
  // --- End Vehicles API ---

  // --- Clients APIs ---`;

if (code.includes(targetStr) && !code.includes('app.get("/api/vehicles"')) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync(file, code);
  console.log('Added Vehicles API');
} else {
  console.log('Target string not found or already added');
}

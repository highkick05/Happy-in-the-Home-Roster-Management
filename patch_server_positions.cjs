const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const positionsEndpoints = `
  app.get("/api/positions", authenticateToken, (req: any, res: any) => {
    try {
      const positions = db.prepare("SELECT * FROM positions ORDER BY name ASC").all();
      res.json(positions);
    } catch (e: any) {
      logger.error(\`API Error: \${e}\`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/admin/positions", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      const info = db.prepare("INSERT INTO positions (name) VALUES (?)").run(name);
      res.json({ id: info.lastInsertRowid, name });
    } catch (e: any) {
      logger.error(\`API Error: \${e}\`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/admin/positions/:id", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      db.prepare("DELETE FROM positions WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      logger.error(\`API Error: \${e}\`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
`;

if (!content.includes('/api/positions')) {
    content = content.replace('app.get("/api/staff"', positionsEndpoints + '\n  app.get("/api/staff"');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Added positions endpoints');
} else {
    console.log('Positions endpoints already exist');
}

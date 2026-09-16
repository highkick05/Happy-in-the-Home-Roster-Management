const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const createTableStr = `
      CREATE TABLE IF NOT EXISTS onboarding_hub_steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        media_url TEXT,
        requires_expiry INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
      );
`;
if (!content.includes('CREATE TABLE IF NOT EXISTS onboarding_hub_steps')) {
    content = content.replace(
        'CREATE TABLE IF NOT EXISTS positions (',
        createTableStr + '\n      CREATE TABLE IF NOT EXISTS positions ('
    );
}

const endpoints = `
  // ADMIN ONBOARDING STEPS
  app.get("/api/admin/onboarding-steps", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const steps = db.prepare("SELECT * FROM onboarding_hub_steps").all();
      res.json(steps);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/onboarding-steps", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { position_id, title, description, media_url, requires_expiry } = req.body;
      const stmt = db.prepare("INSERT INTO onboarding_hub_steps (position_id, title, description, media_url, requires_expiry) VALUES (?, ?, ?, ?, ?)");
      const info = stmt.run(position_id, title, description || '', media_url || '', requires_expiry ? 1 : 0);
      const newStep = db.prepare("SELECT * FROM onboarding_hub_steps WHERE id = ?").get(info.lastInsertRowid);
      res.json(newStep);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/onboarding-steps/:id", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { title, description, media_url, requires_expiry } = req.body;
      const stmt = db.prepare("UPDATE onboarding_hub_steps SET title = ?, description = ?, media_url = ?, requires_expiry = ? WHERE id = ?");
      stmt.run(title, description || '', media_url || '', requires_expiry ? 1 : 0, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/onboarding-steps/:id", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      db.prepare("DELETE FROM onboarding_hub_steps WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
`;

if (!content.includes('/api/admin/onboarding-steps')) {
    content = content.replace(
        'app.get("/api/admin/staff-compliance"',
        endpoints + '\n  app.get("/api/admin/staff-compliance"'
    );
}

fs.writeFileSync(file, content, 'utf8');
console.log('Patched onboarding endpoints and table');

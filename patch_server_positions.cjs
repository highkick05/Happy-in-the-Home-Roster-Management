const fs = require('fs');
const path = require('path');
let content = fs.readFileSync('src/server.ts', 'utf8');

// 1. Add additional_positions to /api/staff POST
content = content.replace(
  'primaryPosition,\n    } = req.body;',
  'primaryPosition,\n      additionalPositions,\n    } = req.body;'
);

content = content.replace(
  'can_switch_admin, avatar_url, primary_position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",',
  'can_switch_admin, avatar_url, primary_position, additional_positions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",'
);

content = content.replace(
  'avatarUrl,\n        primaryPosition,\n      );\n      res.json(',
  'avatarUrl,\n        primaryPosition,\n        JSON.stringify(additionalPositions || []),\n      );\n      res.json('
);

// 2. Add additional_positions to /api/staff/:id PUT
content = content.replace(
  'primaryPosition = ?\n          WHERE id = ?',
  'primaryPosition = ?,\n          additional_positions = ?\n          WHERE id = ?'
);
content = content.replace(
  'primary_position = ?\n          WHERE id = ?',
  'primary_position = ?,\n          additional_positions = ?\n          WHERE id = ?'
);

content = content.replace(
  'req.body.primaryPosition,\n            id,',
  'req.body.primaryPosition,\n            JSON.stringify(req.body.additionalPositions || []),\n            id,'
);

// 3. Inject new API routes
const apiRoutes = `
  // --- Admin Positions API ---
  app.get("/api/positions", authenticateToken, (req: any, res: any) => {
    try {
      const positions = db.prepare("SELECT * FROM positions ORDER BY name ASC").all();
      res.json(positions);
    } catch(e) {
      res.status(500).json({error: "Failed to fetch positions"});
    }
  });

  app.post("/api/admin/positions", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { name } = req.body;
      const info = db.prepare("INSERT INTO positions (name) VALUES (?)").run(name);
      res.json({ id: info.lastInsertRowid, name });
    } catch(e: any) {
      res.status(500).json({error: e.message});
    }
  });

  app.delete("/api/admin/positions/:id", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      db.prepare("DELETE FROM positions WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch(e: any) {
      res.status(500).json({error: e.message});
    }
  });

  app.get("/api/admin/onboarding-steps", authenticateToken, (req: any, res: any) => {
    try {
      const steps = db.prepare("SELECT * FROM onboarding_hub_steps").all();
      res.json(steps);
    } catch(e) {
      res.status(500).json({error: "Failed to fetch steps"});
    }
  });

  app.post("/api/admin/onboarding-steps", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { position_id, title, description, media_url, requires_expiry } = req.body;
      const info = db.prepare("INSERT INTO onboarding_hub_steps (position_id, title, description, media_url, requires_expiry) VALUES (?, ?, ?, ?, ?)").run(
        position_id, title, description || '', media_url || '', requires_expiry ? 1 : 0
      );
      const step = db.prepare("SELECT * FROM onboarding_hub_steps WHERE id = ?").get(info.lastInsertRowid);
      res.json(step);
    } catch(e: any) {
      res.status(500).json({error: e.message});
    }
  });

  app.put("/api/admin/onboarding-steps/:id", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { title, description, media_url, requires_expiry } = req.body;
      db.prepare("UPDATE onboarding_hub_steps SET title = ?, description = ?, media_url = ?, requires_expiry = ? WHERE id = ?").run(
        title, description || '', media_url || '', requires_expiry ? 1 : 0, req.params.id
      );
      res.json({ success: true });
    } catch(e: any) {
      res.status(500).json({error: e.message});
    }
  });

  app.delete("/api/admin/onboarding-steps/:id", authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      db.prepare("DELETE FROM onboarding_hub_steps WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch(e: any) {
      res.status(500).json({error: e.message});
    }
  });

`;

// inject right before `// --- Client APIs ---`
content = content.replace('// --- Client APIs ---', apiRoutes + '\n  // --- Client APIs ---');

fs.writeFileSync('src/server.ts', content, 'utf8');
console.log("Patched server.ts successfully");

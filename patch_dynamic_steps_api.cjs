const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const dynamicStepsApi = `
  app.get("/api/users/onboarding/dynamic-steps", authenticateToken, (req: any, res: any) => {
    try {
      let targetUserId = req.user.id;
      if (req.user.role === "ADMIN" && req.query.userId) {
        targetUserId = parseInt(req.query.userId, 10);
      }
      
      const user = db.prepare("SELECT primary_position, additional_positions FROM users WHERE id = ?").get(targetUserId) as any;
      if (!user) return res.json([]);
      
      const primary = user.primary_position || '';
      let additionals = [];
      try {
        additionals = user.additional_positions ? JSON.parse(user.additional_positions) : [];
      } catch(e) {}
      
      const allPositions = [primary, ...additionals].filter(Boolean);
      if (allPositions.length === 0) return res.json([]);
      
      const placeholders = allPositions.map(() => '?').join(',');
      const matchedPositions = db.prepare(\`SELECT id, name FROM positions WHERE name IN (\${placeholders})\`).all(...allPositions);
      
      if (matchedPositions.length === 0) return res.json([]);
      const positionIds = matchedPositions.map(p => p.id);
      
      const placeholdersIds = positionIds.map(() => '?').join(',');
      const steps = db.prepare(\`SELECT * FROM onboarding_hub_steps WHERE position_id IN (\${placeholdersIds})\`).all(...positionIds);
      
      res.json(steps);
    } catch(e: any) {
      res.status(500).json({error: e.message});
    }
  });
`;

content = content.replace(
  'app.get("/api/users/onboarding", authenticateToken',
  dynamicStepsApi + '\n  app.get("/api/users/onboarding", authenticateToken'
);

fs.writeFileSync('src/server.ts', content, 'utf8');
console.log("Patched server with dynamic steps API");

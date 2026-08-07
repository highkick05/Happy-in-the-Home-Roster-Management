const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const statusRoute = `
  app.put("/api/contractors/:id/status", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare("UPDATE contractors SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (e: any) {
      logger.error(\`API Error: \${e}\`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
`;

content = content.replace('// --- Respite Bookings APIs ---', statusRoute + '\n  // --- Respite Bookings APIs ---');

fs.writeFileSync(file, content);

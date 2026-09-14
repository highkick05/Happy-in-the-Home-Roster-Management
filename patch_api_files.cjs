const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf-8');

const newCode = `
  app.get("/api/files", authenticateToken, (req: any, res: any) => {
    let query = \`
      SELECT f.*, u.first_name, u.last_name
      FROM files f
      LEFT JOIN users u ON f.uploaded_by = u.id
    \`;
    
    try {
      if (req.user.role !== 'ADMIN') {
        query += ' WHERE f.uploaded_by = ?';
        const files = db.prepare(query).all(req.user.id);
        return res.json(files);
      }
      const files = db.prepare(query).all();
      res.json(files);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

const regex = /app\.get\("\/api\/files", authenticateToken, \(req: any, res: any\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: e\.message \}\);\n\s*\}\n\s*\}\);/g;

content = content.replace(regex, newCode.trim());
fs.writeFileSync('src/server.ts', content);
console.log("Patched server.ts api/files GET");

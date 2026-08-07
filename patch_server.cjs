const fs = require('fs');

let content = fs.readFileSync('src/server.ts', 'utf8');

if (!content.includes('CREATE TABLE IF NOT EXISTS contractors')) {
  content = content.replace(
    /CREATE TABLE IF NOT EXISTS providers \([\s\S]*?\);/,
    `$&
      CREATE TABLE IF NOT EXISTS contractors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        contact_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        contractor_type TEXT
      );`
  );
}

if (!content.includes('app.get("/api/contractors"')) {
  content = content.replace(
    /\/\/ --- Providers APIs ---[\s\S]*?(?=\/\/ --- Clients APIs ---)/,
    `$&
  // --- Contractors APIs ---
  app.get("/api/contractors", authenticateToken, requireAdmin, (req, res) => {
    const contractors = db.prepare("SELECT * FROM contractors").all();
    res.json(contractors);
  });
  app.post("/api/contractors", authenticateToken, requireAdmin, (req, res) => {
    const { company_name, contact_name, email, phone, address, contractor_type } = req.body;
    const stmt = db.prepare(\`
      INSERT INTO contractors (company_name, contact_name, email, phone, address, contractor_type)
      VALUES (?, ?, ?, ?, ?, ?)
    \`);
    const info = stmt.run(company_name, contact_name, email, phone, address, contractor_type);
    res.status(201).json({ id: info.lastInsertRowid });
  });
  app.put("/api/contractors/:id", authenticateToken, requireAdmin, (req: any, res: any) => {
    const { company_name, contact_name, email, phone, address, contractor_type } = req.body;
    const stmt = db.prepare(\`
      UPDATE contractors
      SET company_name = ?, contact_name = ?, email = ?, phone = ?, address = ?, contractor_type = ?
      WHERE id = ?
    \`);
    stmt.run(company_name, contact_name, email, phone, address, contractor_type, req.params.id);
    res.json({ success: true });
  });
  app.delete("/api/contractors/:id", authenticateToken, requireAdmin, (req: any, res: any) => {
    db.prepare("DELETE FROM contractors WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });
`
  );
}

fs.writeFileSync('src/server.ts', content);

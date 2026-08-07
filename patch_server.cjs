const fs = require('fs');
const file = 'src/server.ts';
let content = fs.readFileSync(file, 'utf8');

const contractorRoutes = `
  // --- Contractors APIs ---
  app.get("/api/contractors", authenticateToken, requireAdmin, (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM contractors ORDER BY company_name COLLATE NOCASE ASC").all();
      res.json(rows);
    } catch (e: any) {
      logger.error(\`API Error: \${e}\`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/contractors", authenticateToken, requireAdmin, (req, res) => {
    const {
      company_name,
      contact_name,
      email,
      phone,
      address,
      contractor_type
    } = req.body;
    try {
      const stmt = db.prepare(\`
        INSERT INTO contractors (company_name, contact_name, email, phone, address, contractor_type)
        VALUES (?, ?, ?, ?, ?, ?)
      \`);
      const info = stmt.run(
        company_name,
        contact_name || null,
        email || null,
        phone || null,
        address || null,
        contractor_type || 'Other'
      );
      res.json({ id: info.lastInsertRowid });
    } catch (e: any) {
      logger.error(\`API Error: \${e}\`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/contractors/:id", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const {
      company_name,
      contact_name,
      email,
      phone,
      address,
      contractor_type
    } = req.body;
    try {
      const stmt = db.prepare(\`
        UPDATE contractors SET
          company_name = ?,
          contact_name = ?,
          email = ?,
          phone = ?,
          address = ?,
          contractor_type = ?
        WHERE id = ?
      \`);
      stmt.run(
        company_name,
        contact_name || null,
        email || null,
        phone || null,
        address || null,
        contractor_type || 'Other',
        id
      );
      res.json({ success: true });
    } catch (e: any) {
      logger.error(\`API Error: \${e}\`, { error: "Internal Server Error" });
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

`;

content = content.replace('// --- Respite Bookings APIs ---', contractorRoutes + '\n  // --- Respite Bookings APIs ---');

fs.writeFileSync(file, content);

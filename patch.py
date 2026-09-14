import re

with open('src/server.ts', 'r') as f:
    content = f.read()

old_block = """  app.get("/api/files", authenticateToken, (req, res) => {
    let { folderPath } = req.query;
    let sql = "SELECT * FROM files";
    let params = [];
    if (folderPath) {
      sql += " WHERE folder_path = ?";
      params.push(folderPath);
    }
    sql += " ORDER BY original_name ASC";
    
    try {
      const rows = db.prepare(sql).all(...params);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });"""

new_block = """  app.get("/api/files", authenticateToken, (req: any, res: any) => {
    let query = `
      SELECT f.*, u.first_name, u.last_name
      FROM files f
      LEFT JOIN users u ON f.uploaded_by = u.id
    `;
    
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
  });"""

content = content.replace(old_block, new_block)
with open('src/server.ts', 'w') as f:
    f.write(content)
print("Patched!")

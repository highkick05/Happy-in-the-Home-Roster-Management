const fs = require('fs');
const content = fs.readFileSync('src/server.ts', 'utf-8');

const filesRoutes = `
  app.get("/api/files", authenticateToken, (req, res) => {
    let { folderPath } = req.query;
    let sql = "SELECT * FROM files";
    let params = [];
    if (folderPath) {
      sql += " WHERE folder_path = ?";
      params.push(folderPath);
    }
    sql += " ORDER BY sort_order ASC, original_name ASC";
    
    try {
      const rows = db.prepare(sql).all(...params);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/files", authenticateToken, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const { originalname, size, filename } = req.file;
    const { folderPath, date_issued, date_expires, targetUserId } = req.body;
    
    const sql = \`INSERT INTO files 
      (original_name, system_name, size, uploaded_by, folder_path, date_issued, date_expires) 
      VALUES (?, ?, ?, ?, ?, ?, ?)\`;
    const params = [
      originalname,
      filename,
      size,
      req.user.id,
      folderPath || "/",
      date_issued || null,
      date_expires || null
    ];
    
    try {
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      res.json({ id: info.lastInsertRowid, system_name: filename });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/files/:id", authenticateToken, (req, res) => {
    const { original_name, date_issued, date_expires, folder_path } = req.body;
    let updates = [];
    let params = [];
    if (original_name !== undefined) { updates.push("original_name = ?"); params.push(original_name); }
    if (date_issued !== undefined) { updates.push("date_issued = ?"); params.push(date_issued); }
    if (date_expires !== undefined) { updates.push("date_expires = ?"); params.push(date_expires); }
    if (folder_path !== undefined) { updates.push("folder_path = ?"); params.push(folder_path); }
    
    if (updates.length === 0) return res.json({ success: true });
    
    params.push(req.params.id);
    const sql = \`UPDATE files SET \${updates.join(", ")} WHERE id = ?\`;
    
    try {
      db.prepare(sql).run(...params);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/files/:id", authenticateToken, (req, res) => {
     try {
       const row = db.prepare("SELECT system_name, folder_path, uploaded_by FROM files WHERE id = ?").get(req.params.id);
       if (!row) return res.status(404).json({error: "Not found"});
       if (req.user.role !== 'ADMIN' && req.user.id !== row.uploaded_by) {
           return res.status(403).json({error: "Forbidden"});
       }
       
       const targetDir = path.join(UPLOADS_DIR, (row.folder_path || "/").replace(/^\\/+/, ""));
       const filePath = path.join(targetDir, row.system_name);
       if (fs.existsSync(filePath)) {
           fs.unlinkSync(filePath);
       }
       db.prepare("DELETE FROM files WHERE id = ?").run(req.params.id);
       res.json({ success: true });
     } catch (e) {
       res.status(500).json({ error: e.message });
     }
  });

  app.get("/api/files/download/:id", authenticateToken, (req, res) => {
    try {
      const row = db.prepare("SELECT * FROM files WHERE id = ?").get(req.params.id);
      if (!row) return res.status(404).json({ error: "File not found in database" });
      
      const targetDir = path.join(UPLOADS_DIR, (row.folder_path || "/").replace(/^\\/+/, ""));
      const filePath = path.join(targetDir, row.system_name);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on disk" });
      }
      if (req.query.preview) {
        res.sendFile(filePath);
      } else {
        res.download(filePath, row.original_name);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/login", loginRateLimiter, (req, res) => {`;

const newContent = content.replace('  app.post("/api/login", loginRateLimiter, (req, res) => {', filesRoutes);
if (newContent === content) {
    console.error("Replacement failed.");
} else {
    fs.writeFileSync('src/server.ts', newContent);
    console.log("Success.");
}

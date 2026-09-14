import re

with open('src/server.ts', 'r') as f:
    content = f.read()

old_block = """  app.post("/api/files", authenticateToken, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const { originalname, size, filename } = req.file;
    const { folderPath, date_issued, date_expires, targetUserId } = req.body;
    
    const sql = `INSERT INTO files 
      (original_name, system_name, size, uploaded_by, folder_path, date_issued, date_expires) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
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
    const sql = `UPDATE files SET ${updates.join(", ")} WHERE id = ?`;
    
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
       
       const targetDir = path.join(UPLOADS_DIR, (row.folder_path || "/").replace(/^\/+/, ""));
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
      
      const targetDir = path.join(UPLOADS_DIR, (row.folder_path || "/").replace(/^\/+/, ""));
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
  });"""

new_block = """  app.post('/api/files', authenticateToken, upload.single('file'), (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    let folderPath = req.query.folderPath || '/';
    
    // Quick normalize to prevent bad paths
    folderPath = path.normalize(folderPath).replace(/^(\.\.[\/\\\\])+/, '');
    if (folderPath.startsWith('/')) {
        folderPath = folderPath.substring(1);
    }
    folderPath = '/' + folderPath; // ensure starts with /

    const dateIssued = req.body.date_issued || null;
    const dateExpires = req.body.date_expires || null;
    
    let targetUserId = req.user.id;
    if (req.user.role === 'ADMIN' && req.body.targetUserId) {
        targetUserId = req.body.targetUserId;
    }

    try {
      const stmt = db.prepare('INSERT INTO files (original_name, system_name, size, uploaded_by, folder_path, date_issued, date_expires) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(req.file.originalname, req.file.filename, req.file.size, targetUserId, folderPath, dateIssued, dateExpires);
      
      // Clear notifications immediately upon successful document renewal/upload
      db.prepare(`DELETE FROM notifications WHERE user_id = ? AND type IN ('DOCUMENT_EXPIRED', 'DOCUMENT_EXPIRING_SOON')`).run(targetUserId);
      
      res.json({ success: true, id: info.lastInsertRowid, date_issued: dateIssued, date_expires: dateExpires });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/files/:id', authenticateToken, (req: any, res: any) => {
    const { id } = req.params;
    const { date_issued, date_expires } = req.body;
    try {
      const file = db.prepare('SELECT id, uploaded_by FROM files WHERE id = ?').get(id) as any;
      if (!file) return res.status(404).json({ error: 'File not found' });
      
      if (req.user.role !== 'ADMIN' && file.uploaded_by !== req.user.id) {
         return res.status(403).json({ error: 'Forbidden' });
      }

      db.prepare('UPDATE files SET date_issued = ?, date_expires = ? WHERE id = ?').run(
        date_issued || null, 
        date_expires || null, 
        id
      );

      // Clear notifications for this doc if it was updated
      db.prepare(`DELETE FROM notifications WHERE user_id = ? AND type IN ('DOCUMENT_EXPIRED', 'DOCUMENT_EXPIRING_SOON')`).run(file.uploaded_by);

      res.json({ success: true });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/files/download/:id', authenticateToken, (req: any, res: any) => {
    const { id } = req.params;
    try {
      const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as any;
      if (!file) return res.status(404).json({ error: 'File not found' });
      
      // Basic security for non-admins
      if (req.user.role !== 'ADMIN' && file.uploaded_by !== req.user.id && !file.folder_path?.startsWith('/Chat') && !file.folder_path?.startsWith('/Settings/Chat')) {
         return res.status(403).json({ error: 'Forbidden' });
      }

      const filePath = path.join(process.cwd(), 'uploads', (file.folder_path || '/').replace(/^\\/+/, ''), file.system_name);
      if (fs.existsSync(filePath)) {
        if (req.query.preview === 'true') {
           res.sendFile(filePath);
        } else {
           res.download(filePath, file.original_name);
        }
      } else {
        res.status(404).json({ error: 'File on disk not found' });
      }
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/files/:id', authenticateToken, (req: any, res: any) => {
    const { id } = req.params;
    try {
      const file = db.prepare('SELECT system_name, uploaded_by, folder_path FROM files WHERE id = ?').get(id) as any;
      if (file) {
         if (req.user.role !== 'ADMIN' && file.uploaded_by !== req.user.id) {
           return res.status(403).json({ error: 'Forbidden' });
         }
         const filePath = path.join(process.cwd(), 'uploads', (file.folder_path || '/').replace(/^\\/+/, ''), file.system_name);
         if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch (e) { console.warn('Failed to delete file', e); } }
      }
      db.prepare('DELETE FROM files WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (e: any) {
      logger.error(`API Error: ${e}`, { error: e.stack || e });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });"""

content = content.replace(old_block, new_block)
with open('src/server.ts', 'w') as f:
    f.write(content)
print("Restored original files logic!")

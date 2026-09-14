const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const api = `
  // -----------------------------------------------------
  // TRAINING API
  // -----------------------------------------------------

  app.get('/api/training/modules', authenticateToken, (req: any, res: any) => {
    try {
      const modules = db.prepare('SELECT * FROM training_modules ORDER BY title ASC').all();
      res.json(modules);
    } catch (e) {
      logger.error('Failed to get training modules', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/training/staff', authenticateToken, (req: any, res: any) => {
    try {
      let staffTraining;
      if (req.user.role === 'ADMIN') {
         staffTraining = db.prepare(\`
            SELECT st.*, u.first_name, u.last_name, u.avatar_url, m.title as module_title 
            FROM staff_training st
            JOIN users u ON st.staff_id = u.id
            JOIN training_modules m ON st.training_module_id = m.id
            ORDER BY st.created_at DESC
         \`).all();
      } else {
         staffTraining = db.prepare(\`
            SELECT st.*, u.first_name, u.last_name, u.avatar_url, m.title as module_title 
            FROM staff_training st
            JOIN users u ON st.staff_id = u.id
            JOIN training_modules m ON st.training_module_id = m.id
            WHERE st.staff_id = ?
            ORDER BY st.created_at DESC
         \`).all(req.user.id);
      }
      res.json(staffTraining);
    } catch (e) {
      logger.error('Failed to get staff training', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/training/modules', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { title, url, description, expiry_months, tags } = req.body;
      const result = db.prepare('INSERT INTO training_modules (title, url, description, expiry_months, tags) VALUES (?, ?, ?, ?, ?)').run(
        title, url, description, expiry_months || 0, tags
      );
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      logger.error('Failed to create training module', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put('/api/training/modules/:id', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      const { title, url, description, expiry_months, tags } = req.body;
      db.prepare('UPDATE training_modules SET title = ?, url = ?, description = ?, expiry_months = ?, tags = ? WHERE id = ?').run(
        title, url, description, expiry_months || 0, tags, req.params.id
      );
      res.json({ success: true });
    } catch (e) {
      logger.error('Failed to update training module', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/training/modules/:id', authenticateToken, requireAdmin, (req: any, res: any) => {
    try {
      db.prepare('DELETE FROM training_modules WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (e) {
      logger.error('Failed to delete training module', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/training/staff/upload', authenticateToken, upload.single('certificate'), (req: any, res: any) => {
    try {
      const { training_module_id, completion_date, expiry_date } = req.body;
      let targetUserId = req.user.id;
      if (req.user.role === 'ADMIN' && req.body.staff_id) {
         targetUserId = req.body.staff_id;
      }

      let certificatePath = null;
      if (req.file) {
          const user = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(targetUserId) as any;
          if (user) {
              const nameDir = [user.first_name, user.last_name].filter(Boolean).join(" ").replace(/[\\\\/]/g, "");
              const targetDir = require('path').join(process.cwd(), 'uploads', 'Staff', nameDir, 'Training');
              if (!fs.existsSync(targetDir)) {
                  fs.mkdirSync(targetDir, { recursive: true });
              }
              const filename = req.file.originalname;
              const finalPath = require('path').join(targetDir, filename);
              fs.renameSync(req.file.path, finalPath);
              certificatePath = filename;
              
              // Also add to global files table
              const folderPath = \`/Staff/\${nameDir}/Training\`;
              const existing = db.prepare('SELECT id FROM files WHERE system_name = ? AND folder_path = ?').get(filename, folderPath);
              if (!existing) {
                  db.prepare(\`INSERT INTO files (original_name, system_name, size, folder_path, uploaded_by) VALUES (?, ?, ?, ?, ?)\`).run(
                      filename, filename, req.file.size, folderPath, req.user.id
                  );
              }
          }
      }

      // Check if entry exists for this user and module
      const existingRecord = db.prepare('SELECT id FROM staff_training WHERE staff_id = ? AND training_module_id = ?').get(targetUserId, training_module_id) as any;
      
      if (existingRecord) {
         db.prepare('UPDATE staff_training SET status = ?, completion_date = ?, expiry_date = ?, certificate_file_path = COALESCE(?, certificate_file_path) WHERE id = ?').run(
           'COMPLETED', completion_date, expiry_date || null, certificatePath, existingRecord.id
         );
      } else {
         db.prepare('INSERT INTO staff_training (staff_id, training_module_id, status, completion_date, expiry_date, certificate_file_path) VALUES (?, ?, ?, ?, ?, ?)').run(
           targetUserId, training_module_id, 'COMPLETED', completion_date, expiry_date || null, certificatePath
         );
      }

      res.json({ success: true });
    } catch (e) {
      logger.error('Failed to upload staff training', e);
      res.status(500).json({ error: 'Server error' });
    }
  });
`;

const insertionPoint = 'app.post("/api/clients", authenticateToken, requireAdmin, (req, res) => {';

if (content.includes(insertionPoint)) {
    content = content.replace(insertionPoint, api + '\n  ' + insertionPoint);
    fs.writeFileSync('src/server.ts', content);
    console.log("Injected API successfully!");
} else {
    console.log("Could not find insertion point!");
}


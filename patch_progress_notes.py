import re

with open('src/server.ts', 'r') as f:
    code = f.read()

# 1. Add table
table_sql = """
    db.exec(`
      CREATE TABLE IF NOT EXISTS progress_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (author_id) REFERENCES users(id)
      )
    `);
"""

if "CREATE TABLE IF NOT EXISTS progress_notes" not in code:
    code = code.replace("CREATE TABLE IF NOT EXISTS tasks", table_sql + "\n      CREATE TABLE IF NOT EXISTS tasks")

# 2. Modify GET /api/progress-notes/:clientId
old_get = """        let query = `
        SELECT s.id, s.start_time, s.end_time, s.actual_finish_time, s.notes, s.status, s.service_id,
               c.first_name as client_first_name, c.last_name as client_last_name, c.ndis_number, c.dob, c.funding_type, c.my_aged_care_id,
               u.first_name as staff_first_name, u.last_name as staff_last_name, u.role as staff_role,
               srv.name as service_name, srv.type as service_type
        FROM shifts s
        LEFT JOIN clients c ON s.client_id = c.id
        LEFT JOIN users u ON s.staff_id = u.id
        LEFT JOIN services srv ON s.service_id = srv.id
        WHERE s.client_id = ? AND s.status IN ('COMPLETED', 'PUBLISHED', 'CANCELLED') AND s.notes IS NOT NULL AND s.notes != ''
      `;
        const params: any[] = [clientId];

        if (req.user.role !== "ADMIN") {
          query += ` AND s.staff_id = ?`;
          params.push(req.user.id);
        }

        if (startDate) {
          query += ` AND date(s.start_time) >= date(?)`;
          params.push(startDate);
        }
        if (endDate) {
          query += ` AND date(s.start_time) <= date(?)`;
          params.push(endDate);
        }

        query += ` ORDER BY s.start_time ASC`;"""

new_get = """        let query = `
        SELECT 
          'SHIFT' as source, s.id, s.start_time, s.end_time, s.actual_finish_time, s.notes, s.status, s.service_id,
          c.first_name as client_first_name, c.last_name as client_last_name, c.ndis_number, c.dob, c.funding_type, c.my_aged_care_id,
          u.first_name as staff_first_name, u.last_name as staff_last_name, u.role as staff_role,
          srv.name as service_name, srv.type as service_type,
          NULL as tags
        FROM shifts s
        LEFT JOIN clients c ON s.client_id = c.id
        LEFT JOIN users u ON s.staff_id = u.id
        LEFT JOIN services srv ON s.service_id = srv.id
        WHERE s.client_id = ? AND s.status IN ('COMPLETED', 'PUBLISHED', 'CANCELLED') AND s.notes IS NOT NULL AND s.notes != ''
      `;
        const params: any[] = [clientId];

        if (req.user.role !== "ADMIN") {
          query += ` AND s.staff_id = ?`;
          params.push(req.user.id);
        }

        if (startDate) {
          query += ` AND date(s.start_time) >= date(?)`;
          params.push(startDate);
        }
        if (endDate) {
          query += ` AND date(s.start_time) <= date(?)`;
          params.push(endDate);
        }

        query += ` UNION ALL 
        SELECT 
          'MANUAL' as source, pn.id, pn.created_at as start_time, NULL as end_time, NULL as actual_finish_time, pn.content as notes, 'COMPLETED' as status, NULL as service_id,
          c.first_name as client_first_name, c.last_name as client_last_name, c.ndis_number, c.dob, c.funding_type, c.my_aged_care_id,
          u.first_name as staff_first_name, u.last_name as staff_last_name, u.role as staff_role,
          NULL as service_name, NULL as service_type,
          pn.tags as tags
        FROM progress_notes pn
        LEFT JOIN clients c ON pn.client_id = c.id
        LEFT JOIN users u ON pn.author_id = u.id
        WHERE pn.client_id = ?
        `;
        params.push(clientId);

        if (req.user.role !== "ADMIN") {
          query += ` AND pn.author_id = ?`;
          params.push(req.user.id);
        }
        if (startDate) {
          query += ` AND date(pn.created_at) >= date(?)`;
          params.push(startDate);
        }
        if (endDate) {
          query += ` AND date(pn.created_at) <= date(?)`;
          params.push(endDate);
        }

        query = `SELECT * FROM (${query}) ORDER BY start_time DESC`;"""

if old_get in code:
    code = code.replace(old_get, new_get)
else:
    print("WARNING: Could not find GET /api/progress-notes/:clientId")

# 3. Add POST /api/progress-notes
post_endpoint = """
  app.post(
    "/api/progress-notes",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const { clientId, content, tags } = req.body;
        if (!clientId || !content) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        
        // Security check for staff: ensure they have access to this client
        if (req.user.role !== "ADMIN") {
          const hasShift = db.prepare(`SELECT id FROM shifts WHERE client_id = ? AND staff_id = ? LIMIT 1`).get(clientId, req.user.id);
          if (!hasShift) {
             return res.status(403).json({ error: "Forbidden: You do not have access to this client's progress notes." });
          }
        }
        
        const result = db.prepare(
          "INSERT INTO progress_notes (client_id, author_id, content, tags) VALUES (?, ?, ?, ?)"
        ).run(clientId, req.user.id, content, tags || null);
        
        res.json({ success: true, id: result.lastInsertRowid });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
  
  app.put(
    "/api/progress-notes/:id",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const { id } = req.params;
        const { content, tags } = req.body;
        
        const note = db.prepare("SELECT author_id FROM progress_notes WHERE id = ?").get(id) as any;
        if (!note) return res.status(404).json({ error: "Note not found" });
        if (req.user.role !== "ADMIN" && note.author_id !== req.user.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
        
        db.prepare("UPDATE progress_notes SET content = ?, tags = ? WHERE id = ?").run(content, tags || null, id);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
  
  app.put(
    "/api/progress-notes/shifts/:id",
    authenticateToken,
    (req: any, res: any) => {
      try {
        const { id } = req.params;
        const { content } = req.body;
        
        const shift = db.prepare("SELECT staff_id FROM shifts WHERE id = ?").get(id) as any;
        if (!shift) return res.status(404).json({ error: "Shift not found" });
        if (req.user.role !== "ADMIN" && shift.staff_id !== req.user.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
        
        db.prepare("UPDATE shifts SET notes = ? WHERE id = ?").run(content, id);
        res.json({ success: true });
      } catch (e: any) {
        logger.error(`API Error: ${e}`, { error: "Internal Server Error" });
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  );
"""
if "/api/progress-notes" not in code or "POST /api/progress-notes" not in code:
    code = code.replace('app.get(\n    "/api/progress-notes/clients",', post_endpoint + '\n  app.get(\n    "/api/progress-notes/clients",')

with open('src/server.ts', 'w') as f:
    f.write(code)

print("Done patching server")

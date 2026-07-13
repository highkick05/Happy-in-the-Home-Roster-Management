import re

with open('src/server.ts', 'r') as f:
    code = f.read()

new_endpoint = """
  app.post(
    "/api/quotes/historical",
    authenticateToken,
    requireAdmin,
    upload.single("file"),
    (req, res) => {
      const { clientId, date } = req.body;
      const file = req.file;

      if (!clientId || !date || !file) {
        return res.status(400).json({ error: "Missing required fields or file" });
      }

      try {
        const client = db.prepare("SELECT first_name, last_name FROM clients WHERE id = ?").get(parseInt(clientId)) as any;
        if (!client) {
          return res.status(404).json({ error: "Client not found" });
        }
        
        const clientNameSafe = `${client.first_name || ""} ${client.last_name || ""}`.trim().replace(/[\/\\\\]/g, "");
        const folderPath = path.join(UPLOADS_DIR, "Clients", clientNameSafe, "Quotes");
        
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        
        const originalName = file.originalname || "historical-quote.pdf";
        const quoteNum = originalName.replace(/\.[^/.]+$/, "");
        const newFileName = originalName;
        const destPath = path.join(folderPath, newFileName);
        
        fs.renameSync(file.path, destPath);

        const folderPathDb = `/Clients/${clientNameSafe}/Quotes`;
        let subfolder = folderPathDb.replace(/^(\.\.[\\\\/\\\\])+/, "");
        if (subfolder.startsWith("/")) {
          subfolder = subfolder.substring(1);
        }
        const systemName = path.posix.join(subfolder, newFileName);
        const stats = fs.statSync(destPath);
        
        const existingDoc = db
          .prepare("SELECT id FROM documents WHERE system_name = ?")
          .get(systemName) as any;

        if (existingDoc) {
          db.prepare(
            `UPDATE documents 
             SET size = ?, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE system_name = ?`
          ).run(stats.size, systemName);
        } else {
          db.prepare(
            `INSERT INTO documents (
              title, original_name, system_name, folder_path,
              mime_type, size, uploader_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
          ).run(
            newFileName,
            originalName,
            systemName,
            folderPathDb,
            "application/pdf",
            stats.size,
            req.user!.id
          );
        }

        const fallbackNum = `QUO-HIST-${Date.now()}`;
        
        db.prepare(`
          INSERT INTO quotes (
            client_id,
            quote_number,
            amount,
            status,
            date,
            start_time,
            end_time,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          parseInt(clientId),
          quoteNum || fallbackNum,
          0, 
          'DRAFT', 
          date,
          date, 
          date  
        );
        
        res.json({ success: true, message: "Historical quote uploaded successfully" });
      } catch (e: any) {
        console.error("Error uploading historical quote:", e);
        if (file && fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch (e2) {}
        }
        res.status(500).json({ error: "Failed to upload historical quote", details: e.message });
      }
    }
  );
"""

# Insert after /api/invoices/historical
marker = '/api/invoices/historical"'
start_idx = code.find(marker)
if start_idx != -1:
    end_idx = code.find(");", start_idx) + 2
    
    # We might need to find the full end of the route.
    # The route ends at `    }\n  );`
    end_idx = code.find('    }\n  );', start_idx) + 10
    
    code = code[:end_idx] + "\n" + new_endpoint + code[end_idx:]
    with open('src/server.ts', 'w') as f:
        f.write(code)


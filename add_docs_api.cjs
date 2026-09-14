const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const docsAPI = `
  // Client Documents Endpoints
  app.get("/api/clients/:id/documents", authenticateToken, (req: any, res: any) => {
    try {
      const clientId = req.params.id;
      const client = db.prepare('SELECT c_fn, c_ln FROM clients WHERE id = ?').get(clientId) as any;
      if (!client) return res.status(404).json({ error: "Client not found" });

      const clientNameSafe = \`\${client.c_fn} \${client.c_ln}\`.trim().replace(/[\\\\/]/g, "");
      const baseDir = require('path').join(process.cwd(), 'uploads', 'Clients', clientNameSafe, 'Documents');

      const docs: any[] = [];

      const readCategory = (category: string) => {
        const dir = require('path').join(baseDir, category);
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const stat = fs.statSync(require('path').join(dir, file));
            if (stat.isFile()) {
              docs.push({ name: file, category, size: stat.size });
            }
          }
        }
      };

      readCategory('Templates');
      readCategory('Completed');

      res.json(docs);
    } catch (error) {
      logger.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/clients/:id/documents/upload", authenticateToken, upload.single('file'), (req: any, res: any) => {
    try {
      const clientId = req.params.id;
      const category = req.body.category || 'Completed';
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const client = db.prepare('SELECT c_fn, c_ln FROM clients WHERE id = ?').get(clientId) as any;
      if (!client) return res.status(404).json({ error: "Client not found" });

      const clientNameSafe = \`\${client.c_fn} \${client.c_ln}\`.trim().replace(/[\\\\/]/g, "");
      const targetDir = require('path').join(process.cwd(), 'uploads', 'Clients', clientNameSafe, 'Documents', category);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filename = req.file.originalname;
      const finalPath = require('path').join(targetDir, filename);

      fs.renameSync(req.file.path, finalPath);

      const folderPath = \`/Clients/\${clientNameSafe}/Documents/\${category}\`;
      const existing = db.prepare('SELECT id FROM files WHERE system_name = ? AND folder_path = ?').get(filename, folderPath) as any;
      
      if (!existing) {
         db.prepare(\`INSERT INTO files (original_name, system_name, size, folder_path, uploaded_by) VALUES (?, ?, ?, ?, ?)\`).run(
           filename, filename, req.file.size, folderPath, req.user?.userId || 1
         );
      } else {
         db.prepare(\`UPDATE files SET size = ?, date_issued = CURRENT_TIMESTAMP WHERE id = ?\`).run(req.file.size, existing.id);
      }

      res.json({ success: true });
    } catch (error) {
      logger.error("Error uploading document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.get("/api/clients/:id/documents/:name/download", (req: any, res: any) => {
    try {
      const clientId = req.params.id;
      const filename = req.params.name;
      
      const client = db.prepare('SELECT c_fn, c_ln FROM clients WHERE id = ?').get(clientId) as any;
      if (!client) return res.status(404).json({ error: "Client not found" });

      const clientNameSafe = \`\${client.c_fn} \${client.c_ln}\`.trim().replace(/[\\\\/]/g, "");
      
      let filePath = require('path').join(process.cwd(), 'uploads', 'Clients', clientNameSafe, 'Documents', 'Templates', filename);
      if (!fs.existsSync(filePath)) {
         filePath = require('path').join(process.cwd(), 'uploads', 'Clients', clientNameSafe, 'Documents', 'Completed', filename);
      }
      
      if (!fs.existsSync(filePath)) {
         return res.status(404).json({ error: "File not found" });
      }

      res.download(filePath, filename);
    } catch (error) {
      logger.error("Error downloading document:", error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  app.delete("/api/clients/:id/documents/:name", authenticateToken, (req: any, res: any) => {
    try {
      const clientId = req.params.id;
      const filename = req.params.name;
      const category = req.query.category;
      
      const client = db.prepare('SELECT c_fn, c_ln FROM clients WHERE id = ?').get(clientId) as any;
      if (!client) return res.status(404).json({ error: "Client not found" });

      const clientNameSafe = \`\${client.c_fn} \${client.c_ln}\`.trim().replace(/[\\\\/]/g, "");
      const filePath = require('path').join(process.cwd(), 'uploads', 'Clients', clientNameSafe, 'Documents', category, filename);
      
      if (fs.existsSync(filePath)) {
         fs.unlinkSync(filePath);
      }

      const folderPath = \`/Clients/\${clientNameSafe}/Documents/\${category}\`;
      db.prepare('DELETE FROM files WHERE system_name = ? AND folder_path = ?').run(filename, folderPath);

      res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });
`;

const insertionPoint = '  app.post("/api/clients", authenticateToken, requireAdmin, (req, res) => {';

if (content.includes(insertionPoint)) {
    content = content.replace(insertionPoint, docsAPI + '\\n' + insertionPoint);
    fs.writeFileSync('src/server.ts', content);
    console.log("Injected API successfully!");
} else {
    console.log("Could not find insertion point!");
}

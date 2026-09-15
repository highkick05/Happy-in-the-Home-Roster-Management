const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

const backupEngineLogic = `
  // ==========================================
  // DATABASE BACKUP ENGINE
  // ==========================================
  const backupDir = path.join(process.cwd(), "data", "backups");
  if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
  }

  app.get("/api/admin/database/download-live", authenticateToken, requireAdmin, async (req: any, res: any) => {
      try {
          const tempBackupFile = path.join(backupDir, \`temp-live-\${Date.now()}.sqlite\`);
          await db.backup(tempBackupFile);
          res.download(tempBackupFile, \`live-database-\${new Date().toISOString().split('T')[0]}.sqlite\`, (err) => {
              if (fs.existsSync(tempBackupFile)) {
                  fs.unlinkSync(tempBackupFile);
              }
          });
      } catch (err) {
          logger.error("Failed to download live database", err);
          res.status(500).json({ error: "Failed to download live database" });
      }
  });

  app.get("/api/admin/database/list", authenticateToken, requireAdmin, (req: any, res: any) => {
      try {
          if (!fs.existsSync(backupDir)) {
              return res.json([]);
          }
          const files = fs.readdirSync(backupDir);
          const backups = files
              .filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'))
              .map(f => {
                  const stats = fs.statSync(path.join(backupDir, f));
                  return {
                      name: f,
                      size: stats.size,
                      date: stats.mtime
                  };
              })
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          res.json(backups);
      } catch (err) {
          logger.error("Failed to list database backups", err);
          res.status(500).json({ error: "Failed to list backups" });
      }
  });

  app.get("/api/admin/database/download-backup/:filename", (req: any, res: any) => {
      const token = req.query.token;
      if (!token) return res.status(401).json({ error: "Missing token" });
      try {
          const user = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
          if (user.role !== 'ADMIN') return res.status(403).json({ error: "Admins only" });
          
          const filename = req.params.filename;
          if (!filename.startsWith('backup-') || !filename.endsWith('.sqlite') || filename.includes('..') || filename.includes('/')) {
              return res.status(400).json({ error: "Invalid backup filename" });
          }
          
          const filePath = path.join(backupDir, filename);
          if (fs.existsSync(filePath)) {
              res.download(filePath);
          } else {
              res.status(404).json({ error: "Backup not found" });
          }
      } catch (err) {
          return res.status(401).json({ error: "Invalid token" });
      }
  });

  cron.schedule("0 2 * * *", async () => {
      try {
          logger.info("Running automated database backup...");
          if (!fs.existsSync(backupDir)) {
              fs.mkdirSync(backupDir, { recursive: true });
          }
          const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
          const backupFile = path.join(backupDir, \`backup-\${dateStr}.sqlite\`);
          
          await db.backup(backupFile);
          logger.info(\`Database successfully backed up to \${backupFile}\`);

          const files = fs.readdirSync(backupDir)
              .filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'))
              .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
              .sort((a, b) => b.time - a.time);
              
          if (files.length > 30) {
              const toDelete = files.slice(30);
              for (const file of toDelete) {
                  fs.unlinkSync(path.join(backupDir, file.name));
              }
              logger.info(\`Cleaned up \${toDelete.length} old backups\`);
          }
      } catch (err) {
          logger.error("Automated database backup failed", err);
      }
  });

`;

const target = `  if (process.env.NODE_ENV !== "production") {`;
if (content.includes(target)) {
    content = content.replace(target, backupEngineLogic + target);
    fs.writeFileSync('src/server.ts', content);
    console.log("Added backup engine to server.ts");
} else {
    console.log("Target not found!");
}

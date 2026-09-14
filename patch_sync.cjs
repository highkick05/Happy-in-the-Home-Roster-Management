const fs = require('fs');
const content = fs.readFileSync('src/server.ts', 'utf-8');

const syncLogic = `
  // Sync /uploads directory to SQLite files table
  try {
    const syncUploadsDir = () => {
      if (!fs.existsSync(UPLOADS_DIR)) return;
      let added = 0;
      const walkDir = (currentDir, relativePath = '/') => {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          const itemPath = path.join(currentDir, item);
          const stat = fs.statSync(itemPath);
          if (stat.isDirectory()) {
            walkDir(itemPath, path.posix.join(relativePath, item));
          } else {
            // It's a file
            const folderPath = relativePath.replace(/\\\\/g, '/');
            // Check if file is in DB
            const existing = db.prepare("SELECT id FROM files WHERE system_name = ? AND folder_path = ?").get(item, folderPath);
            if (!existing) {
              // Insert into db
              try {
                db.prepare(\`INSERT INTO files (original_name, system_name, size, folder_path, uploaded_by) VALUES (?, ?, ?, ?, ?)\`).run(
                  item, item, stat.size, folderPath, 1 // Admin user id
                );
                added++;
              } catch(e) {
                console.error("Failed to sync file to DB", e);
              }
            }
          }
        }
      };
      walkDir(UPLOADS_DIR);
      if (added > 0) {
        console.log(\`Synced \${added} missing files from /uploads to the database.\`);
      }
    };
    syncUploadsDir();
  } catch (err) {
    console.error("Failed to run uploads sync", err);
  }

  const authenticateToken = (req: any, res: any, next: any) => {`;

const newContent = content.replace('  const authenticateToken = (req: any, res: any, next: any) => {', syncLogic);

if (newContent === content) {
    console.error("Replacement failed.");
} else {
    fs.writeFileSync('src/server.ts', newContent);
    console.log("Success.");
}

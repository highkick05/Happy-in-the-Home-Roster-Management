const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database('data/dev-database.sqlite');
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

function syncUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) return;
  
  function walkDir(currentDir, relativePath = '/') {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        walkDir(itemPath, path.join(relativePath, item));
      } else {
        // It's a file
        const folderPath = relativePath.replace(/\\/g, '/');
        // Check if file is in DB
        const existing = db.prepare("SELECT id FROM files WHERE system_name = ? AND folder_path = ?").get(item, folderPath);
        if (!existing) {
          // Insert into db
          const ext = path.extname(item);
          const name = item; // Use filename as original name
          console.log(`Syncing missing file into DB: ${folderPath}/${item}`);
          try {
            db.prepare(`INSERT INTO files (original_name, system_name, size, folder_path, uploaded_by) VALUES (?, ?, ?, ?, ?)`).run(
              name, item, stat.size, folderPath, 1 // Admin user id
            );
          } catch(e) {
            console.error("Failed to insert", e);
          }
        }
      }
    }
  }
  
  walkDir(UPLOADS_DIR);
}

syncUploadsDir();
const files = db.prepare('SELECT * FROM files').all();
console.log(files);
